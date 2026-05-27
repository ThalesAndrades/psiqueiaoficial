// Structured JSON logger for Edge Functions. One line per event, parseable
// by log-aggregation tools. Pass context as a metadata object so fields stay
// queryable.
//
// Usage:
//   const log = createLogger('stripe-payment');
//   log.info('Creating payment intent', { amount, currency });
//   log.error('Webhook signature failed', { error: err });
//
// `error` values that are Error instances (Stripe.errors.*, PostgrestError,
// generic Error) are serialized to include name, message, stack, and any
// enumerable own properties (Stripe's code/decline_code/request_id,
// Postgrest's code/details/hint, etc.) — never collapsed to just .message.
//
// Sentry integration: every `log.error(...)` call is also forwarded to
// Sentry via `_shared/sentry.ts` when SENTRY_DSN_DENO is configured. The
// forwarding is fire-and-forget (no await) so it can't slow down the
// originating request, and is loaded via dynamic import so this module
// stays importable from Node.js test environments where Deno is absent.

type Level = 'debug' | 'info' | 'warn' | 'error';

// Capture this once at module load — if Deno isn't around (i.e. we're under
// Jest) skip the Sentry path entirely.
const SENTRY_AVAILABLE = (() => {
  const maybeDeno = (globalThis as unknown as { Deno?: { env?: { get?: (k: string) => string | undefined } } }).Deno;
  if (!maybeDeno?.env?.get) return false;
  return Boolean(maybeDeno.env.get('SENTRY_DSN_DENO'));
})();

async function forwardToSentry(err: unknown, context: Record<string, unknown>): Promise<void> {
  if (!SENTRY_AVAILABLE) return;
  try {
    // String specifier hidden behind a variable so the TypeScript compiler
    // (running under ts-jest, with `Deno` not in scope) doesn't try to
    // statically resolve a Deno-style ".ts" extension during test
    // compilation. At runtime under Deno this resolves to ./sentry.ts.
    const specifier = './sentry.ts';
    const mod = await import(/* @vite-ignore */ specifier) as {
      captureException: (e: unknown, ctx?: Record<string, unknown>) => Promise<void>;
    };
    await mod.captureException(err, context);
  } catch (_e) {
    // Telemetry failures must never break the originating call.
  }
}

export interface Logger {
  debug: (msg: string, meta?: Record<string, unknown>) => void;
  info: (msg: string, meta?: Record<string, unknown>) => void;
  warn: (msg: string, meta?: Record<string, unknown>) => void;
  error: (msg: string, meta?: Record<string, unknown>) => void;
  child: (extra: Record<string, unknown>) => Logger;
}

function serializeError(err: unknown): Record<string, unknown> | string {
  if (err instanceof Error) {
    const out: Record<string, unknown> = {
      name: err.name,
      message: err.message,
      stack: err.stack,
    };
    // Pick up SDK-specific fields (Stripe's code/decline_code/request_id,
    // Supabase PostgrestError's code/details/hint, etc.) without overwriting
    // the canonical name/message/stack above.
    const errAsRecord = err as unknown as Record<string, unknown>;
    for (const key of Object.keys(errAsRecord)) {
      if (key === 'name' || key === 'message' || key === 'stack') continue;
      out[key] = errAsRecord[key];
    }
    return out;
  }
  if (typeof err === 'object' && err !== null) return err as Record<string, unknown>;
  return String(err);
}

// JSON.stringify replacer that handles Error objects, BigInt, and cycles.
function makeReplacer() {
  const seen = new WeakSet<object>();
  return function replacer(_key: string, value: unknown) {
    if (value instanceof Error) return serializeError(value);
    if (typeof value === 'bigint') return value.toString();
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value as object)) return '[Circular]';
      seen.add(value as object);
    }
    return value;
  };
}

function safeStringify(payload: Record<string, unknown>): string {
  try {
    return JSON.stringify(payload, makeReplacer());
  } catch (err) {
    // Last-resort fallback so the logger never throws from inside a catch.
    return JSON.stringify({
      ts: payload.ts,
      level: payload.level,
      fn: payload.fn,
      msg: payload.msg,
      serializationError: err instanceof Error ? err.message : String(err),
    });
  }
}

function emit(fn: string, level: Level, base: Record<string, unknown>, msg: string, meta?: Record<string, unknown>) {
  const line = safeStringify({
    ts: new Date().toISOString(),
    level,
    fn,
    msg,
    ...base,
    ...(meta ?? {}),
  });
  // Deno's console writes to the function logs; using the matching method
  // preserves Supabase's per-level filtering.
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else if (level === 'debug') console.debug(line);
  else console.log(line);

  // Forward errors to Sentry when configured. Fire-and-forget: never block
  // the request on telemetry.
  if (level === 'error' && SENTRY_AVAILABLE) {
    // Prefer a real Error from meta.error if the caller passed one; this
    // gives Sentry the original stack instead of a synthetic one created
    // here. Fall back to a synthesized Error carrying the log message.
    const candidate = (meta && (meta as Record<string, unknown>).error) ?? msg;
    const err = candidate instanceof Error ? candidate : new Error(msg);
    void forwardToSentry(err, { fn, msg, ...base, ...(meta ?? {}) });
  }
}

export function createLogger(fn: string, base: Record<string, unknown> = {}): Logger {
  return {
    debug: (msg, meta) => emit(fn, 'debug', base, msg, meta),
    info: (msg, meta) => emit(fn, 'info', base, msg, meta),
    warn: (msg, meta) => emit(fn, 'warn', base, msg, meta),
    error: (msg, meta) => emit(fn, 'error', base, msg, meta),
    child: (extra) => createLogger(fn, { ...base, ...extra }),
  };
}

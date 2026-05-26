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

type Level = 'debug' | 'info' | 'warn' | 'error';

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
    for (const key of Object.keys(err)) {
      if (key === 'name' || key === 'message' || key === 'stack') continue;
      out[key] = (err as Record<string, unknown>)[key];
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

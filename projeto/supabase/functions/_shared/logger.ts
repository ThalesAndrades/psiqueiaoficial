// Structured JSON logger for Edge Functions. One line per event, parseable
// by log-aggregation tools. Avoid printf-style template strings — pass
// context as a metadata object so fields stay queryable.
//
// Usage:
//   const log = createLogger('stripe-payment');
//   log.info('Creating payment intent', { amount, currency });
//   log.error('Webhook signature failed', { error: err.message });

type Level = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug: (msg: string, meta?: Record<string, unknown>) => void;
  info: (msg: string, meta?: Record<string, unknown>) => void;
  warn: (msg: string, meta?: Record<string, unknown>) => void;
  error: (msg: string, meta?: Record<string, unknown>) => void;
  child: (extra: Record<string, unknown>) => Logger;
}

function emit(fn: string, level: Level, base: Record<string, unknown>, msg: string, meta?: Record<string, unknown>) {
  const line = JSON.stringify({
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

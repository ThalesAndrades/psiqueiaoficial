// Sentry shim for Supabase Edge Functions (Deno). The SDK is loaded lazily
// so functions that don't error stay zero-overhead. SENTRY_DSN_DENO is read
// at module-load time but the SDK is only initialised on first use.
//
// Why a separate DSN env (`SENTRY_DSN_DENO` instead of `SENTRY_DSN`):
//   - Edge Functions and the mobile app are separate Sentry projects so
//     volume + alerts can be tuned independently.
//   - Leaves room for SENTRY_DSN on the mobile side without name collisions.
//
// Usage:
//   import { captureException } from '../_shared/sentry.ts';
//   try { ... } catch (err) { captureException(err, { fn: 'foo' }); }
//
// `_shared/logger.ts` calls captureException automatically for every
// `log.error(...)` site, so most Edge Functions never need to import this
// file directly.

type SentryModule = {
  init: (opts: Record<string, unknown>) => void;
  captureException: (err: unknown, hint?: Record<string, unknown>) => string | undefined;
  setContext?: (name: string, context: Record<string, unknown>) => void;
};

// `Deno` is undefined under Jest (where logger.ts is also imported, see
// __tests__/supabase/logger.test.ts). Read env lazily and guard the global
// access so importing this module under Node.js is a no-op.
type EnvGetter = { env: { get: (key: string) => string | undefined } };
function getDenoEnv(): EnvGetter | null {
  const maybeDeno = (globalThis as unknown as { Deno?: EnvGetter }).Deno;
  if (maybeDeno && typeof maybeDeno.env?.get === 'function') return maybeDeno;
  return null;
}

const denoEnv = getDenoEnv();
const DSN = denoEnv?.env.get('SENTRY_DSN_DENO') ?? '';
const ENVIRONMENT = denoEnv?.env.get('SENTRY_ENVIRONMENT')
  ?? denoEnv?.env.get('DENO_DEPLOYMENT_ID')
  ?? 'production';

let cachedSdk: SentryModule | null = null;
let initialised = false;
let initFailed = false;

async function loadSdk(): Promise<SentryModule | null> {
  if (!DSN) return null;
  if (initFailed) return null;
  if (cachedSdk && initialised) return cachedSdk;

  try {
    // npm: specifier with Deno picks up the latest 7.x line at runtime in
    // Supabase's edge runtime. Pinning here is intentionally loose because
    // there's no Deno-side dependency manifest to lock.
    const mod = await import('npm:@sentry/deno@^7');
    const sdk = mod as unknown as SentryModule;
    if (!initialised) {
      sdk.init({
        dsn: DSN,
        environment: ENVIRONMENT,
        // Tracing is disabled by default — opt in via env later if needed.
        tracesSampleRate: 0,
        // Don't double-report errors that bubble up to the process.
        attachStacktrace: true,
      });
      initialised = true;
    }
    cachedSdk = sdk;
    return sdk;
  } catch (err) {
    initFailed = true;
    // We can't call our own logger here (cycle), so use console directly.
    // This path is hit when SENTRY_DSN_DENO is set but the SDK import fails.
    // eslint-disable-next-line no-console
    console.warn(
      JSON.stringify({
        level: 'warn',
        fn: '_shared/sentry',
        msg: 'Failed to load Sentry SDK; falling back to logs only',
        error: err instanceof Error ? err.message : String(err),
      })
    );
    return null;
  }
}

export function isSentryEnabled(): boolean {
  return DSN.length > 0;
}

export async function captureException(
  err: unknown,
  context?: Record<string, unknown>,
): Promise<void> {
  if (!DSN) return;
  const sdk = await loadSdk();
  if (!sdk) return;

  try {
    if (context && sdk.setContext) {
      sdk.setContext('logger', context);
    }
    sdk.captureException(err, context ? { extra: context } : undefined);
  } catch (_e) {
    // Swallow — failing to report must never break the caller.
  }
}

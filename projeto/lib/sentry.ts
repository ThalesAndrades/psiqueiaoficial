import * as Sentry from '@sentry/react-native';

/**
 * Initialise the Sentry SDK once at app boot.
 *
 * When `EXPO_PUBLIC_SENTRY_DSN` is unset the SDK runs in "enabled: false"
 * mode — it installs no native hooks, captures nothing, and makes no
 * network calls. This keeps dev/CI quiet and lets us merge the wiring
 * before the production DSN is provisioned.
 */
let initialised = false;

export function initSentry(): void {
  if (initialised) return;
  initialised = true;

  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

  Sentry.init({
    dsn,
    enabled: !!dsn,
    // Performance traces are sampled at 20%. The number is conservative —
    // bump it after we have a baseline of mobile traffic and confirm the
    // free-tier quota holds.
    tracesSampleRate: 0.2,
    enableAutoSessionTracking: true,
    // Avoid leaking PII (Sentry's default is already false for sendDefaultPii,
    // but be explicit so future SDK upgrades don't flip the default on us).
    sendDefaultPii: false,
  });
}

/**
 * Capture an exception with optional extra context. Safe to call before
 * init — the SDK no-ops if `enabled` was false.
 */
export function captureException(
  error: unknown,
  extra?: Record<string, unknown>,
): void {
  if (error instanceof Error) {
    Sentry.captureException(error, extra ? { extra } : undefined);
  } else {
    Sentry.captureException(new Error(String(error)), extra ? { extra } : undefined);
  }
}

export { Sentry };

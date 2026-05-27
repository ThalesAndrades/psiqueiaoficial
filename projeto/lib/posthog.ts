import { PostHog } from 'posthog-react-native';

/**
 * Lazy PostHog singleton.
 *
 * The `<PostHogProvider>` in `_layout.tsx` is the canonical entry point for
 * autocapture and React-tree events. For *service-layer* events (e.g. the
 * dual-write in `analyticsService`) we need a programmatic handle that
 * works regardless of where it's called from — that's what this module
 * provides.
 *
 * When `EXPO_PUBLIC_POSTHOG_KEY` is empty we return `null` and callers
 * must no-op. The shared `capture()` helper handles that branch so call
 * sites stay free of null checks.
 */
let instance: PostHog | null = null;
let initialised = false;

function getPostHog(): PostHog | null {
  if (initialised) return instance;
  initialised = true;

  const apiKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;
  if (!apiKey) {
    instance = null;
    return null;
  }

  const host = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';
  try {
    instance = new PostHog(apiKey, { host });
  } catch (err) {
    // Failing to construct PostHog must never crash the app — log and
    // degrade to no-op.
    console.warn('[posthog] failed to initialise:', err);
    instance = null;
  }
  return instance;
}

/**
 * Capture an event from anywhere in the app. Safe when the SDK is
 * disabled (empty API key) — silently no-ops.
 *
 * `properties` is intentionally loose (`Record<string, unknown>`) for
 * callers; PostHog's own type is the tighter `PostHogEventProperties`
 * (JSON-serializable values only). Callers are expected to pass JSON-safe
 * values — we cast at the SDK boundary instead of constraining every
 * caller.
 */
export function captureEvent(
  eventName: string,
  properties?: Record<string, unknown>,
): void {
  const ph = getPostHog();
  if (!ph) return;
  try {
    ph.capture(eventName, properties as Record<string, never>);
  } catch (err) {
    if (__DEV__) console.warn('[posthog] capture failed:', err);
  }
}

/**
 * Identify a user. Call after sign-in; pass `null` to reset on sign-out.
 */
export function identifyUser(
  userId: string | null,
  traits?: Record<string, unknown>,
): void {
  const ph = getPostHog();
  if (!ph) return;
  try {
    if (userId === null) {
      ph.reset();
    } else {
      // Cast for the same reason as captureEvent above — traits must be
      // JSON-serializable but we keep the public API loose.
      ph.identify(userId, traits as Record<string, never>);
    }
  } catch (err) {
    if (__DEV__) console.warn('[posthog] identify failed:', err);
  }
}

export { getPostHog };

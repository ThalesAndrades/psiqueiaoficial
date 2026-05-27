/**
 * analyticsService dual-write tests.
 *
 * The service must:
 *   1. Forward to PostHog (via lib/posthog `captureEvent`).
 *   2. Insert a row into Supabase `analytics_events`.
 *
 * Neither failure path may throw — analytics MUST NEVER break the user
 * flow. These tests pin the contract.
 */

const captureEventMock = jest.fn();

jest.mock('../../lib/posthog', () => ({
  captureEvent: (...args: any[]) => captureEventMock(...args),
}));

const insertMock = jest.fn((..._args: unknown[]) => Promise.resolve({ data: null, error: null }));
const fromMock = jest.fn((..._args: unknown[]) => ({ insert: insertMock }));

jest.mock('../../lib/supabase', () => ({
  supabase: { from: (...args: any[]) => fromMock(...args) },
}));

// Import AFTER mocks are wired so the module picks them up.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { analyticsService, AnalyticsEvents } = require('../../services/analyticsService');

describe('analyticsService.trackEvent', () => {
  beforeEach(() => {
    captureEventMock.mockReset();
    insertMock.mockClear();
    fromMock.mockClear();
    insertMock.mockImplementation(() => Promise.resolve({ data: null, error: null }));
  });

  it('forwards the event to PostHog with the distinct_id derived from userId', async () => {
    await analyticsService.trackEvent('foo_event', 'user-123', { extra: 'bar' });
    expect(captureEventMock).toHaveBeenCalledTimes(1);
    expect(captureEventMock).toHaveBeenCalledWith('foo_event', {
      extra: 'bar',
      distinct_id: 'user-123',
    });
  });

  it('writes a matching row to analytics_events', async () => {
    await analyticsService.trackEvent('foo_event', 'user-123', { extra: 'bar' });
    expect(fromMock).toHaveBeenCalledWith('analytics_events');
    expect(insertMock).toHaveBeenCalledTimes(1);
    const row = insertMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(row).toMatchObject({
      event_name: 'foo_event',
      user_id: 'user-123',
      properties: { extra: 'bar' },
    });
    expect(typeof row.timestamp).toBe('string');
  });

  it('does not throw when Supabase insert rejects', async () => {
    insertMock.mockImplementationOnce(() => Promise.reject(new Error('boom')));
    await expect(
      analyticsService.trackEvent('foo_event', 'user-1'),
    ).resolves.toBeUndefined();
    // PostHog still fired even though Supabase failed.
    expect(captureEventMock).toHaveBeenCalledTimes(1);
  });

  it('exposes the canonical event names via AnalyticsEvents', () => {
    expect(AnalyticsEvents.signup_completed).toBe('signup_completed');
    expect(AnalyticsEvents.payment_completed).toBe('payment_completed');
    expect(AnalyticsEvents.session_video_started).toBe('session_video_started');
  });
});

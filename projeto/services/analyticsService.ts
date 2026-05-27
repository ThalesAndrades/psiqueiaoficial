import { supabase } from '../lib/supabase';
import { captureEvent as posthogCapture } from '../lib/posthog';

/**
 * Canonical event names for product analytics. Use this object instead of
 * string literals at call sites so a typo becomes a TS error.
 *
 * Naming convention: `<noun>_<past-tense-verb>` matches PostHog conventions
 * and keeps funnels readable.
 */
export const AnalyticsEvents = {
  signup_completed: 'signup_completed',
  signin_completed: 'signin_completed',
  appointment_booked: 'appointment_booked',
  payment_initiated: 'payment_initiated',
  payment_completed: 'payment_completed',
  diary_entry_saved: 'diary_entry_saved',
  session_video_started: 'session_video_started',
  // Legacy events still emitted from older call sites — kept here so
  // existing screens keep type-checking without dropping the constant.
  appointment_created: 'appointment_created',
  appointment_completed: 'appointment_completed',
  appointment_cancelled: 'appointment_cancelled',
  payment_failed: 'payment_failed',
  ai_chat_message_sent: 'ai_chat_message_sent',
  document_shared: 'document_shared',
  screen_view: 'screen_view',
  user_action: 'user_action',
  diary_entry_created: 'diary_entry_created',
} as const;

export type AnalyticsEventName = (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];

export interface AnalyticsEvent {
  event_name: string;
  user_id?: string;
  properties?: Record<string, any>;
  timestamp?: string;
}

export const analyticsService = {
  /**
   * Track an event. Dual-writes to:
   *   1. Supabase `analytics_events` (durable, queryable from the dashboard).
   *   2. PostHog (product analytics, funnels, retention).
   *
   * Failure in either backend never throws — analytics MUST NOT break the
   * user flow. When PostHog is unconfigured (no API key) the second call
   * silently no-ops.
   */
  async trackEvent(
    eventName: string,
    userId?: string,
    properties?: Record<string, any>
  ): Promise<void> {
    // Forward to PostHog first — it's local-buffered, so even if Supabase
    // is slow we don't delay it.
    posthogCapture(eventName, {
      ...(properties ?? {}),
      ...(userId ? { distinct_id: userId } : {}),
    });

    try {
      // Store in database for basic analytics
      await supabase.from('analytics_events').insert({
        event_name: eventName,
        user_id: userId,
        properties,
        timestamp: new Date().toISOString(),
      });

      // Log to console in development
      if (__DEV__) {
        console.log('📊 Analytics Event:', { eventName, userId, properties });
      }
    } catch (error: unknown) {
      console.error('Error tracking event:', error);
    }
  },

  /**
   * Track screen view
   */
  async trackScreen(screenName: string, userId?: string): Promise<void> {
    await this.trackEvent(AnalyticsEvents.screen_view, userId, { screen_name: screenName });
  },

  /**
   * Track user action
   */
  async trackAction(action: string, userId?: string, properties?: Record<string, any>): Promise<void> {
    await this.trackEvent(AnalyticsEvents.user_action, userId, { action, ...properties });
  },

  /**
   * Track sign-up / sign-in completion
   */
  async trackSignupCompleted(userId: string, properties?: Record<string, any>): Promise<void> {
    await this.trackEvent(AnalyticsEvents.signup_completed, userId, properties);
  },

  async trackSigninCompleted(userId: string, properties?: Record<string, any>): Promise<void> {
    await this.trackEvent(AnalyticsEvents.signin_completed, userId, properties);
  },

  /**
   * Track appointment events
   */
  async trackAppointmentBooked(userId: string, appointmentId: string, properties?: Record<string, any>): Promise<void> {
    await this.trackEvent(AnalyticsEvents.appointment_booked, userId, {
      appointment_id: appointmentId,
      ...(properties ?? {}),
    });
  },

  async trackAppointmentCreated(userId: string, appointmentId: string): Promise<void> {
    await this.trackEvent(AnalyticsEvents.appointment_created, userId, { appointment_id: appointmentId });
  },

  async trackAppointmentCompleted(userId: string, appointmentId: string): Promise<void> {
    await this.trackEvent(AnalyticsEvents.appointment_completed, userId, { appointment_id: appointmentId });
  },

  async trackAppointmentCancelled(userId: string, appointmentId: string, reason?: string): Promise<void> {
    await this.trackEvent(AnalyticsEvents.appointment_cancelled, userId, {
      appointment_id: appointmentId,
      reason,
    });
  },

  /**
   * Track payment events
   */
  async trackPaymentInitiated(userId: string, amount: number): Promise<void> {
    await this.trackEvent(AnalyticsEvents.payment_initiated, userId, { amount });
  },

  async trackPaymentCompleted(userId: string, amount: number, paymentId: string): Promise<void> {
    await this.trackEvent(AnalyticsEvents.payment_completed, userId, { amount, payment_id: paymentId });
  },

  async trackPaymentFailed(userId: string, amount: number, reason?: string): Promise<void> {
    await this.trackEvent(AnalyticsEvents.payment_failed, userId, { amount, reason });
  },

  /**
   * Track session/video events
   */
  async trackSessionVideoStarted(userId: string, appointmentId: string): Promise<void> {
    await this.trackEvent(AnalyticsEvents.session_video_started, userId, { appointment_id: appointmentId });
  },

  /**
   * Track user engagement
   */
  async trackDiaryEntrySaved(userId: string, mood?: string): Promise<void> {
    await this.trackEvent(AnalyticsEvents.diary_entry_saved, userId, { mood });
  },

  async trackDiaryEntry(userId: string, mood?: string): Promise<void> {
    await this.trackEvent(AnalyticsEvents.diary_entry_created, userId, { mood });
  },

  async trackAIChatMessage(userId: string): Promise<void> {
    await this.trackEvent(AnalyticsEvents.ai_chat_message_sent, userId);
  },

  async trackDocumentShared(userId: string, documentType?: string): Promise<void> {
    await this.trackEvent(AnalyticsEvents.document_shared, userId, { document_type: documentType });
  },

  /**
   * Get analytics summary
   */
  async getEventsSummary(
    userId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<{ data: any[] | null; error: string | null }> {
    try {
      let query = supabase
        .from('analytics_events')
        .select('event_name, count(*)', { count: 'exact' });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      if (startDate) {
        query = query.gte('timestamp', startDate);
      }

      if (endDate) {
        query = query.lte('timestamp', endDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error getting analytics summary:', error);
        return { data: null, error: error.message };
      }

      return { data, error: null };
    } catch (error: any) {
      console.error('Error getting analytics summary:', error);
      return { data: null, error: error.message };
    }
  },
};

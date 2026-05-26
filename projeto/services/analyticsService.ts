import { supabase } from '../lib/supabase';

export interface AnalyticsEvent {
  event_name: string;
  user_id?: string;
  properties?: Record<string, any>;
  timestamp?: string;
}

export const analyticsService = {
  /**
   * Track an event
   */
  async trackEvent(
    eventName: string,
    userId?: string,
    properties?: Record<string, any>
  ): Promise<void> {
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
    await this.trackEvent('screen_view', userId, { screen_name: screenName });
  },

  /**
   * Track user action
   */
  async trackAction(action: string, userId?: string, properties?: Record<string, any>): Promise<void> {
    await this.trackEvent('user_action', userId, { action, ...properties });
  },

  /**
   * Track appointment events
   */
  async trackAppointmentCreated(userId: string, appointmentId: string): Promise<void> {
    await this.trackEvent('appointment_created', userId, { appointment_id: appointmentId });
  },

  async trackAppointmentCompleted(userId: string, appointmentId: string): Promise<void> {
    await this.trackEvent('appointment_completed', userId, { appointment_id: appointmentId });
  },

  async trackAppointmentCancelled(userId: string, appointmentId: string, reason?: string): Promise<void> {
    await this.trackEvent('appointment_cancelled', userId, { 
      appointment_id: appointmentId,
      reason,
    });
  },

  /**
   * Track payment events
   */
  async trackPaymentInitiated(userId: string, amount: number): Promise<void> {
    await this.trackEvent('payment_initiated', userId, { amount });
  },

  async trackPaymentCompleted(userId: string, amount: number, paymentId: string): Promise<void> {
    await this.trackEvent('payment_completed', userId, { amount, payment_id: paymentId });
  },

  async trackPaymentFailed(userId: string, amount: number, reason?: string): Promise<void> {
    await this.trackEvent('payment_failed', userId, { amount, reason });
  },

  /**
   * Track user engagement
   */
  async trackDiaryEntry(userId: string, mood?: string): Promise<void> {
    await this.trackEvent('diary_entry_created', userId, { mood });
  },

  async trackAIChatMessage(userId: string): Promise<void> {
    await this.trackEvent('ai_chat_message_sent', userId);
  },

  async trackDocumentShared(userId: string, documentType?: string): Promise<void> {
    await this.trackEvent('document_shared', userId, { document_type: documentType });
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

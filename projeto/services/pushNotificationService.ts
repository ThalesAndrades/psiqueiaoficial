import { supabase } from '../lib/supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const pushNotificationService = {
  /**
   * Register for push notifications and get token
   */
  async registerForPushNotifications(): Promise<string | null> {
    if (!Device.isDevice) {
      console.warn('Push notifications only work on physical devices');
      return null;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Failed to get push token: permission denied');
        return null;
      }

      const token = (await Notifications.getExpoPushTokenAsync()).data;

      // Configure Android notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#6B46C1',
        });
      }

      return token;
    } catch (error: any) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  },

  /**
   * Save push token to database
   */
  async savePushToken(token: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { data, error } = await supabase.functions.invoke('push-notifications', {
        body: { action: 'register-token', pushToken: token },
      });

      if (error) {
        let errorMessage = error.message;
        if (error instanceof FunctionsHttpError) {
          try {
            const statusCode = error.context?.status ?? 500;
            const textContent = await error.context?.text();
            errorMessage = `[Code: ${statusCode}] ${textContent || error.message || 'Unknown error'}`;
          } catch {
            errorMessage = `${error.message || 'Failed to save push token'}`;
          }
        }
        return { success: false, error: errorMessage };
      }

      return { success: true, error: null };
    } catch (error: any) {
      console.error('Error saving push token:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Initialize push notifications
   */
  async initialize(): Promise<void> {
    const token = await this.registerForPushNotifications();
    if (token) {
      await this.savePushToken(token);
    }
  },

  /**
   * Send push notification to a user
   */
  async sendNotification(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const { data: result, error } = await supabase.functions.invoke('push-notifications', {
        body: {
          action: 'send',
          userId,
          title,
          body,
          data,
        },
      });

      if (error) {
        let errorMessage = error.message;
        if (error instanceof FunctionsHttpError) {
          try {
            const statusCode = error.context?.status ?? 500;
            const textContent = await error.context?.text();
            errorMessage = `[Code: ${statusCode}] ${textContent || error.message || 'Unknown error'}`;
          } catch {
            errorMessage = `${error.message || 'Failed to send notification'}`;
          }
        }
        return { success: false, error: errorMessage };
      }

      return { success: true, error: null };
    } catch (error: any) {
      console.error('Error sending push notification:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Send bulk notifications
   */
  async sendBulkNotifications(
    userIds: string[],
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<{ success: boolean; sent: number; error: string | null }> {
    try {
      const { data: result, error } = await supabase.functions.invoke('push-notifications', {
        body: {
          action: 'send-bulk',
          userIds,
          title,
          body,
          data,
        },
      });

      if (error) {
        let errorMessage = error.message;
        if (error instanceof FunctionsHttpError) {
          try {
            const statusCode = error.context?.status ?? 500;
            const textContent = await error.context?.text();
            errorMessage = `[Code: ${statusCode}] ${textContent || error.message || 'Unknown error'}`;
          } catch {
            errorMessage = `${error.message || 'Failed to send bulk notifications'}`;
          }
        }
        return { success: false, sent: 0, error: errorMessage };
      }

      return { success: true, sent: result?.sent || 0, error: null };
    } catch (error: any) {
      console.error('Error sending bulk notifications:', error);
      return { success: false, sent: 0, error: error.message };
    }
  },

  /**
   * Add notification response listener
   */
  addNotificationResponseListener(callback: (response: Notifications.NotificationResponse) => void) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  },

  /**
   * Add notification received listener
   */
  addNotificationReceivedListener(callback: (notification: Notifications.Notification) => void) {
    return Notifications.addNotificationReceivedListener(callback);
  },

  /**
   * Schedule a local notification
   */
  async scheduleLocalNotification(
    title: string,
    body: string,
    trigger: Notifications.NotificationTriggerInput,
    data?: Record<string, any>
  ): Promise<string> {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger,
    });
  },

  /**
   * Cancel scheduled notification
   */
  async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  },

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },

  /**
   * Get badge count
   */
  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  },

  /**
   * Set badge count
   */
  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  },
};

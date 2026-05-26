import { supabase } from '../lib/supabase';
import { Platform, Alert } from 'react-native';

export interface Notification {
  id: string;
  user_id: string;
  type: 'appointment' | 'reminder' | 'message' | 'achievement' | 'payment';
  title: string;
  message: string;
  read: boolean;
  data?: any;
  created_at: string;
}

export const notificationService = {
  async getNotifications(userId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return { data: null, error: error.message };
    return { data: data as Notification[], error: null };
  },

  async getUnreadCount(userId: string) {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) return { count: 0, error: error.message };
    return { count: count || 0, error: null };
  },

  async markAsRead(notificationId: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) return { error: error.message };
    return { error: null };
  },

  async markAllAsRead(userId: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) return { error: error.message };
    return { error: null };
  },

  async createNotification(notification: Partial<Notification>) {
    const { data, error } = await supabase
      .from('notifications')
      .insert(notification)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as Notification, error: null };
  },

  showAlert(title: string, message: string, onConfirm?: () => void) {
    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n\n${message}`)) {
        onConfirm?.();
      }
    } else {
      Alert.alert(
        title,
        message,
        onConfirm ? [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'OK', onPress: onConfirm },
        ] : [{ text: 'OK' }]
      );
    }
  },

  showSuccess(message: string) {
    if (Platform.OS === 'web') {
      alert(message);
    } else {
      Alert.alert('Sucesso', message);
    }
  },

  showError(message: string) {
    if (Platform.OS === 'web') {
      alert(`Erro: ${message}`);
    } else {
      Alert.alert('Erro', message);
    }
  },

  showConfirmation(
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void
  ) {
    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n\n${message}`)) {
        onConfirm();
      } else {
        onCancel?.();
      }
    } else {
      Alert.alert(
        title,
        message,
        [
          { text: 'Cancelar', style: 'cancel', onPress: onCancel },
          { text: 'Confirmar', onPress: onConfirm },
        ]
      );
    }
  },

  subscribeToNotifications(userId: string, callback: (notification: Notification) => void) {
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          callback(payload.new as Notification);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};

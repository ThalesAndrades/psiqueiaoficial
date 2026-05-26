import { Platform, PermissionsAndroid, Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';

interface ActivityData {
  date: string;
  steps: number;
  distance: number;
  calories: number;
  activityType: 'walking' | 'running' | 'cycling' | 'resting' | 'unknown';
}

class ActivityService {
  private storageKey = 'activityData';

  /**
   * Check if ACTIVITY_RECOGNITION permission is granted
   */
  async checkPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }

    if (Platform.Version < 29) {
      // Android 9 and earlier don't require runtime permission
      return true;
    }

    try {
      const hasPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION
      );
      return hasPermission;
    } catch (err: unknown) {
      console.warn('Error checking activity permission:', err);
      return false;
    }
  }

  /**
   * Request ACTIVITY_RECOGNITION permission
   */
  async requestPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }

    if (Platform.Version < 29) {
      return true;
    }

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
        {
          title: 'Permissão de Reconhecimento de Atividade',
          message:
            'O PsiquèIA precisa acessar seus dados de atividade física para correlacionar com seu bem-estar emocional.',
          buttonNeutral: 'Pergunte-me Depois',
          buttonNegative: 'Cancelar',
          buttonPositive: 'OK',
        }
      );

      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err: unknown) {
      console.warn('Error requesting activity permission:', err);
      return false;
    }
  }

  /**
   * Store activity data securely
   */
  async storeActivityData(activityData: ActivityData[]): Promise<void> {
    try {
      await SecureStore.setItemAsync(
        this.storageKey,
        JSON.stringify(activityData)
      );
    } catch (error: unknown) {
      console.error('Error storing activity data:', error);
      throw error;
    }
  }

  /**
   * Retrieve stored activity data
   */
  async retrieveActivityData(): Promise<ActivityData[] | null> {
    try {
      const data = await SecureStore.getItemAsync(this.storageKey);
      return data ? JSON.parse(data) : null;
    } catch (error: unknown) {
      console.error('Error retrieving activity data:', error);
      return null;
    }
  }

  /**
   * Get activity data for a date range
   * NOTE: This is a placeholder. Integration with Google Fit or Health Connect
   * would be implemented here in production.
   */
  async getActivityData(startDate: Date, endDate: Date): Promise<ActivityData[]> {
    try {
      const hasPermission = await this.checkPermission();
      
      if (!hasPermission) {
        Alert.alert(
          'Permissão Necessária',
          'Para acessar dados de atividade, ative a permissão nas configurações.'
        );
        return [];
      }

      // Placeholder: In production, this would integrate with:
      // - Android: Google Fit API or Health Connect
      // - iOS: HealthKit
      
      // For now, return mock data
      const mockData: ActivityData[] = [
        {
          date: new Date().toISOString().split('T')[0],
          steps: 8543,
          distance: 6.2,
          calories: 345,
          activityType: 'walking',
        },
        {
          date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
          steps: 12134,
          distance: 9.8,
          calories: 512,
          activityType: 'running',
        },
      ];

      await this.storeActivityData(mockData);
      return mockData;
    } catch (error: unknown) {
      console.error('Error getting activity data:', error);
      return [];
    }
  }

  /**
   * Clear all stored activity data
   */
  async clearActivityData(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(this.storageKey);
    } catch (error: unknown) {
      console.error('Error clearing activity data:', error);
    }
  }

  /**
   * Correlate activity data with mood entries
   */
  async correlateWithMood(activityData: ActivityData[], moodEntries: any[]): Promise<any> {
    // Group by date
    const correlations = activityData.map((activity: ActivityData) => {
      const mood = moodEntries.find(
        (entry) => entry.entry_date === activity.date
      );

      return {
        date: activity.date,
        steps: activity.steps,
        activityType: activity.activityType,
        mood: mood?.mood || null,
        moodIntensity: mood?.mood_intensity || null,
        hasCorrelation: !!mood,
      };
    });

    return correlations;
  }
}

export const activityService = new ActivityService();

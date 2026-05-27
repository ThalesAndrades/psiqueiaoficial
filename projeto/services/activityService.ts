// Activity / health-data service.
//
// We read activity & vitals from the platform-native health APIs:
//   - iOS  → HealthKit (via react-native-health)
//   - Android → Health Connect (via react-native-health-connect)
//   - Web   → not supported; all methods short-circuit so callers can show
//             "Funcionalidade indisponível neste dispositivo".
//
// Only READ scopes are requested. We never write back to the user's
// health store. Permission disclosure is shown by
// `components/activity/ActivityPermissionDisclosure.tsx` BEFORE
// `requestPermission()` is called — that's a Google Play requirement for
// Health Connect and an Apple HIG nicety.

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// ---- Lazy native module loaders ----------------------------------------
// Native packages must not be imported on web (they crash Metro / RN-Web).
// We also defer requires so a missing module doesn't blow up the JS
// bundle — instead the service degrades gracefully to "unavailable".

let AppleHealthKit: any = null;
if (Platform.OS === 'ios') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    AppleHealthKit = require('react-native-health').default ?? require('react-native-health');
  } catch (err) {
    console.warn('[activityService] react-native-health not installed:', err);
  }
}

let HealthConnect: any = null;
if (Platform.OS === 'android') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    HealthConnect = require('react-native-health-connect');
  } catch (err) {
    console.warn('[activityService] react-native-health-connect not installed:', err);
  }
}

// ---- Types -------------------------------------------------------------

export interface ActivityData {
  date: string;
  steps: number;
  distance: number;
  calories: number;
  activityType: 'walking' | 'running' | 'cycling' | 'resting' | 'unknown';
}

export interface LastWeekActivity {
  steps: number;
  distance: number; // kilometers
  heartRate: number | null; // bpm average (null if unavailable)
}

// ---- iOS / HealthKit helpers -------------------------------------------

const HEALTHKIT_PERMISSIONS = {
  permissions: {
    read: ['Steps', 'DistanceWalkingRunning', 'HeartRate', 'ActiveEnergyBurned'],
    write: [],
  },
};

function initHealthKit(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!AppleHealthKit?.initHealthKit) return resolve(false);
    AppleHealthKit.initHealthKit(HEALTHKIT_PERMISSIONS, (err: string | null) => {
      if (err) {
        console.warn('[activityService] HealthKit init failed:', err);
        return resolve(false);
      }
      resolve(true);
    });
  });
}

function healthKitSum(method: string, startDate: string, endDate: string): Promise<number> {
  return new Promise((resolve) => {
    if (!AppleHealthKit?.[method]) return resolve(0);
    AppleHealthKit[method]({ startDate, endDate }, (err: string | null, results: any) => {
      if (err) return resolve(0);
      if (Array.isArray(results)) {
        const total = results.reduce((acc: number, r: any) => acc + (Number(r?.value) || 0), 0);
        return resolve(total);
      }
      resolve(Number(results?.value) || 0);
    });
  });
}

function healthKitAverage(method: string, startDate: string, endDate: string): Promise<number | null> {
  return new Promise((resolve) => {
    if (!AppleHealthKit?.[method]) return resolve(null);
    AppleHealthKit[method]({ startDate, endDate }, (err: string | null, results: any) => {
      if (err || !Array.isArray(results) || results.length === 0) return resolve(null);
      const sum = results.reduce((acc: number, r: any) => acc + (Number(r?.value) || 0), 0);
      resolve(sum / results.length);
    });
  });
}

// ---- Android / Health Connect helpers ----------------------------------

const HEALTH_CONNECT_PERMISSIONS = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'Distance' },
  { accessType: 'read', recordType: 'HeartRate' },
];

async function sumHealthConnectRecords(recordType: string, startISO: string, endISO: string, field: string): Promise<number> {
  if (!HealthConnect?.readRecords) return 0;
  try {
    const result = await HealthConnect.readRecords(recordType, {
      timeRangeFilter: { operator: 'between', startTime: startISO, endTime: endISO },
    });
    const records: any[] = Array.isArray(result) ? result : result?.records ?? [];
    return records.reduce((acc, r) => acc + (Number(r?.[field]) || 0), 0);
  } catch (err) {
    console.warn(`[activityService] readRecords(${recordType}) failed:`, err);
    return 0;
  }
}

async function averageHealthConnectHeartRate(startISO: string, endISO: string): Promise<number | null> {
  if (!HealthConnect?.readRecords) return null;
  try {
    const result = await HealthConnect.readRecords('HeartRate', {
      timeRangeFilter: { operator: 'between', startTime: startISO, endTime: endISO },
    });
    const records: any[] = Array.isArray(result) ? result : result?.records ?? [];
    const samples: number[] = [];
    for (const r of records) {
      const list = r?.samples ?? [{ beatsPerMinute: r?.beatsPerMinute }];
      for (const s of list) {
        const bpm = Number(s?.beatsPerMinute);
        if (Number.isFinite(bpm) && bpm > 0) samples.push(bpm);
      }
    }
    if (samples.length === 0) return null;
    return samples.reduce((a, b) => a + b, 0) / samples.length;
  } catch (err) {
    console.warn('[activityService] HC heart rate read failed:', err);
    return null;
  }
}

// ---- Service -----------------------------------------------------------

class ActivityService {
  private storageKey = 'activityData';

  /**
   * Whether health data is supported on this device (mobile only).
   */
  isSupported(): boolean {
    return Platform.OS === 'ios' || Platform.OS === 'android';
  }

  /**
   * Check whether the user has already granted health-data read access.
   * Note: HealthKit does not expose granular permission state for read
   * scopes (privacy-by-design), so on iOS we report `true` if init has
   * succeeded at least once during this app launch.
   */
  async hasPermission(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      if (!AppleHealthKit) return false;
      // Best-effort: try a no-op init. HealthKit returns success even if
      // the user declined individual read scopes — we treat that as
      // "permission flow complete".
      return initHealthKit();
    }
    if (Platform.OS === 'android') {
      if (!HealthConnect?.getGrantedPermissions) return false;
      try {
        const granted: any[] = await HealthConnect.getGrantedPermissions();
        return HEALTH_CONNECT_PERMISSIONS.every((perm) =>
          granted.some((g) => g.recordType === perm.recordType && g.accessType === perm.accessType),
        );
      } catch (err) {
        console.warn('[activityService] getGrantedPermissions failed:', err);
        return false;
      }
    }
    return false;
  }

  /**
   * Backwards-compatible alias used by `bem-estar-ativo.tsx`.
   */
  async checkPermission(): Promise<boolean> {
    return this.hasPermission();
  }

  /**
   * Trigger the OS-level permission prompt. Caller is expected to have
   * already shown `ActivityPermissionDisclosure` (Play Store requirement
   * for Health Connect).
   */
  async requestPermission(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      if (!AppleHealthKit) {
        console.warn('[activityService] HealthKit module unavailable');
        return false;
      }
      return initHealthKit();
    }
    if (Platform.OS === 'android') {
      if (!HealthConnect?.initialize) {
        console.warn('[activityService] Health Connect module unavailable');
        return false;
      }
      try {
        const initialized = await HealthConnect.initialize();
        if (!initialized) return false;
        const result = await HealthConnect.requestPermission(HEALTH_CONNECT_PERMISSIONS);
        const granted: any[] = Array.isArray(result) ? result : [];
        // Consider granted if at least Steps was approved — distance + HR
        // are nice-to-have.
        return granted.some((g) => g.recordType === 'Steps' && g.accessType === 'read');
      } catch (err) {
        console.warn('[activityService] requestPermission failed:', err);
        return false;
      }
    }
    return false;
  }

  /**
   * Aggregate last-7-days totals across platforms. Returns zeros when the
   * data is unavailable so callers don't have to special-case "no data
   * yet".
   */
  async getLastWeekActivity(): Promise<LastWeekActivity> {
    if (!this.isSupported()) {
      return { steps: 0, distance: 0, heartRate: null };
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);
    const startISO = startDate.toISOString();
    const endISO = endDate.toISOString();

    if (Platform.OS === 'ios') {
      const ok = await initHealthKit();
      if (!ok) return { steps: 0, distance: 0, heartRate: null };
      const [steps, distanceMeters, hr] = await Promise.all([
        healthKitSum('getDailyStepCountSamples', startISO, endISO),
        healthKitSum('getDailyDistanceWalkingRunningSamples', startISO, endISO),
        healthKitAverage('getHeartRateSamples', startISO, endISO),
      ]);
      return {
        steps: Math.round(steps),
        distance: Math.round((distanceMeters / 1000) * 100) / 100,
        heartRate: hr ? Math.round(hr) : null,
      };
    }

    // Android
    const [steps, distanceMeters, hr] = await Promise.all([
      sumHealthConnectRecords('Steps', startISO, endISO, 'count'),
      sumHealthConnectRecords('Distance', startISO, endISO, 'distance'),
      averageHealthConnectHeartRate(startISO, endISO),
    ]);
    return {
      steps: Math.round(steps),
      distance: Math.round((distanceMeters / 1000) * 100) / 100,
      heartRate: hr ? Math.round(hr) : null,
    };
  }

  /**
   * Legacy per-day breakdown used by the Bem-Estar Ativo screen. Returns
   * an array of one entry per day in the range, falling back to the
   * weekly aggregate when daily granularity isn't available from the SDK.
   */
  async getActivityData(startDate: Date, endDate: Date): Promise<ActivityData[]> {
    if (!this.isSupported()) return [];
    const granted = await this.hasPermission();
    if (!granted) return [];

    const data: ActivityData[] = [];
    const dayMs = 86_400_000;

    for (let t = startDate.getTime(); t <= endDate.getTime(); t += dayMs) {
      const dayStart = new Date(t);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(t);
      dayEnd.setHours(23, 59, 59, 999);

      const startISO = dayStart.toISOString();
      const endISO = dayEnd.toISOString();

      let steps = 0;
      let distanceMeters = 0;
      let calories = 0;

      if (Platform.OS === 'ios') {
        await initHealthKit();
        steps = await healthKitSum('getDailyStepCountSamples', startISO, endISO);
        distanceMeters = await healthKitSum('getDailyDistanceWalkingRunningSamples', startISO, endISO);
        calories = await healthKitSum('getActiveEnergyBurned', startISO, endISO);
      } else if (Platform.OS === 'android') {
        steps = await sumHealthConnectRecords('Steps', startISO, endISO, 'count');
        distanceMeters = await sumHealthConnectRecords('Distance', startISO, endISO, 'distance');
      }

      data.push({
        date: dayStart.toISOString().split('T')[0],
        steps: Math.round(steps),
        distance: Math.round((distanceMeters / 1000) * 100) / 100,
        calories: Math.round(calories),
        activityType: steps > 8000 ? 'running' : steps > 2000 ? 'walking' : 'resting',
      });
    }

    await this.storeActivityData(data);
    return data;
  }

  async storeActivityData(activityData: ActivityData[]): Promise<void> {
    if (Platform.OS === 'web') return;
    try {
      await SecureStore.setItemAsync(this.storageKey, JSON.stringify(activityData));
    } catch (error) {
      console.error('Error storing activity data:', error);
    }
  }

  async retrieveActivityData(): Promise<ActivityData[] | null> {
    if (Platform.OS === 'web') return null;
    try {
      const data = await SecureStore.getItemAsync(this.storageKey);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error retrieving activity data:', error);
      return null;
    }
  }

  async clearActivityData(): Promise<void> {
    if (Platform.OS === 'web') return;
    try {
      await SecureStore.deleteItemAsync(this.storageKey);
    } catch (error) {
      console.error('Error clearing activity data:', error);
    }
  }

  /**
   * Pair activity samples with diary mood entries by date.
   */
  async correlateWithMood(activityData: ActivityData[], moodEntries: any[]): Promise<any[]> {
    return activityData.map((activity) => {
      const mood = moodEntries.find((entry) => entry.entry_date === activity.date);
      return {
        date: activity.date,
        steps: activity.steps,
        activityType: activity.activityType,
        mood: mood?.mood ?? null,
        moodIntensity: mood?.mood_intensity ?? null,
        hasCorrelation: !!mood,
      };
    });
  }
}

export const activityService = new ActivityService();

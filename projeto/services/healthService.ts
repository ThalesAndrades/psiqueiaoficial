import { supabase } from '../lib/supabase';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'error';
  timestamp: string;
  stats?: {
    total_users: number;
    total_patients: number;
    total_psychologists: number;
    total_appointments: number;
  };
  error?: string;
}

export const healthService = {
  async checkSystemHealth(): Promise<HealthCheckResult> {
    try {
      const { data, error } = await supabase.rpc('health_check');

      if (error) {
        console.error('[HealthService] Health check failed:', error);
        return {
          status: 'error',
          timestamp: new Date().toISOString(),
          error: error.message,
        };
      }

      return {
        status: data?.status === 'healthy' ? 'healthy' : 'degraded',
        timestamp: data?.timestamp || new Date().toISOString(),
        stats: data?.stats,
      };
    } catch (err: any) {
      console.error('[HealthService] Exception during health check:', err);
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: err.message || 'Unknown error',
      };
    }
  },

  async checkDatabaseConnection(): Promise<boolean> {
    try {
      const { error } = await supabase.from('user_profiles').select('id').limit(1);
      return !error;
    } catch {
      return false;
    }
  },

  async checkAuthService(): Promise<boolean> {
    try {
      const { data } = await supabase.auth.getSession();
      return data !== null;
    } catch {
      return false;
    }
  },
};

import { supabase } from '../lib/supabase';

export interface AuditLogEntry {
  id: string;
  table_name: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  user_id?: string;
  old_data?: any;
  new_data?: any;
  created_at: string;
}

export const auditService = {
  /**
   * Get audit logs (admin only)
   * Requires admin privileges
   */
  async getAuditLogs(params?: {
    tableName?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<{ data: AuditLogEntry[] | null; error: string | null }> {
    try {
      let query = supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false });

      if (params?.tableName) {
        query = query.eq('table_name', params.tableName);
      }

      if (params?.userId) {
        query = query.eq('user_id', params.userId);
      }

      if (params?.startDate) {
        query = query.gte('created_at', params.startDate);
      }

      if (params?.endDate) {
        query = query.lte('created_at', params.endDate);
      }

      if (params?.limit) {
        query = query.limit(params.limit);
      }

      const { data, error } = await query;

      if (error) throw new Error(error.message);
      return { data: (data as AuditLogEntry[]) || [], error: null };
    } catch (err: any) {
      console.error('[AuditService] getAuditLogs failed:', err.message);
      return { data: [], error: err.message || 'Erro ao carregar logs de auditoria' };
    }
  },

  /**
   * Get audit logs for a specific table
   */
  async getTableAuditLogs(tableName: string, limit = 50): Promise<{ data: AuditLogEntry[] | null; error: string | null }> {
    return this.getAuditLogs({ tableName, limit });
  },

  /**
   * Get audit logs for a specific user
   */
  async getUserAuditLogs(userId: string, limit = 50): Promise<{ data: AuditLogEntry[] | null; error: string | null }> {
    return this.getAuditLogs({ userId, limit });
  },

  /**
   * Get recent audit logs
   */
  async getRecentLogs(limit = 100): Promise<{ data: AuditLogEntry[] | null; error: string | null }> {
    return this.getAuditLogs({ limit });
  },
};

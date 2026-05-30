import { supabase } from '../lib/supabase';
import { logger } from './loggerService';

export const REPORT_REASONS = [
  'inappropriate_behavior',
  'harassment',
  'fraud',
  'fake_profile',
  'inappropriate_content',
  'ethical_violation',
  'other',
] as const;

export type ReportReason = typeof REPORT_REASONS[number];

export const REPORT_REASON_LABEL: Record<ReportReason, string> = {
  inappropriate_behavior: 'Comportamento inadequado',
  harassment: 'Assédio',
  fraud: 'Fraude / golpe',
  fake_profile: 'Perfil falso',
  inappropriate_content: 'Conteúdo inapropriado',
  ethical_violation: 'Violação ética (CFP)',
  other: 'Outro',
};

export const REPORT_STATUSES = ['open', 'under_review', 'resolved', 'dismissed'] as const;
export type ReportStatus = typeof REPORT_STATUSES[number];

export const MODERATION_ACTION_TYPES = ['warning', 'suspension', 'ban'] as const;
export type ModerationActionType = typeof MODERATION_ACTION_TYPES[number];

export interface UserReport {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  reviewer_id: string | null;
  reviewer_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ModerationAction {
  id: string;
  target_user_id: string;
  report_id: string | null;
  action_type: ModerationActionType;
  reason: string;
  expires_at: string | null;
  applied_by: string;
  applied_at: string;
}

export interface AccountStatus {
  active: boolean;
  reason: string | null;
  until: string | null;
  action_type: ModerationActionType | null;
}

export const moderationService = {
  /**
   * Cria uma denúncia. reporter_id é derivado do JWT pela RLS — não
   * passamos no body.
   */
  async createReport(
    reportedUserId: string,
    reason: ReportReason,
    description?: string,
  ): Promise<{ data: UserReport | null; error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: null, error: 'Não autenticado' };

      const { data, error } = await supabase
        .from('user_reports')
        .insert({
          reporter_id: user.id,
          reported_user_id: reportedUserId,
          reason,
          description: description ?? null,
        })
        .select()
        .single();

      if (error) {
        logger.error('ModerationService', 'createReport failed', { error: error.message });
        return { data: null, error: error.message };
      }
      return { data: data as UserReport, error: null };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar denúncia';
      logger.error('ModerationService', 'createReport exception', { error: msg });
      return { data: null, error: msg };
    }
  },

  /**
   * Lista as denúncias que o usuário corrente fez.
   */
  async getMyReports(): Promise<{ data: UserReport[]; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('user_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) return { data: [], error: error.message };
      return { data: (data as UserReport[]) ?? [], error: null };
    } catch (err) {
      return { data: [], error: err instanceof Error ? err.message : 'Erro ao listar denúncias' };
    }
  },

  /**
   * Status da conta do usuário corrente: ativa ou bloqueada (suspension/ban).
   * Apps DEVEM checar isso no boot/login e em ações sensíveis.
   */
  async getAccountStatus(): Promise<{ data: AccountStatus | null; error: string | null }> {
    try {
      const { data, error } = await supabase.rpc('is_user_active');
      if (error) return { data: null, error: error.message };
      return { data: data as AccountStatus, error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Erro ao verificar status' };
    }
  },

  /**
   * Verifica se o usuário corrente é admin. Cached client-side; admin
   * status raramente muda.
   */
  async isAdmin(): Promise<{ data: boolean; error: string | null }> {
    try {
      const { data, error } = await supabase.rpc('is_admin');
      if (error) return { data: false, error: error.message };
      return { data: data === true, error: null };
    } catch (err) {
      return { data: false, error: err instanceof Error ? err.message : 'Erro ao verificar admin' };
    }
  },

  // --- ADMIN-ONLY ---------------------------------------------------------

  /**
   * Lista denúncias para o painel admin. Filtros opcionais por status.
   * RLS restringe a admins via policy user_reports_select_admin.
   */
  async listReports(status?: ReportStatus): Promise<{ data: UserReport[]; error: string | null }> {
    try {
      let query = supabase
        .from('user_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (status) query = query.eq('status', status);

      const { data, error } = await query;
      if (error) return { data: [], error: error.message };
      return { data: (data as UserReport[]) ?? [], error: null };
    } catch (err) {
      return { data: [], error: err instanceof Error ? err.message : 'Erro ao listar denúncias' };
    }
  },

  /**
   * Admin marca denúncia como under_review/resolved/dismissed e opcionalmente
   * aplica uma ação ao reported_user. Se action_type não for fornecido,
   * apenas atualiza o status do report.
   */
  async reviewReport(
    reportId: string,
    targetUserId: string,
    newStatus: ReportStatus,
    options?: {
      reviewerNotes?: string;
      action?: { type: ModerationActionType; reason: string; expiresAt?: string };
    },
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Não autenticado' };

      const { error: updErr } = await supabase
        .from('user_reports')
        .update({
          status: newStatus,
          reviewer_id: user.id,
          reviewer_notes: options?.reviewerNotes ?? null,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', reportId);

      if (updErr) {
        logger.error('ModerationService', 'reviewReport failed', { reportId, error: updErr.message });
        return { success: false, error: updErr.message };
      }

      if (options?.action) {
        const { error: actErr } = await supabase
          .from('moderation_actions')
          .insert({
            target_user_id: targetUserId,
            report_id: reportId,
            action_type: options.action.type,
            reason: options.action.reason,
            expires_at: options.action.expiresAt ?? null,
            applied_by: user.id,
          });
        if (actErr) {
          logger.error('ModerationService', 'reviewReport action failed', { reportId, error: actErr.message });
          return { success: false, error: actErr.message };
        }
      }

      return { success: true, error: null };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao revisar denúncia';
      return { success: false, error: msg };
    }
  },
};

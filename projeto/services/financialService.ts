import { supabase } from '../lib/supabase';

/**
 * Interface para transações financeiras
 */
export interface FinancialTransaction {
  id: string;
  psychologist_id: string;
  patient_id?: string;
  appointment_id?: string;
  transaction_type: 'session_payment' | 'subscription' | 'refund' | 'payout';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  stripe_payment_id?: string;
  stripe_payout_id?: string;
  description?: string;
  transaction_date: string;
  created_at: string;
}

/**
 * Interface para transação com dados relacionados
 */
export interface TransactionWithRelations extends FinancialTransaction {
  patient?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  appointment?: {
    scheduled_at: string;
  };
}

/**
 * Interface para estatísticas financeiras
 */
export interface FinancialStats {
  monthlyRevenue: number;
  totalRevenue: number;
  pendingRevenue: number;
}

/**
 * Calcula o total de uma lista de transações
 */
function calculateTotal(transactions: { amount: number }[] | null): number {
  if (!transactions || transactions.length === 0) return 0;
  return transactions.reduce((sum: number, t: { amount: number }) => sum + Number(t.amount || 0), 0);
}

export const financialService = {
  /**
   * Busca transações de um psicólogo com filtros opcionais de data
   */
  async getTransactions(
    psychologistId: string,
    startDate?: string,
    endDate?: string
  ): Promise<{ data: TransactionWithRelations[] | null; error: string | null }> {
    try {
      let query = supabase
        .from('financial_transactions')
        .select(`
          *,
          patient:patient_id (id, full_name, avatar_url),
          appointment:appointment_id (scheduled_at)
        `)
        .eq('psychologist_id', psychologistId)
        .order('transaction_date', { ascending: false });

      if (startDate) {
        query = query.gte('transaction_date', startDate);
      }
      if (endDate) {
        query = query.lte('transaction_date', endDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[FinancialService] getTransactions error:', error);
        return { data: null, error: error.message };
      }

      return { data: data as TransactionWithRelations[], error: null };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar transações';
      console.error('[FinancialService] getTransactions exception:', err);
      return { data: null, error: errorMessage };
    }
  },

  /**
   * Cria uma nova transação financeira
   */
  async createTransaction(
    transactionData: Partial<FinancialTransaction>
  ): Promise<{ data: FinancialTransaction | null; error: string | null }> {
    try {
      // Validação básica
      if (!transactionData.psychologist_id) {
        return { data: null, error: 'ID do psicólogo é obrigatório' };
      }
      if (!transactionData.amount || transactionData.amount <= 0) {
        return { data: null, error: 'Valor da transação deve ser positivo' };
      }
      if (!transactionData.transaction_type) {
        return { data: null, error: 'Tipo de transação é obrigatório' };
      }

      const { data, error } = await supabase
        .from('financial_transactions')
        .insert({
          ...transactionData,
          currency: transactionData.currency || 'BRL',
          status: transactionData.status || 'pending',
          transaction_date: transactionData.transaction_date || new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('[FinancialService] createTransaction error:', error);
        return { data: null, error: error.message };
      }

      return { data: data as FinancialTransaction, error: null };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar transação';
      console.error('[FinancialService] createTransaction exception:', err);
      return { data: null, error: errorMessage };
    }
  },

  /**
   * Calcula a receita mensal de um psicólogo
   */
  async getMonthlyRevenue(
    psychologistId: string,
    year: number,
    month: number
  ): Promise<{ data: number | null; error: string | null }> {
    try {
      const startDate = new Date(year, month - 1, 1).toISOString();
      const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

      const { data, error } = await supabase
        .from('financial_transactions')
        .select('amount')
        .eq('psychologist_id', psychologistId)
        .eq('status', 'completed')
        .in('transaction_type', ['session_payment', 'subscription'])
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate);

      if (error) {
        console.error('[FinancialService] getMonthlyRevenue error:', error);
        return { data: null, error: error.message };
      }

      const total = calculateTotal(data);
      return { data: total, error: null };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao calcular receita mensal';
      console.error('[FinancialService] getMonthlyRevenue exception:', err);
      return { data: null, error: errorMessage };
    }
  },

  /**
   * Busca estatísticas financeiras completas de um psicólogo
   */
  async getFinancialStats(
    psychologistId: string
  ): Promise<{ data: FinancialStats | null; error: string | null }> {
    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      // Executar todas as queries em paralelo com tratamento individual de erros
      const [monthlyResult, totalResult, pendingResult] = await Promise.allSettled([
        financialService.getMonthlyRevenue(psychologistId, currentYear, currentMonth),
        supabase
          .from('financial_transactions')
          .select('amount')
          .eq('psychologist_id', psychologistId)
          .eq('status', 'completed')
          .in('transaction_type', ['session_payment', 'subscription']),
        supabase
          .from('financial_transactions')
          .select('amount')
          .eq('psychologist_id', psychologistId)
          .eq('status', 'pending')
          .in('transaction_type', ['session_payment', 'subscription']),
      ]);

      // Extrair valores com fallback para 0 em caso de erro
      let monthlyRevenue = 0;
      let totalRevenue = 0;
      let pendingRevenue = 0;

      if (monthlyResult.status === 'fulfilled' && monthlyResult.value.data !== null) {
        monthlyRevenue = monthlyResult.value.data;
      }

      if (totalResult.status === 'fulfilled' && !totalResult.value.error) {
        totalRevenue = calculateTotal(totalResult.value.data);
      }

      if (pendingResult.status === 'fulfilled' && !pendingResult.value.error) {
        pendingRevenue = calculateTotal(pendingResult.value.data);
      }

      return {
        data: {
          monthlyRevenue,
          totalRevenue,
          pendingRevenue,
        },
        error: null,
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar estatísticas';
      console.error('[FinancialService] getFinancialStats exception:', err);
      return { data: null, error: errorMessage };
    }
  },

  /**
   * Atualiza o status de uma transação
   */
  async updateTransactionStatus(
    transactionId: string,
    status: FinancialTransaction['status']
  ): Promise<{ data: FinancialTransaction | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('financial_transactions')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', transactionId)
        .select()
        .single();

      if (error) {
        console.error('[FinancialService] updateTransactionStatus error:', error);
        return { data: null, error: error.message };
      }

      return { data: data as FinancialTransaction, error: null };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar transação';
      console.error('[FinancialService] updateTransactionStatus exception:', err);
      return { data: null, error: errorMessage };
    }
  },
};

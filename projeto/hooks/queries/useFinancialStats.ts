import { useQuery } from '@tanstack/react-query';
import { financialService } from '../../services';

export const financialStatsKeys = {
  all: ['financial-stats'] as const,
  detail: (psychologistId: string) => [...financialStatsKeys.all, psychologistId] as const,
};

export function useFinancialStats(psychologistId: string | undefined) {
  return useQuery({
    queryKey: psychologistId
      ? financialStatsKeys.detail(psychologistId)
      : financialStatsKeys.all,
    enabled: !!psychologistId,
    queryFn: async () => {
      if (!psychologistId) throw new Error('Missing psychologistId');
      const { data, error } = await financialService.getFinancialStats(psychologistId);
      if (error) throw new Error(error);
      return data;
    },
  });
}

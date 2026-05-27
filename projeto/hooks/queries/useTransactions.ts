import { useQuery } from '@tanstack/react-query';
import { financialService } from '../../services';

export const transactionsKeys = {
  all: ['transactions'] as const,
  list: (psychologistId: string, startDate?: string, endDate?: string) =>
    [...transactionsKeys.all, psychologistId, startDate ?? null, endDate ?? null] as const,
};

export function useTransactions(
  psychologistId: string | undefined,
  startDate?: string,
  endDate?: string,
) {
  return useQuery({
    queryKey: psychologistId
      ? transactionsKeys.list(psychologistId, startDate, endDate)
      : transactionsKeys.all,
    enabled: !!psychologistId,
    queryFn: async () => {
      if (!psychologistId) throw new Error('Missing psychologistId');
      const { data, error } = await financialService.getTransactions(
        psychologistId,
        startDate,
        endDate,
      );
      if (error) throw new Error(error);
      return data ?? [];
    },
  });
}

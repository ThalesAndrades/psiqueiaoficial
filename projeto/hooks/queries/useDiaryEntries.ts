import { useQuery } from '@tanstack/react-query';
import { diaryService } from '../../services';

export const diaryKeys = {
  all: ['diary'] as const,
  list: (patientId: string, startDate?: string, endDate?: string) =>
    [...diaryKeys.all, patientId, startDate ?? null, endDate ?? null] as const,
};

export function useDiaryEntries(
  patientId: string | undefined,
  startDate?: string,
  endDate?: string,
) {
  return useQuery({
    queryKey: patientId ? diaryKeys.list(patientId, startDate, endDate) : diaryKeys.all,
    enabled: !!patientId,
    queryFn: async () => {
      if (!patientId) throw new Error('Missing patientId');
      const { data, error } = await diaryService.getDiaryEntries(patientId, startDate, endDate);
      if (error) throw new Error(error);
      return data ?? [];
    },
  });
}

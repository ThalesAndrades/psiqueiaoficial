import { useQuery } from '@tanstack/react-query';
import { treatmentService } from '../../services';

export const treatmentPlanKeys = {
  all: ['treatment-plan'] as const,
  active: (patientId: string, psychologistId: string) =>
    [...treatmentPlanKeys.all, 'active', patientId, psychologistId] as const,
};

export function useActiveTreatmentPlan(
  patientId: string | undefined,
  psychologistId: string | undefined,
) {
  return useQuery({
    queryKey:
      patientId && psychologistId
        ? treatmentPlanKeys.active(patientId, psychologistId)
        : treatmentPlanKeys.all,
    enabled: !!patientId && !!psychologistId,
    queryFn: async () => {
      if (!patientId || !psychologistId) throw new Error('Missing ids');
      const { data, error } = await treatmentService.getActiveTreatmentPlan(
        patientId,
        psychologistId,
      );
      if (error) throw new Error(error);
      return data;
    },
  });
}

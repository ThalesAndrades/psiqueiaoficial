import { useQuery } from '@tanstack/react-query';
import { patientPsychologistService } from '../../services';

export const myPsychologistKeys = {
  all: ['my-psychologist'] as const,
  detail: (patientId: string) => [...myPsychologistKeys.all, patientId] as const,
};

export function useMyPsychologist(patientId: string | undefined) {
  return useQuery({
    queryKey: patientId ? myPsychologistKeys.detail(patientId) : myPsychologistKeys.all,
    enabled: !!patientId,
    queryFn: async () => {
      if (!patientId) throw new Error('Missing patientId');
      const { data, error } = await patientPsychologistService.getMyPsychologist(patientId);
      if (error) throw new Error(error);
      return data;
    },
  });
}

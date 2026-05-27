import { useQuery } from '@tanstack/react-query';
import { appointmentService } from '../../services';

/**
 * Standard query-key shape across hooks:
 *   [<entity>, ...scoping ids]
 *
 * For appointments we scope by user id + user type because the same
 * userId can in theory be both patient and psychologist in different
 * environments (admin tooling, integration tests).
 */
export const appointmentsKeys = {
  all: ['appointments'] as const,
  list: (userId: string, userType: 'patient' | 'psychologist') =>
    [...appointmentsKeys.all, userId, userType] as const,
};

export function useAppointments(
  userId: string | undefined,
  userType: 'patient' | 'psychologist' | undefined,
) {
  return useQuery({
    queryKey: userId && userType ? appointmentsKeys.list(userId, userType) : appointmentsKeys.all,
    enabled: !!userId && !!userType,
    queryFn: async () => {
      if (!userId || !userType) {
        // Guarded by `enabled`, but TS doesn't know that — keep this
        // branch so the function is total.
        throw new Error('Missing userId/userType');
      }
      const { data, error } = await appointmentService.getAppointments(userId, userType);
      if (error) throw new Error(error);
      return data ?? [];
    },
  });
}

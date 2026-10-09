/**
 * lib/hooks/useLkpdQueries.ts
 * Custom TanStack Query hooks untuk LKPD dan Progress pembelajaran.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { LkpdSubmitPayload } from '@/lib/api/types';

export function useLkpdSubmissionsQuery() {
  return useQuery({
    queryKey: ['lkpdSubmissions'],
    queryFn: () => api.lkpd.getAll(),
    staleTime: 1000 * 60 * 2,
  });
}

export function useSubmitLkpdMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: LkpdSubmitPayload) => api.lkpd.submit(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lkpdSubmissions'] });
    },
  });
}

export function useStudentProgressQuery(studentId: string) {
  return useQuery({
    queryKey: ['studentProgress', studentId],
    queryFn: () => api.progress.get(studentId),
    enabled: !!studentId,
  });
}

export function useCompleteStageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ studentId, completedStage, xpEarned }: { studentId: string; completedStage: number; xpEarned?: number }) =>
      api.progress.complete(studentId, completedStage, xpEarned),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['studentProgress', variables.studentId] });
    },
  });
}

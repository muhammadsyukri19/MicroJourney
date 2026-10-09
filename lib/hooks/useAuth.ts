/**
 * lib/hooks/useAuth.ts
 * Custom TanStack Query hooks untuk mengelola state request & mutasi autentikasi.
 * Menjamin komponen UI hanya mengonsumsi state tanpa mengurus logic fetch/API langsung.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi, type LoginCredentials, type LoginResponse } from '@/lib/api/auth.api';
import { useAuthStore, type AppUser } from '@/lib/authStore';

export const AUTH_QUERY_KEY = ['currentUser'];

/**
 * Hook mutation TanStack Query untuk request login.
 */
export function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation<LoginResponse, Error, LoginCredentials>({
    mutationFn: (credentials) => authApi.login(credentials),
    onSuccess: (data) => {
      // Invalidate & update cache user aktif
      queryClient.setQueryData(AUTH_QUERY_KEY, data.user);
    },
  });
}

/**
 * Hook query TanStack Query untuk mendapatkan data user aktif saat ini.
 */
export function useCurrentUserQuery() {
  const currentUserFromStore = useAuthStore(state => state.currentUser);

  return useQuery<AppUser | null>({
    queryKey: AUTH_QUERY_KEY,
    queryFn: () => authApi.getCurrentUser(),
    initialData: currentUserFromStore,
    staleTime: 1000 * 60 * 10,
  });
}

/**
 * Hook mutation TanStack Query untuk request logout.
 */
export function useLogoutMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
    },
  });
}

/**
 * Hook mutation TanStack Query untuk register guru.
 */
export function useRegisterTeacherMutation() {
  return useMutation({
    mutationFn: (input: { name: string; email: string; password: string; school: string; phoneNumber?: string }) => authApi.registerTeacher(input),
  });
}

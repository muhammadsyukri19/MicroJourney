/**
 * lib/api/auth.api.ts
 * Layer API terpisah untuk autentikasi pengguna.
 * Memisahkan logic API/auth dari komponen UI sesuai prinsip separation of concerns.
 */

import { useAuthStore, type AppUser } from '@/lib/authStore';
import type { LoginMode } from '@/lib/types/login.types';
import { validateRoleForMode, getRedirectPath } from '@/lib/utils/login.utils';

export interface LoginCredentials {
  email: string;
  password: string;
  mode: LoginMode;
}

export interface LoginResponse {
  success: boolean;
  user: AppUser;
  token: string;
  redirectPath: string;
}

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== 'false';

// Helper simulasi delay jaringan
function delay(ms = 400) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Panggilan API untuk proses login user.
 * Terintegrasi dengan backend atau mock state store.
 */
export async function loginApi(credentials: LoginCredentials): Promise<LoginResponse> {
  const { email, password, mode } = credentials;

  if (!email.trim() || !password) {
    throw new Error('Alamat email dan password wajib diisi.');
  }

  if (USE_MOCK) {
    await delay(500);
    const mockUser: AppUser = {
      id: 'mock-id-123',
      name: mode === 'teacher' ? 'Guru Demo' : 'Siswa Demo',
      email: email,
      role: mode,
      className: mode === 'student' ? 'VIII-A' : '',
    };
    useAuthStore.setState({ currentUser: mockUser });
    return {
      success: true,
      user: mockUser,
      token: 'mock-token',
      redirectPath: getRedirectPath(mode),
    };
  }

  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, mode }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || 'Gagal masuk. Silakan periksa kembali.');
  }

  // Simpan data user ke store lokal agar UI tetap responsif
  useAuthStore.setState({ currentUser: data.user });

  const redirectPath = getRedirectPath(data.user.role);

  return {
    success: true,
    user: data.user,
    token: 'cookie-handled',
    redirectPath,
  };
}

/**
 * Panggilan API untuk logout user.
 */
export async function logoutApi(): Promise<void> {
  await delay(200);
  useAuthStore.getState().logout();
}

/**
 * Panggilan API untuk mengambil data user aktif.
 */
export async function getCurrentUserApi(): Promise<AppUser | null> {
  await delay(100);
  return useAuthStore.getState().currentUser;
}

export async function registerTeacherApi(input: {
  name: string;
  email: string;
  password: string;
  school: string;
  phoneNumber?: string;
}) {
  if (!input.name.trim() || !input.email.trim() || !input.password || !input.school.trim()) {
    throw new Error('Nama lengkap, email, password, dan nama sekolah wajib diisi.');
  }

  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...input, role: 'teacher' }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Gagal mendaftar. Silakan coba lagi.');
  }

  return { success: true, message: 'Pendaftaran berhasil.', user: data.user };
}

export const authApi = {
  login: loginApi,
  logout: logoutApi,
  getCurrentUser: getCurrentUserApi,
  registerTeacher: registerTeacherApi,
};

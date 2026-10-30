// ─── Utilities untuk logika Login ────────────────────────────────────────────
import type { LoginMode } from '@/lib/types/login.types';
import type { UserRole } from '@/lib/authStore';

/**
 * Validasi kesesuaian role pengguna dengan mode tab yang dipilih.
 * Mengembalikan pesan error jika tidak cocok, atau null jika valid.
 */
export function validateRoleForMode(mode: LoginMode, userRole: UserRole): string | null {
  if (mode === 'superadmin' && userRole !== 'superadmin') {
    return 'Akun ini bukan Super Admin. Silakan pilih tab peran yang sesuai (Siswa atau Guru).';
  }
  if (mode === 'teacher' && userRole === 'student') {
    return 'Akun ini terdaftar sebagai Siswa, bukan Guru.';
  }
  if (mode === 'student' && (userRole === 'teacher' || userRole === 'superadmin')) {
    return 'Akun ini terdaftar sebagai Guru/Admin. Pindah ke tab Guru atau Super Admin.';
  }
  return null;
}

/**
 * Tentukan path redirect setelah login berdasarkan role.
 */
export function getRedirectPath(role: UserRole): string {
  if (role === 'student') return '/journey';
  return '/dashboard';
}

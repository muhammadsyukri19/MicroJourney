// ─── Types untuk halaman Login ───────────────────────────────────────────────

export type LoginMode = 'student' | 'teacher' | 'superadmin';

export interface LoginFormState {
  email: string;
  password: string;
  showPass: boolean;
  error: string;
  loading: boolean;
}

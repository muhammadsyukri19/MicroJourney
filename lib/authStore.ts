import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'student' | 'teacher' | 'superadmin';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  className?: string;
  createdBy?: string;
}

interface AuthState {
  users: AppUser[];
  currentUser: AppUser | null;
  login: (email: string, password: string) => Promise<{ success: boolean; user?: AppUser; error?: string }>;
  logout: () => void;
  fetchUsers: (role?: UserRole) => Promise<AppUser[]>;
  registerStudent: (input: { name: string; email: string; password: string; className: string; createdBy: string }) => Promise<{ success: boolean; user?: AppUser; error?: string }>;
  registerStudentsBatch: (students: Array<{ name: string; email: string; password: string; className: string }>, createdBy: string) => Promise<{ success: boolean; count: number; users: AppUser[]; failed?: string[] }>;
  deleteStudent: (id: string) => Promise<{ success: boolean; error?: string }>;
  registerTeacher: (input: { name: string; email: string; password: string }) => Promise<{ success: boolean; message: string; teacher?: AppUser }>;
  deleteTeacher: (id: string) => Promise<{ success: boolean; error?: string }>;
  updateTeacher: (id: string, input: { name: string; email: string; password: string }) => Promise<{ success: boolean; message: string }>;
}

const DEFAULT_USERS: AppUser[] = [
  {
    id: 'teacher-001',
    name: 'Guru IPA 1',
    email: 'guru1@gmail.com',
    password: 'guruguru',
    role: 'teacher',
  },
  {
    id: 'superadmin-001',
    name: 'Super Admin',
    email: 'superadmin@gmail.com',
    password: 'superadmin',
    role: 'superadmin',
  },
];

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function mergeDefaultUsers(users: AppUser[]) {
  const byEmail = new Map(users.map(user => [normalizeEmail(user.email), user]));
  DEFAULT_USERS.forEach(user => {
    if (!byEmail.has(normalizeEmail(user.email))) byEmail.set(normalizeEmail(user.email), user);
  });
  return Array.from(byEmail.values());
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      users: DEFAULT_USERS,
      currentUser: null,

      login: async (email, password) => {
        const normEmail = normalizeEmail(email);

        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: normEmail, password }),
          });
          const data = await res.json();

          if (res.ok && data.ok && data.user) {
            const serverUser: AppUser = {
              id: data.user.id,
              name: data.user.name,
              email: data.user.email,
              role: data.user.role,
              className: data.user.className,
              createdBy: data.user.createdBy,
            };

            const existingUsers = mergeDefaultUsers(get().users);
            const updatedUsers = existingUsers.some(u => normalizeEmail(u.email) === normEmail)
              ? existingUsers.map(u => normalizeEmail(u.email) === normEmail ? { ...u, ...serverUser } : u)
              : [...existingUsers, serverUser];

            set({ users: updatedUsers, currentUser: serverUser });
            return { success: true, user: serverUser };
          }

          // If server responded with error
          if (!res.ok || !data.ok) {
            return { success: false, error: data.error || 'Email atau password salah.' };
          }
        } catch (err) {
          console.warn('[AUTH] Offline or connection error, falling back to local credentials:', err);
        }

        // Fallback: check local storage default users
        const localUsers = mergeDefaultUsers(get().users);
        const match = localUsers.find(
          item => normalizeEmail(item.email) === normEmail && item.password === password
        );

        if (match) {
          set({ users: localUsers, currentUser: match });
          return { success: true, user: match };
        }

        return { success: false, error: 'Email atau password salah. Coba periksa kembali.' };
      },

      logout: () => set({ currentUser: null }),

      fetchUsers: async (role) => {
        try {
          const url = role ? `/api/users?role=${role}` : '/api/users';
          const res = await fetch(url);
          const data = await res.json();

          if (res.ok && data.ok && Array.isArray(data.data)) {
            const fetched: AppUser[] = data.data.map((u: any) => ({
              id: u.id,
              name: u.name,
              email: u.email,
              password: u.password,
              role: u.role,
              className: u.className,
              createdBy: u.createdBy,
            }));

            // Merge with existing
            const map = new Map(get().users.map(u => [u.id, u]));
            fetched.forEach(u => map.set(u.id, u));
            const merged = Array.from(map.values());

            set({ users: merged });
            return fetched;
          }
        } catch (err) {
          console.error('[AUTH] Failed to fetch users from server:', err);
        }

        return get().users;
      },

      registerStudent: async ({ name, email, password, className, createdBy }) => {
        const normEmail = normalizeEmail(email);

        try {
          const res = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name,
              email: normEmail,
              password,
              role: 'student',
              className,
              createdBy,
            }),
          });
          const data = await res.json();

          if (res.ok && data.ok && data.user) {
            const student: AppUser = {
              id: data.user.id,
              name: data.user.name,
              email: data.user.email,
              password: data.user.password,
              role: 'student',
              className: data.user.className,
              createdBy: data.user.createdBy,
            };

            const current = get().users.filter(u => u.id !== student.id && normalizeEmail(u.email) !== normEmail);
            set({ users: [student, ...current] });
            return { success: true, user: student };
          }

          if (!res.ok) {
            return { success: false, error: data.error || 'Gagal mendaftarkan siswa.' };
          }
        } catch (err) {
          console.error('[AUTH] Error registering student to DB:', err);
        }

        // Fallback local
        const student: AppUser = {
          id: `student-${Date.now()}`,
          name: name.trim(),
          email: normEmail,
          password,
          role: 'student',
          className: className.trim(),
          createdBy,
        };
        set({ users: [student, ...get().users] });
        return { success: true, user: student };
      },

      registerStudentsBatch: async (students, createdBy) => {
        try {
          const res = await fetch('/api/users/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ students, createdBy }),
          });
          const data = await res.json();

          if (res.ok && data.ok && Array.isArray(data.users)) {
            const newUsers: AppUser[] = data.users.map((u: any) => ({
              id: u.id,
              name: u.name,
              email: u.email,
              password: u.password,
              role: 'student',
              className: u.className,
              createdBy: u.createdBy,
            }));

            const map = new Map(get().users.map(u => [u.id, u]));
            newUsers.forEach(u => map.set(u.id, u));
            set({ users: Array.from(map.values()) });

            return {
              success: true,
              count: data.count,
              users: newUsers,
              failed: data.failed || [],
            };
          }
        } catch (err) {
          console.error('[AUTH] Batch register error:', err);
        }

        // Fallback local
        const fallbackUsers: AppUser[] = students.map(s => ({
          id: `student-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: s.name,
          email: normalizeEmail(s.email),
          password: s.password,
          role: 'student',
          className: s.className,
          createdBy,
        }));
        set({ users: [...fallbackUsers, ...get().users] });
        return { success: true, count: fallbackUsers.length, users: fallbackUsers };
      },

      deleteStudent: async (id) => {
        try {
          const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
          if (!res.ok) {
            const d = await res.json().catch(() => ({}));
            return { success: false, error: d.error };
          }
        } catch (err) {
          console.error('[AUTH] Delete student error:', err);
        }

        set(state => ({
          users: state.users.filter(u => u.id !== id),
        }));
        return { success: true };
      },

      registerTeacher: async ({ name, email, password }) => {
        const normEmail = normalizeEmail(email);

        try {
          const res = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name,
              email: normEmail,
              password,
              role: 'teacher',
            }),
          });
          const data = await res.json();

          if (res.ok && data.ok && data.user) {
            const teacher: AppUser = {
              id: data.user.id,
              name: data.user.name,
              email: data.user.email,
              password: data.user.password,
              role: 'teacher',
            };
            set({ users: [teacher, ...get().users] });
            return { success: true, message: 'Akun guru berhasil dibuat.', teacher };
          }

          return { success: false, message: data.error || 'Gagal membuat akun guru.' };
        } catch (err) {
          console.error('[AUTH] Register teacher error:', err);
          return { success: false, message: 'Gagal terhubung ke database.' };
        }
      },

      deleteTeacher: async (id) => {
        try {
          const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
          if (!res.ok) {
            const d = await res.json().catch(() => ({}));
            return { success: false, error: d.error };
          }
        } catch (err) {
          console.error('[AUTH] Delete teacher error:', err);
        }

        set(state => ({
          users: state.users.filter(u => u.id !== id),
        }));
        return { success: true };
      },

      updateTeacher: async (id, { name, email, password }) => {
        const normEmail = normalizeEmail(email);

        try {
          const res = await fetch(`/api/users/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email: normEmail, password }),
          });
          const data = await res.json();

          if (res.ok && data.ok && data.user) {
            const updatedUsers = get().users.map(u =>
              u.id === id ? { ...u, name: data.user.name, email: data.user.email, password: data.user.password } : u
            );
            set({ users: updatedUsers });
            return { success: true, message: 'Data guru berhasil diperbarui.' };
          }

          return { success: false, message: data.error || 'Gagal memperbarui data guru.' };
        } catch (err) {
          console.error('[AUTH] Update teacher error:', err);
          return { success: false, message: 'Gagal terhubung ke database.' };
        }
      },
    }),
    {
      name: 'microjourney-auth',
      partialize: state => ({ users: state.users, currentUser: state.currentUser }),
      onRehydrateStorage: () => state => {
        if (state) state.users = mergeDefaultUsers(state.users);
      },
    }
  )
);

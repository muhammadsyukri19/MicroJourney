/**
 * lib/api/client.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralized API client untuk MicroJourney AR.
 *
 * ARSITEKTUR:
 *   - Semua panggilan API melewati file ini, bukan fetch() langsung di komponen.
 *   - Flag USE_MOCK mengontrol apakah pakai mock lokal atau real backend.
 *   - Saat backend siap, cukup set USE_MOCK=false (atau lewat env var).
 *
 * CARA PAKAI:
 *   import { api } from '@/lib/api/client';
 *   const data = await api.lkpd.getAll();
 *   await api.lkpd.submit(payload);
 */

import type { LkpdSubmitPayload, LkpdSubmission } from '@/lib/api/types';
import { MOCK_LKPD, MOCK_PROGRESS } from '@/lib/api/mock';

// ── Kontrol mock vs real ──────────────────────────────────────────────────────
// Set env var NEXT_PUBLIC_USE_MOCK=false saat backend siap
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== 'false';

// ── Helper fetch ──────────────────────────────────────────────────────────────
async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json() as T;
}

// ── Simulasi delay jaringan untuk mock ───────────────────────────────────────
function delay(ms = 300) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ═════════════════════════════════════════════════════════════════════════════
// API: LKPD (Lembar Kerja Peserta Didik)
// Endpoint nyata: POST /api/lkpd  |  GET /api/lkpd
// ═════════════════════════════════════════════════════════════════════════════
const lkpd = {
  /** Ambil semua submission LKPD (untuk dashboard guru) */
  getAll: async (): Promise<LkpdSubmission[]> => {
    if (USE_MOCK) {
      await delay();
      return MOCK_LKPD;
    }
    const res = await apiFetch<{ ok: boolean; data: LkpdSubmission[] }>('/api/lkpd');
    return res.data;
  },

  /** Submit hasil LKPD siswa (dipanggil saat siswa selesai tahap 6) */
  submit: async (payload: LkpdSubmitPayload): Promise<{ ok: boolean; id: string }> => {
    if (USE_MOCK) {
      await delay(500);
      console.info('[MOCK] lkpd.submit', payload);
      return { ok: true, id: `mock-${Date.now()}` };
    }
    return apiFetch('/api/lkpd', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

// ═════════════════════════════════════════════════════════════════════════════
// API: PROGRESS (Tahap yang sudah diselesaikan siswa)
// Endpoint nyata: GET /api/progress?studentId=X  |  POST /api/progress
// ═════════════════════════════════════════════════════════════════════════════
const progress = {
  /** Ambil progress siswa berdasarkan studentId */
  get: async (studentId: string): Promise<typeof MOCK_PROGRESS> => {
    if (USE_MOCK) {
      await delay();
      return { ...MOCK_PROGRESS, studentId };
    }
    return apiFetch(`/api/progress?studentId=${studentId}`);
  },

  /** Update progress setelah siswa menyelesaikan tahap */
  complete: async (studentId: string, completedStage: number, xpEarned = 100): Promise<void> => {
    if (USE_MOCK) {
      await delay(400);
      console.info(`[MOCK] progress.complete stage=${completedStage} xp=${xpEarned}`);
      return;
    }
    await apiFetch('/api/progress', {
      method: 'POST',
      body: JSON.stringify({ studentId, completedStage, xpEarned }),
    });
  },
};

// ═════════════════════════════════════════════════════════════════════════════
// API: USERS & AUTH (Manajemen akun terhubung MongoDB)
// ═════════════════════════════════════════════════════════════════════════════
const auth = {
  login: async (email: string, password: string): Promise<{ ok: boolean; user?: any; error?: string }> => {
    if (USE_MOCK) {
      await delay(300);
      return { ok: true, user: { email, role: email.includes('guru') ? 'teacher' : 'student' } };
    }
    return apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
};

const users = {
  /** Daftarkan satu pengguna (siswa / guru) ke backend */
  register: async (payload: {
    name: string; email: string; password: string;
    role?: string; className?: string; createdBy?: string;
  }): Promise<{ ok: boolean; user: any; message?: string }> => {
    if (USE_MOCK) {
      await delay(300);
      return { ok: true, user: { id: `mock-${Date.now()}`, ...payload } };
    }
    return apiFetch('/api/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /** Daftarkan siswa massal (batch import CSV) */
  registerBatch: async (students: Array<{
    name: string; email: string; password: string; className: string;
  }>, createdBy: string): Promise<{ ok: boolean; count: number; users: any[]; failed?: string[] }> => {
    if (USE_MOCK) {
      await delay(400);
      return { ok: true, count: students.length, users: students };
    }
    return apiFetch('/api/users/batch', {
      method: 'POST',
      body: JSON.stringify({ students, createdBy }),
    });
  },

  /** Ambil daftar pengguna berdasarkan filter */
  getAll: async (filter?: { role?: string; teacher?: string; className?: string }): Promise<any[]> => {
    if (USE_MOCK) {
      await delay();
      return [];
    }
    const params = new URLSearchParams();
    if (filter?.role) params.set('role', filter.role);
    if (filter?.teacher) params.set('createdBy', filter.teacher);
    if (filter?.className) params.set('className', filter.className);

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await apiFetch<{ ok: boolean; data: any[] }>(`/api/users${query}`);
    return res.data;
  },

  /** Update pengguna */
  update: async (id: string, payload: { name?: string; email?: string; password?: string; className?: string }): Promise<{ ok: boolean; user: any }> => {
    if (USE_MOCK) {
      await delay(200);
      return { ok: true, user: payload };
    }
    return apiFetch(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  /** Hapus pengguna */
  delete: async (id: string): Promise<{ ok: boolean }> => {
    if (USE_MOCK) {
      await delay(200);
      return { ok: true };
    }
    return apiFetch(`/api/users/${id}`, {
      method: 'DELETE',
    });
  },
};

// ── Ekspor terpusat ───────────────────────────────────────────────────────────
export const api = { lkpd, progress, users, auth };


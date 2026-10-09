import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface LkpdAnswers {
  lkpd1: string;   // Tahap 2: proses pelapukan
  lkpd2: string;   // Tahap 3: kontaminasi pangan
  lkpd3q1: string; // Tahap 4: mengapa lambung gagal
  lkpd3q2: string; // Tahap 4: organ paling berbahaya
  lkpd4: string;   // Tahap 5: HOTS synthesis
  commitment: string;
  driveLink?: string;   // Link Google Drive PR siswa
  sosmedLink?: string;  // Link Video Kampanye Sosmed (TikTok/Reels/Shorts)
  actionNote?: string;  // Catatan aksi nyata siswa di lingkungan
  rating?: number;      // Rating 1-5 bintang evaluasi aplikasi
  feedback?: string;    // Kesan & pesan umpan balik siswa
}

export interface SelectedFood {
  id: string;
  name: string;
  particles: number;
}

interface JourneyState {
  studentName: string;
  studentClass: string;
  sessionId: string;
  completedStages: number[];
  selectedFoods: SelectedFood[];
  totalParticles: number;
  lkpdAnswers: LkpdAnswers;
  mostDangerousOrgan: string;
  organInteractions: string[]; // ids of organs clicked
  quizCorrect: number;
  quizWrong: number;

  setStudent: (name: string, cls: string) => void;
  completeStage: (stageId: number) => void;
  fetchProgress: (studentId: string) => Promise<void>;
  addFood: (food: SelectedFood) => void;
  setTotalParticles: (n: number) => void;
  setLkpdAnswer: (key: keyof LkpdAnswers, value: string | number) => void;
  setMostDangerousOrgan: (organ: string) => void;
  addOrganInteraction: (id: string) => void;
  incrementCorrect: () => void;
  incrementWrong: () => void;
  reset: () => void;
}

const INITIAL_LKPD: LkpdAnswers = {
  lkpd1: '', lkpd2: '', lkpd3q1: '', lkpd3q2: '', lkpd4: '', commitment: '',
  driveLink: '', sosmedLink: '', actionNote: '', rating: 5, feedback: '',
};

export const useJourneyStore = create<JourneyState>()(
  persist(
    (set, get) => ({
      studentName: '',
      studentClass: '',
      sessionId: '',
      completedStages: [],
      selectedFoods: [],
      totalParticles: 0,
      lkpdAnswers: INITIAL_LKPD,
      mostDangerousOrgan: '',
      organInteractions: [],
      quizCorrect: 0,
      quizWrong: 0,

      setStudent: (name, cls) => set({
        studentName: name,
        studentClass: cls,
        sessionId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      }),

      completeStage: (id) => {
        set(s => ({
          completedStages: s.completedStages.includes(id)
            ? s.completedStages
            : [...s.completedStages, id].sort((a, b) => a - b),
        }));

        // Background sync to MongoDB progress collection
        try {
          if (typeof window !== 'undefined') {
            const authRaw = localStorage.getItem('microjourney-auth');
            const authObj = authRaw ? JSON.parse(authRaw) : null;
            const user = authObj?.state?.currentUser;
            const studentId = user?.email || user?.id || get().sessionId || 'guest_student';

            fetch('/api/progress', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                studentId,
                completedStage: id,
                xpEarned: 100,
              }),
            }).catch(e => console.warn('[PROGRESS] MongoDB sync error:', e));
          }
        } catch {
          // ignore
        }
      },

      fetchProgress: async (studentId: string) => {
        if (!studentId) return;
        try {
          const res = await fetch(`/api/progress?studentId=${encodeURIComponent(studentId)}`);
          const data = await res.json();
          if (data && Array.isArray(data.completedStages) && data.completedStages.length > 0) {
            set(s => ({
              completedStages: Array.from(new Set([...s.completedStages, ...data.completedStages])).sort((a, b) => a - b),
            }));
          }
        } catch (e) {
          console.warn('[PROGRESS] Fetch progress error:', e);
        }
      },

      addFood: (food) => set(s => ({
        selectedFoods: s.selectedFoods.some(f => f.id === food.id)
          ? s.selectedFoods
          : [...s.selectedFoods, food],
        totalParticles: s.totalParticles + food.particles,
      })),

      setTotalParticles: (n) => set({ totalParticles: n }),

      setLkpdAnswer: (key, value) => set(s => ({
        lkpdAnswers: { ...s.lkpdAnswers, [key]: value },
      })),

      setMostDangerousOrgan: (organ) => set({ mostDangerousOrgan: organ }),

      addOrganInteraction: (id) => set(s => ({
        organInteractions: s.organInteractions.includes(id)
          ? s.organInteractions
          : [...s.organInteractions, id],
      })),

      incrementCorrect: () => set(s => ({ quizCorrect: s.quizCorrect + 1 })),
      
      incrementWrong: () => set(s => ({ quizWrong: s.quizWrong + 1 })),

      reset: () => set({
        studentName: '', studentClass: '', sessionId: '',
        completedStages: [], selectedFoods: [], totalParticles: 0,
        lkpdAnswers: INITIAL_LKPD, mostDangerousOrgan: '', organInteractions: [],
        quizCorrect: 0, quizWrong: 0,
      }),
    }),
    { name: 'microjourney-state' }
  )
);

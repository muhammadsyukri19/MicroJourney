// MOLECULE: ContextBanner
// Banner info yang menjelaskan fungsi login berdasarkan mode.
import type { LoginMode } from '@/lib/types/login.types';

interface ContextBannerProps {
  mode: LoginMode;
}

const CONTENT = {
  superadmin: {
    icon: 'admin_panel_settings',
    text: 'Akses kontrol penuh: Master data sekolah, akun guru, materi kurikulum, dan supervisi global.',
    bg: '#f5f3ff',
    border: '#ddd6fe',
    color: '#5b21b6',
    iconColor: '#7c3aed',
  },
  teacher: {
    icon: 'bar_chart',
    text: 'Akses rekap nilai, progress kelas, dan data E-LKPD siswa.',
    bg: '#e8f6ee',
    border: '#b8e3cb',
    color: '#00512a',
    iconColor: '#006e2f',
  },
  student: {
    icon: 'hiking',
    text: 'Login untuk menyimpan hasil perjalanan dan mengumpulkan E-LKPD.',
    bg: '#e8f2f8',
    border: '#b8d8eb',
    color: '#004a6b',
    iconColor: '#006591',
  },
};

export default function ContextBanner({ mode }: ContextBannerProps) {
  const c = CONTENT[mode];
  return (
    <div
      className="flex items-center gap-3 rounded-2xl px-4 py-3 mb-6"
      style={{ background: c.bg, border: `1.5px solid ${c.border}` }}
    >
      <span
        className="material-symbols-outlined text-[22px] shrink-0"
        style={{ color: c.iconColor }}
      >
        {c.icon}
      </span>
      <p className="text-[13px] font-medium" style={{ color: c.color }}>
        {c.text}
      </p>
    </div>
  );
}

// MOLECULE: ModeSwitcher
// Tab switcher Siswa / Guru untuk halaman login.
'use client';
import type { LoginMode } from '@/lib/types/login.types';

interface ModeSwitcherProps {
  mode: LoginMode;
  onChange: (mode: LoginMode) => void;
}

const MODES: { value: LoginMode; label: string; icon: string; color: string }[] = [
  { value: 'student', label: 'Siswa', icon: 'school', color: '#006591' },
  { value: 'teacher', label: 'Guru', icon: 'assignment_ind', color: '#006e2f' },
  { value: 'superadmin', label: 'Admin', icon: 'admin_panel_settings', color: '#7c3aed' },
];

export default function ModeSwitcher({ mode, onChange }: ModeSwitcherProps) {
  return (
    <div
      className="flex gap-2 p-1 rounded-2xl mb-7"
      style={{ background: '#f0f5f8' }}
      role="tablist"
      aria-label="Pilih peran"
    >
      {MODES.map((m) => (
        <button
          key={m.value}
          role="tab"
          aria-selected={mode === m.value}
          onClick={() => onChange(m.value)}
          className="flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all duration-200"
          style={{
            fontFamily: 'var(--font-outfit)',
            ...(mode === m.value
              ? {
                  background: 'white',
                  color: m.color,
                  boxShadow: '0 2px 10px rgba(0,0,0,0.10)',
                }
              : {
                  color: '#a0b4bf',
                }),
          }}
        >
          <span className="material-symbols-outlined text-[17px]">{m.icon}</span>
          {m.label}
        </button>
      ))}
    </div>
  );
}

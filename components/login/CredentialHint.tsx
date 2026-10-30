// MOLECULE: CredentialHint
// Hint kredensial demo (hanya muncul di mode Guru) atau info akun siswa.
import type { LoginMode } from '@/lib/types/login.types';

interface CredentialHintProps {
  mode: LoginMode;
}

export default function CredentialHint({ mode }: CredentialHintProps) {
  if (mode === 'superadmin') {
    return (
      <div
        className="flex items-start gap-3 rounded-2xl px-4 py-3.5"
        style={{ background: '#f5f3ff', border: '1px solid #ddd6fe' }}
      >
        <span className="material-symbols-outlined text-[#7c3aed] text-[18px] mt-0.5 shrink-0">admin_panel_settings</span>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#7c3aed] mb-1">
            Akun Demo Super Admin
          </p>
          <p className="text-[#5b21b6] text-xs">
            Email: <strong>superadmin@gmail.com</strong>
          </p>
          <p className="text-[#5b21b6] text-xs">
            Password: <strong>superadmin</strong>
          </p>
        </div>
      </div>
    );
  }

  if (mode === 'teacher') {
    return (
      <div
        className="flex items-start gap-3 rounded-2xl px-4 py-3.5"
        style={{ background: '#f2faf5', border: '1px solid #c2e8d2' }}
      >
        <span className="material-symbols-outlined text-[#006e2f] text-[18px] mt-0.5 shrink-0">key</span>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#006e2f] mb-1">
            Akun Demo Guru
          </p>
          <p className="text-[#2a6040] text-xs">
            Email: <strong>guru1@gmail.com</strong>
          </p>
          <p className="text-[#2a6040] text-xs">
            Password: <strong>guruguru</strong>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-start gap-3 rounded-2xl px-4 py-3.5"
      style={{ background: '#f0f8fd', border: '1px solid #c2dce9' }}
    >
      <span className="material-symbols-outlined text-[#006591] text-[18px] mt-0.5 shrink-0">info</span>
      <p className="text-[#1a4f6b] text-xs leading-relaxed">
        Akun siswa dibuat oleh guru melalui dashboard. Minta email dan password ke gurumu ya!
      </p>
    </div>
  );
}

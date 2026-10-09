// ORGANISM: LoginForm
// Panel kanan halaman login — form lengkap dengan mode switcher, input, dan submit.
'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/authStore';
import type { LoginMode } from '@/lib/types/login.types';
import { validateRoleForMode, getRedirectPath } from '@/lib/utils/login.utils';

import ModeSwitcher from '@/components/login/ModeSwitcher';
import ContextBanner from '@/components/login/ContextBanner';
import CredentialHint from '@/components/login/CredentialHint';
import InputField from '@/components/ui/InputField';

export default function LoginForm() {
  const router = useRouter();
  const { login } = useAuthStore();

  const [mode, setMode] = useState<LoginMode>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isTeacher = mode === 'teacher';
  const accentColor = isTeacher ? '#006e2f' : '#006591';

  function handleSwitchMode(m: LoginMode) {
    setMode(m);
    setEmail('');
    setPassword('');
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login(email, password);
      setLoading(false);

      if (!res.success || !res.user) {
        setError(res.error || 'Email atau password salah. Coba periksa kembali.');
        return;
      }

      const roleError = validateRoleForMode(mode, res.user.role);
      if (roleError) {
        setError(roleError);
        return;
      }

      router.push(getRedirectPath(res.user.role));
    } catch {
      setLoading(false);
      setError('Terjadi kendala koneksi ke server database. Silakan coba lagi.');
    }
  }

  return (
    <div className="flex-1 lg:max-w-[480px] flex flex-col justify-center bg-white relative px-8 py-12 lg:px-12">

      {/* Mobile: logo mini */}
      <div className="flex lg:hidden items-center gap-3 mb-8">
        <Image src="/logo/no-bg.webp" alt="Logo" width={48} height={48} className="object-contain" />
        <div>
          <span
            className="font-extrabold text-lg leading-none block"
            style={{ fontFamily: 'var(--font-outfit)', color: '#083b54' }}
          >
            MicroJourney <span style={{ color: '#006591' }}>AR</span>
          </span>
          <p className="text-[#7aa8b8] text-xs">IPA Kelas VIII</p>
        </div>
      </div>

      {/* Desktop: back link */}
      <Link
        href="/"
        className="hidden lg:flex items-center gap-1.5 text-sm text-[#7aa8b8] hover:text-[#006591] transition-colors mb-8 w-fit font-medium"
      >
        <span className="material-symbols-outlined text-[16px]">arrow_back</span>
        Kembali ke Beranda
      </Link>

      {/* Heading */}
      <div className="mb-7">
        <h2
          className="font-extrabold text-2xl text-[#083b54] mb-1"
          style={{ fontFamily: 'var(--font-outfit)' }}
        >
          Masuk ke Akun
        </h2>
        <p className="text-[#7aa8b8] text-sm">Pilih peranmu untuk melanjutkan.</p>
      </div>

      {/* Tab switcher */}
      <ModeSwitcher mode={mode} onChange={handleSwitchMode} />

      {/* Context info banner */}
      <ContextBanner mode={mode} />

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <InputField
          label="Alamat Email"
          icon="alternate_email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder={isTeacher ? 'guru@sekolah.com' : 'siswa@email.com'}
          accentColor={accentColor}
        />

        <InputField
          label="Password"
          icon="lock"
          isPassword
          required
          autoComplete="current-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Masukkan password"
          accentColor={accentColor}
        />

        {/* Error message */}
        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
            <span className="material-symbols-outlined text-red-400 text-[15px] mt-0.5">error</span>
            <p className="text-red-500 text-xs font-medium leading-relaxed">{error}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60 mt-2"
          style={{
            fontFamily: 'var(--font-outfit)',
            background: isTeacher
              ? 'linear-gradient(to bottom, #00a847, #006e2f)'
              : 'linear-gradient(to bottom, #0095d4, #006591)',
            color: 'white',
            border: isTeacher ? '2px solid #004f20' : '2px solid #004a6b',
            boxShadow: isTeacher
              ? '0 4px 16px rgba(0,110,47,0.30), inset 0 1px 0 rgba(255,255,255,0.2)'
              : '0 4px 16px rgba(0,101,145,0.30), inset 0 1px 0 rgba(255,255,255,0.2)',
          }}
        >
          {loading ? (
            <>
              <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
              Memverifikasi...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[18px]">
                {isTeacher ? 'dashboard' : 'explore'}
              </span>
              {isTeacher ? 'Masuk ke Dashboard' : 'Mulai Petualangan'}
            </>
          )}
        </button>
      </form>

      {/* Credential / info hint */}
      <div className="mt-5">
        <CredentialHint mode={mode} />
      </div>

      {/* Mobile: back link */}
      <Link
        href="/"
        className="flex lg:hidden items-center gap-1.5 mt-8 text-sm text-[#a0b4bf] hover:text-[#006591] transition-colors w-fit"
      >
        <span className="material-symbols-outlined text-[16px]">arrow_back</span>
        Kembali ke Beranda
      </Link>
    </div>
  );
}

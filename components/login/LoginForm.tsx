// ORGANISM: LoginForm
// Panel kanan halaman login — form lengkap dengan TanStack Query, mode switcher, input, dan submit.
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { LoginMode } from '@/lib/types/login.types';
import type { LoginResponse } from '@/lib/api/auth.api';
import { getRedirectPath } from '@/lib/utils/login.utils';
import { useLoginMutation, useCurrentUserQuery, useRegisterTeacherMutation } from '@/lib/hooks/useAuth';

import ModeSwitcher from '@/components/login/ModeSwitcher';
import ContextBanner from '@/components/login/ContextBanner';
import InputField from '@/components/ui/InputField';

export default function LoginForm() {
  const router = useRouter();

  // TanStack Query Hooks for authentication
  const { data: currentUser } = useCurrentUserQuery();
  const loginMutation = useLoginMutation();
  const registerMutation = useRegisterTeacherMutation();

  const [mode, setMode] = useState<LoginMode>('student');
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Form fields
  const [name, setName] = useState('');
  const [school, setSchool] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const isTeacher = mode === 'teacher';
  const accentColor = isTeacher ? '#006e2f' : '#006591';

  // Proteksi Halaman Login: Jika user sudah login, alihkan otomatis ke dashboard/journey
  useEffect(() => {
    if (currentUser) {
      router.replace(getRedirectPath(currentUser.role));
    }
  }, [currentUser, router]);

  function handleSwitchMode(m: LoginMode) {
    setMode(m);
    setIsRegistering(false);
    setName('');
    setSchool('');
    setPhoneNumber('');
    setEmail('');
    setPassword('');
    loginMutation.reset();
    registerMutation.reset();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (isRegistering && isTeacher) {
      registerMutation.mutate(
        { name, email, password, school, phoneNumber },
        {
          onSuccess: () => {
            // Setelah berhasil mendaftar, arahkan ke dashboard
            router.push(getRedirectPath('teacher'));
          },
        }
      );
    } else {
      loginMutation.mutate(
        { email, password, mode },
        {
          onSuccess: (data) => {
            router.push(data.redirectPath);
          },
        }
      );
    }
  }

  return (
    <div className="flex-1 lg:max-w-[580px] w-full flex flex-col justify-center bg-white relative px-7 py-8 lg:px-12 border-l border-[#e4eff4] shadow-2xl overflow-y-auto">
      
      {/* Desktop: Back Link */}
      <div className="hidden lg:flex items-center justify-between mb-6 pb-3 border-b border-[#edf4f8]">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs text-[#7aa8b8] hover:text-[#006591] transition-colors font-semibold"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Kembali ke Beranda
        </Link>
      </div>

      {/* Mobile: Header Logo */}
      <div className="flex lg:hidden items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Image src="/logo/no-bg.webp" alt="Logo" width={42} height={42} style={{ width: 'auto', height: 'auto' }} className="object-contain" />
          <div>
            <span
              className="font-extrabold text-base leading-none block"
              style={{ fontFamily: 'var(--font-outfit)', color: '#083b54' }}
            >
              MicroJourney <span style={{ color: '#006591' }}>AR</span>
            </span>
            <p className="text-[#7aa8b8] text-[11px]">IPA Kelas VIII</p>
          </div>
        </div>
        <Link
          href="/"
          className="flex items-center gap-1 text-xs text-[#7aa8b8] hover:text-[#006591] transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Beranda
        </Link>
      </div>

      {/* Heading */}
      <div className="mb-6">
        <h2
          className="font-extrabold text-2xl lg:text-3xl text-[#083b54] mb-1.5"
          style={{ fontFamily: 'var(--font-outfit)' }}
        >
          {isRegistering ? 'Pendaftaran Guru Edukator' : 'Masuk Portal MicroJourney'}
        </h2>
        <p className="text-[#648796] text-sm leading-relaxed">
          {isRegistering
            ? 'Daftarkan instansi sekolah Anda untuk mengelola pembelajaran AR & E-LKPD siswa.'
            : 'Pilih peran pengguna di bawah untuk melanjutkan ke aplikasi.'}
        </p>
      </div>

      {/* Tab switcher */}
      <ModeSwitcher mode={mode} onChange={handleSwitchMode} />

      {/* Context info banner */}
      <ContextBanner mode={mode} />

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {isRegistering && isTeacher ? (
          <>
            {/* Grid Layout for Teacher Registration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <InputField
                label="Nama Lengkap & Gelar *"
                icon="badge"
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={e => {
                  setName(e.target.value);
                  if (registerMutation.isError) registerMutation.reset();
                }}
                placeholder="misal: Prof. Dr. Budi, M.Pd."
                accentColor={accentColor}
              />

              <InputField
                label="Asal Sekolah / Instansi *"
                icon="school"
                type="text"
                required
                value={school}
                onChange={e => {
                  setSchool(e.target.value);
                  if (registerMutation.isError) registerMutation.reset();
                }}
                placeholder="misal: SMP Negeri 1 Banda Aceh"
                accentColor={accentColor}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <InputField
                label="Nomor WhatsApp / HP"
                icon="call"
                type="tel"
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                placeholder="misal: 081234567890"
                accentColor={accentColor}
              />

              <InputField
                label="Alamat Email *"
                icon="alternate_email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  if (loginMutation.isError) loginMutation.reset();
                  if (registerMutation.isError) registerMutation.reset();
                }}
                placeholder="guru@sekolah.sch.id"
                accentColor={accentColor}
              />
            </div>

            <InputField
              label="Kata Sandi *"
              icon="lock"
              isPassword
              required
              autoComplete="new-password"
              value={password}
              onChange={e => {
                setPassword(e.target.value);
                if (loginMutation.isError) loginMutation.reset();
                if (registerMutation.isError) registerMutation.reset();
              }}
              placeholder="Minimal 6 karakter"
              accentColor={accentColor}
            />
          </>
        ) : (
          <>
            {/* Standard Login Inputs */}
            <InputField
              label="Alamat Email *"
              icon="alternate_email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={e => {
                setEmail(e.target.value);
                if (loginMutation.isError) loginMutation.reset();
              }}
              placeholder={isTeacher ? 'guru@sekolah.com' : 'siswa@email.com'}
              accentColor={accentColor}
            />

            <InputField
              label="Kata Sandi *"
              icon="lock"
              isPassword
              required
              autoComplete="current-password"
              value={password}
              onChange={e => {
                setPassword(e.target.value);
                if (loginMutation.isError) loginMutation.reset();
              }}
              placeholder="Masukkan password akun"
              accentColor={accentColor}
            />
          </>
        )}

        {/* State: Error Feedback */}
        {(loginMutation.isError || registerMutation.isError) && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5 animate-shake">
            <span className="material-symbols-outlined text-red-500 text-[18px] mt-0.5">error</span>
            <p className="text-red-600 text-xs font-medium leading-relaxed">
              {loginMutation.error?.message || registerMutation.error?.message || 'Terjadi kesalahan. Silakan coba lagi.'}
            </p>
          </div>
        )}

        {/* State: Success Feedback */}
        {(loginMutation.isSuccess || registerMutation.isSuccess) && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2.5">
            <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
            <p className="text-emerald-700 text-xs font-semibold">
              {registerMutation.isSuccess && !loginMutation.isSuccess 
                ? 'Pendaftaran berhasil! Sedang menyiapkan sesi...' 
                : 'Otentikasi Berhasil! Membuka portal...'}
            </p>
          </div>
        )}

        {/* Submit Button with High-Impact Aesthetics */}
        <button
          type="submit"
          disabled={loginMutation.isPending || loginMutation.isSuccess || registerMutation.isPending || registerMutation.isSuccess}
          className="w-full py-4 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] disabled:opacity-60 mt-3 shadow-lg hover:shadow-xl"
          style={{
            fontFamily: 'var(--font-outfit)',
            background: isTeacher
              ? 'linear-gradient(135deg, #009940 0%, #006e2f 100%)'
              : 'linear-gradient(135deg, #0088cc 0%, #006591 100%)',
            color: 'white',
            border: isTeacher ? '2px solid #004f20' : '2px solid #004a6b',
            boxShadow: isTeacher
              ? '0 6px 20px rgba(0,110,47,0.30), inset 0 1px 0 rgba(255,255,255,0.25)'
              : '0 6px 20px rgba(0,101,145,0.30), inset 0 1px 0 rgba(255,255,255,0.25)',
          }}
        >
          {loginMutation.isPending || registerMutation.isPending ? (
            <>
              <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
              Memproses Data...
            </>
          ) : loginMutation.isSuccess ? (
            <>
              <span className="material-symbols-outlined text-[20px]">check</span>
              Berhasil Masuk
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[20px]">
                {isRegistering ? 'how_to_reg' : isTeacher ? 'dashboard' : 'explore'}
              </span>
              {isRegistering ? 'Selesaikan Pendaftaran Guru' : isTeacher ? 'Masuk ke Dashboard Guru' : 'Mulai Petualangan Sains'}
            </>
          )}
        </button>
      </form>

      {/* Toggle Login/Register for Teacher */}
      {isTeacher && (
        <div className="mt-5 p-3 rounded-xl bg-[#f7fafc] border border-[#e2edf3] text-center">
          <p className="text-xs text-[#527788] font-medium">
            {isRegistering ? 'Sudah memiliki akun guru terdaftar?' : 'Belum memiliki akun guru untuk sekolah Anda?'}
            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                loginMutation.reset();
                registerMutation.reset();
              }}
              className="ml-1.5 font-bold text-[#006e2f] hover:underline inline-flex items-center gap-0.5"
            >
              {isRegistering ? 'Masuk di sini' : 'Daftar Guru Baru'}
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </button>
          </p>
        </div>
      )}

      {/* Footer Info */}
      <div className="mt-6 pt-4 border-t border-[#edf4f8] text-center">
        <p className="text-[11px] text-[#91a8b5]">
          MicroJourney AR • Media Pembelajaran Sains SMP Terintegrasi AR & LKPD Digital
        </p>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/authStore';
import { useJourneyStore } from '@/lib/journeyStore';
import { useLogoutMutation } from '@/lib/hooks/useAuth';

interface UserProfileWidgetProps {
  sizeClass?: string;
  showRoleBadgeInline?: boolean;
}

export default function UserProfileWidget({
  sizeClass = 'w-10 h-10',
  showRoleBadgeInline = false,
}: UserProfileWidgetProps) {
  const router = useRouter();
  const { currentUser } = useAuthStore();
  const logoutMutation = useLogoutMutation();
  const [open, setOpen] = useState(false);

  function handleLogout() {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        setOpen(false);
        useJourneyStore.getState().reset();
        router.push('/');
      },
    });
  }

  const role = currentUser?.role; // 'superadmin' | 'teacher' | 'student' | undefined

  // Role visual configuration
  const roleConfig = {
    superadmin: {
      label: 'Super Admin',
      badge: '👑 Admin',
      color: '#7c3aed',
      bgLight: '#f5f3ff',
      borderLight: '#ddd6fe',
      textColor: '#5b21b6',
      icon: 'admin_panel_settings',
      avatarBg: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
      avatarBorder: '#c4b5fd',
      subtext: 'Pusat Kendali Sistem & Sekolah',
    },
    teacher: {
      label: 'Guru Edukator',
      badge: '👨‍🏫 Guru',
      color: '#006e2f',
      bgLight: '#e8f6ee',
      borderLight: '#b8e3cb',
      textColor: '#00512a',
      icon: 'assignment_ind',
      avatarBg: 'linear-gradient(135deg, #009940 0%, #006e2f 100%)',
      avatarBorder: '#86efac',
      subtext: currentUser?.school || 'Pengampu IPA Kelas VIII',
    },
    student: {
      label: 'Siswa Petualang',
      badge: '🎒 Siswa',
      color: '#006591',
      bgLight: '#e8f2f8',
      borderLight: '#b8d8eb',
      textColor: '#004a6b',
      icon: 'school',
      avatarBg: 'linear-gradient(135deg, #0088cc 0%, #006591 100%)',
      avatarBorder: '#93c5fd',
      subtext: currentUser?.className ? `Kelas ${currentUser.className}` : 'Peserta Didik',
    },
  };

  const currentCfg = role ? roleConfig[role] : null;

  const initials = currentUser?.name
    ? currentUser.name
        .split(' ')
        .filter(Boolean)
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : null;

  return (
    <div className="relative pointer-events-auto inline-flex items-center gap-2">
      {/* Optional Inline Role Pill on Desktop */}
      {showRoleBadgeInline && currentCfg && (
        <span
          className="hidden lg:inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-full border shadow-2xs select-none"
          style={{
            background: currentCfg.bgLight,
            borderColor: currentCfg.borderLight,
            color: currentCfg.textColor,
          }}
        >
          <span>{currentCfg.badge}</span>
        </span>
      )}

      {/* Avatar Button */}
      <div className="relative">
        <button
          onClick={() => setOpen((prev) => !prev)}
          className={`${sizeClass} rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 select-none shadow-md cursor-pointer relative focus:outline-none`}
          style={{
            background: currentCfg ? currentCfg.avatarBg : '#ffffff',
            border: currentCfg ? `2.5px solid ${currentCfg.avatarBorder}` : '2px solid rgba(0, 101, 145, 0.6)',
            color: currentCfg ? '#ffffff' : '#006591',
            boxShadow: currentCfg
              ? `0 3px 10px ${currentCfg.color}40, inset 0 1px 1px rgba(255,255,255,0.4)`
              : '0 2px 8px rgba(0,0,0,0.1)',
          }}
          aria-label="Menu Profil & Peran Pengguna"
          title={currentUser ? `${currentUser.name} (${currentCfg?.label})` : 'Klik untuk masuk'}
        >
          {initials ? (
            <span className="font-extrabold text-xs tracking-wider leading-none">{initials}</span>
          ) : (
            <span className="material-symbols-outlined text-[20px]">person</span>
          )}

          {/* Mini Role Indicator Badge on corner */}
          {role && (
            <span
              className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] shadow-sm border border-white"
              style={{
                background: currentCfg?.color,
                color: '#ffffff',
              }}
            >
              {role === 'superadmin' ? '👑' : role === 'teacher' ? '✓' : '★'}
            </span>
          )}
        </button>
      </div>

      {/* Dropdown Menu Modal/Popover */}
      {open && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-full mt-2 w-72 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 py-2.5 z-[70] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            style={{
              boxShadow: '0 12px 35px -5px rgba(8, 59, 84, 0.2), 0 4px 12px rgba(0,0,0,0.06)',
            }}
          >
            {currentUser && currentCfg ? (
              <>
                {/* Header Profile Info */}
                <div
                  className="px-4 py-3.5 border-b"
                  style={{
                    background: `linear-gradient(180deg, ${currentCfg.bgLight} 0%, #ffffff 100%)`,
                    borderColor: '#f1f5f9',
                  }}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span
                      className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border uppercase tracking-wider"
                      style={{
                        background: currentCfg.bgLight,
                        borderColor: currentCfg.borderLight,
                        color: currentCfg.textColor,
                      }}
                    >
                      <span className="material-symbols-outlined text-[13px]">{currentCfg.icon}</span>
                      <span>{currentCfg.label}</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">ID: {currentUser.id.slice(-6)}</span>
                  </div>

                  <p className="text-sm font-extrabold text-[#083b54] truncate font-[family-name:var(--font-outfit)]">
                    {currentUser.name}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
                  <p className="text-[11px] font-semibold text-slate-600 mt-1 truncate">
                    {currentCfg.subtext}
                  </p>
                </div>

                {/* Role Specific Navigation Actions */}
                <div className="py-1 text-xs font-semibold text-slate-700">
                  {role === 'superadmin' && (
                    <Link
                      href="/dashboard"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-purple-50 text-purple-900 font-bold transition-colors"
                    >
                      <span className="material-symbols-outlined text-[19px] text-purple-700">dashboard</span>
                      <span>Dashboard Admin</span>
                    </Link>
                  )}

                  {role === 'teacher' && (
                    <Link
                      href="/dashboard"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-emerald-50 text-emerald-900 font-bold transition-colors"
                    >
                      <span className="material-symbols-outlined text-[19px] text-[#006e2f]">dashboard</span>
                      <span>Dashboard Guru</span>
                    </Link>
                  )}

                  {role === 'student' && (
                    <Link
                      href="/journey"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-blue-50 text-[#004a6b] font-bold transition-colors"
                    >
                      <span className="material-symbols-outlined text-[19px] text-[#006591]">explore</span>
                      <span>Lanjutkan Perjalanan Sains</span>
                    </Link>
                  )}
                </div>

                {/* Logout Action */}
                <div className="pt-1 mt-1 border-t border-slate-100">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    <span>Keluar Sesi Akun</span>
                  </button>
                </div>
              </>
            ) : (
              /* Tamu / Belum Login */
              <div className="p-4 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-2.5">
                  <span className="material-symbols-outlined text-2xl">person_off</span>
                </div>
                <h4 className="font-extrabold text-sm text-[#083b54]">Belum Masuk Akun</h4>
                <p className="text-xs text-slate-500 mt-1 mb-3.5 leading-relaxed">
                  Masuk sebagai Siswa, Guru, atau Admin untuk menyimpan progres pembelajaran & E-LKPD.
                </p>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="w-full py-2.5 bg-[#006591] hover:bg-[#004c6e] text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined text-[17px]">login</span>
                  <span>Masuk ke Akun</span>
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

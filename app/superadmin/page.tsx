'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/authStore';
import SchoolManagement from '@/components/organisms/admin/SchoolManagement';
import TeacherAccountManagement from '@/components/organisms/admin/TeacherAccountManagement';
import MaterialManagement from '@/components/organisms/admin/MaterialManagement';
import UserProfileWidget from '@/components/auth/UserProfileWidget';

export default function SuperadminPage() {
  const router = useRouter();
  const { currentUser, logout, fetchUsers } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'sekolah' | 'guru' | 'materi'>('sekolah');

  // Guard: only superadmin
  useEffect(() => {
    if (currentUser === null) {
      router.push('/login');
      return;
    }
    if (currentUser.role !== 'superadmin') {
      router.push('/dashboard');
      return;
    }
    fetchUsers('teacher');
  }, [currentUser, router, fetchUsers]);

  if (!currentUser || currentUser.role !== 'superadmin') return null;

  return (
    <div className="min-h-screen bg-[#f4f7fa] flex flex-col font-[family-name:var(--font-inter)] selection:bg-[#7c3aed]/20">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs h-16 flex items-center justify-between px-4 lg:px-8">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#006591] bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-colors"
          >
            <span className="material-symbols-outlined text-[17px]">arrow_back</span>
            <span>Dashboard Penilaian</span>
          </Link>

          <div className="h-5 w-px bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-700 text-white flex items-center justify-center font-extrabold text-sm shadow-sm">
              <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
            </div>
            <div>
              <h1 className="font-[family-name:var(--font-outfit)] font-extrabold text-base leading-none text-[#083b54]">
                Portal Super Admin <span className="text-purple-700 text-xs font-bold">MicroJourney</span>
              </h1>
              <p className="text-[10px] text-slate-400">Master Control Center</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <UserProfileWidget sizeClass="w-9 h-9" />
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto px-4 lg:px-8 py-8 flex-1 flex flex-col space-y-6">
        {/* Navigation Tabs Bar */}
        <div className="bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('sekolah')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 cursor-pointer ${
              activeTab === 'sekolah'
                ? 'bg-purple-700 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">domain</span>
            <span>Kelola Sekolah ({'>'} SMP / MTs)</span>
          </button>

          <button
            onClick={() => setActiveTab('guru')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 cursor-pointer ${
              activeTab === 'guru'
                ? 'bg-purple-700 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">manage_accounts</span>
            <span>Kelola Akun Guru Edukator</span>
          </button>

          <button
            onClick={() => setActiveTab('materi')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 cursor-pointer ${
              activeTab === 'materi'
                ? 'bg-purple-700 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">menu_book</span>
            <span>Kelola Materi & Silabus IPA</span>
          </button>

          <div className="ml-auto pl-2">
            <Link
              href="/dashboard"
              className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-[#006591] hover:underline px-3 py-1.5"
            >
              <span>Buka Rangkuman & Rekap Nilai</span>
              <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
            </Link>
          </div>
        </div>

        {/* Tab Contents */}
        <div className="flex-1">
          {activeTab === 'sekolah' && <SchoolManagement />}
          {activeTab === 'guru' && <TeacherAccountManagement />}
          {activeTab === 'materi' && <MaterialManagement />}
        </div>
      </main>
    </div>
  );
}

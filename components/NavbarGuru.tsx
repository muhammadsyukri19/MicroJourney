'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import UserProfileWidget from '@/components/auth/UserProfileWidget';

export default function NavbarGuru() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm border-b-4 border-[var(--color-primary)]">
      <nav className="flex justify-between items-center w-full px-6 max-w-7xl mx-auto h-20">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[var(--color-primary)] text-3xl">school</span>
          <span className="font-[family-name:var(--font-plus-jakarta)] font-bold text-[var(--color-primary)] tracking-tight">Rapor Guru - MicroJourney AR</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <Link href="/" className="text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] transition-colors font-semibold text-sm">Kembali ke Beranda App</Link>
          <Link href="/rapor-guru" className={`transition-colors font-semibold text-sm pb-2 ${pathname === '/rapor-guru' ? 'text-[var(--color-primary)] border-b-4 border-[var(--color-primary)] font-bold' : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)]'}`}>Dashboard Analitik</Link>
          <Link href="/rapor-guru/data-siswa" className={`transition-colors font-semibold text-sm pb-2 ${pathname === '/rapor-guru/data-siswa' ? 'text-[var(--color-primary)] border-b-4 border-[var(--color-primary)] font-bold' : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)]'}`}>Data Siswa</Link>
        </div>
        <div className="flex items-center gap-4">
          <UserProfileWidget sizeClass="w-10 h-10" />
        </div>
      </nav>
    </header>
  );
}

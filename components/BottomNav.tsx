'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Isi sama dengan navbar desktop (Navbar.tsx navLinks)
const NAV_ITEMS: { href: string; label: string; icon: string; match?: string }[] = [
  { href: '/',                   label: 'Beranda',    icon: 'home' },
  { href: '/materi',             label: 'Materi',     icon: 'menu_book' },
  { href: '/perjalanan-belajar', label: 'Peta',       icon: 'map' },
  { href: '/journey',            label: 'Perjalanan', icon: 'hiking', match: '/journey' },
  { href: '/e-lkpd',             label: 'Jurnal Misi',icon: 'assignment' },
];

export default function BottomNav() {
  const pathname = usePathname();

  // Hide BottomNav on all 6 expedition stages for full-screen focus
  if (pathname.includes('/journey/tahap-')) {
    return null;
  }

  return (
    <nav
      className="md:hidden fixed inset-x-0 bottom-0 z-50 px-3 pointer-events-none"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 10px)' }}
    >
      {/* Pill mengambang */}
      <div className="pointer-events-auto mx-auto flex h-[64px] max-w-[440px] items-stretch justify-between rounded-[24px] border border-[#083b54]/[0.06] bg-white/95 px-1.5 shadow-[0_12px_28px_-6px_rgba(8,59,84,0.28)] backdrop-blur-md">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.match ?? item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              className="relative flex flex-1 flex-col items-center justify-center gap-1 select-none transition-transform active:scale-90"
            >
              {/* Highlight item aktif */}
              {isActive && <span className="absolute inset-x-1.5 inset-y-2 rounded-2xl bg-[#006591]/10" />}
              <span
                className={`material-symbols-outlined relative text-[23px] leading-none transition-colors ${isActive ? 'text-[#006591]' : 'text-[#8a949e]'}`}
                style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
              >
                {item.icon}
              </span>
              <span className={`relative whitespace-nowrap text-[9.5px] font-bold leading-none tracking-tight transition-colors ${isActive ? 'text-[#006591]' : 'text-[#8a949e]'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

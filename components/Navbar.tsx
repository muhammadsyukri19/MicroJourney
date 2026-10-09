"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useAuthStore } from "@/lib/authStore";
import { useJourneyStore } from "@/lib/journeyStore";
import { useLogoutMutation } from "@/lib/hooks/useAuth";
import BottomNav from "@/components/BottomNav";

const navLinks: { href: string; label: string; match?: string }[] = [
  { href: "/", label: "Beranda" },
  { href: "/materi", label: "Materi" },
  { href: "/perjalanan-belajar", label: "Peta" },
  { href: "/journey", label: "Perjalanan", match: "/journey" },
  { href: "/e-lkpd", label: "Jurnal Misi" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser } = useAuthStore();
  const logoutMutation = useLogoutMutation();
  const isTeacher = currentUser?.role === "teacher" || currentUser?.role === "superadmin";

  const [avatarOpen, setAvatarOpen] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  // Auto-hide navbar: sembunyi saat scroll ke bawah, muncul saat scroll ke atas
  const [hideNav, setHideNav] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    function onScroll() {
      const y = window.scrollY;
      if (y < 90) setHideNav(false);
      else if (y > lastScrollY.current + 6) setHideNav(true);
      else if (y < lastScrollY.current - 6) setHideNav(false);
      lastScrollY.current = y;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function handleLogout() {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        setAvatarOpen(false);
        useJourneyStore.getState().reset();
        router.push("/");
      }
    });
  }

  const initials = currentUser?.name
    ? currentUser.name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase()
    : null;

  // Isi dropdown profil (dipakai ulang di bar mobile & papan desktop)
  const dropdownContent = currentUser ? (
    <>
      <div className="px-4 py-3 border-b border-[#eceef0]">
        <p className="text-[13px] font-bold text-[#191c1e] truncate">{currentUser.name}</p>
        <p className="text-[11px] text-[#6e7881] truncate">{currentUser.email}</p>
        <span
          className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${currentUser.role === "superadmin" ? "bg-[#ba1a1a]/10 text-[#ba1a1a]" : currentUser.role === "teacher" ? "bg-[#006591]/10 text-[#006591]" : "bg-[#006e2f]/10 text-[#006e2f]"
            }`}
        >
          {currentUser.role === "superadmin" ? "Super Admin" : currentUser.role === "teacher" ? "Guru" : "Siswa"}
        </span>
      </div>
      {isTeacher && (
        <Link href="/dashboard" className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-[#3e4850] hover:bg-[#f7f9fb] transition-colors" onClick={() => setAvatarOpen(false)}>
          <span className="material-symbols-outlined text-base text-[#006591]">dashboard</span>
          Dashboard Guru
        </Link>
      )}
      {currentUser.role === "superadmin" && (
        <Link href="/superadmin" className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-[#3e4850] hover:bg-[#f7f9fb] transition-colors" onClick={() => setAvatarOpen(false)}>
          <span className="material-symbols-outlined text-base text-[#785a00]">admin_panel_settings</span>
          Kelola Guru
        </Link>
      )}
      <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-[#ba1a1a] hover:bg-[#ba1a1a]/5 transition-colors border-t border-[#eceef0] mt-1">
        <span className="material-symbols-outlined text-base">logout</span>
        Keluar
      </button>
    </>
  ) : (
    <>
      <div className="px-4 py-3 border-b border-[#eceef0]">
        <p className="text-[12px] text-[#6e7881]">Belum masuk akun</p>
      </div>
      <Link href="/login" className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-[#006591] font-semibold hover:bg-[#f7f9fb] transition-colors" onClick={() => setAvatarOpen(false)}>
        <span className="material-symbols-outlined text-base">login</span>
        Login
      </Link>
    </>
  );

  // Tombol avatar + dropdown (dipakai di mobile & desktop)
  const renderAvatar = (sizeClass: string) => (
    <div className="relative pointer-events-auto">
      <button
        onClick={() => setAvatarOpen((v) => !v)}
        className={`${sizeClass} rounded-full border-2 flex items-center justify-center transition-all active:scale-95 select-none shadow-sm ${currentUser ? "bg-[#006591] border-white text-white font-bold text-[13px]" : "bg-white border-[#006591]/60 text-[#006591]"
          }`}
        aria-label="Menu profil"
      >
        {initials ? <span className="leading-none">{initials}</span> : <span className="material-symbols-outlined text-[18px]">person</span>}
      </button>
      {avatarOpen && (
        <>
          <div className="fixed inset-0 z-[55]" onClick={() => setAvatarOpen(false)} />
          <div className="absolute right-0 top-12 w-56 bg-white rounded-2xl shadow-xl border border-[#eceef0] py-2 z-[60] overflow-hidden">{dropdownContent}</div>
        </>
      )}
    </div>
  );

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 h-14 md:h-[112px] flex items-center pointer-events-none transition-transform duration-300 ease-out" style={{ transform: hideNav ? "translateY(-150%)" : "translateY(0)" }}>
        {/* ── MOBILE: bar sederhana ── */}
        <div className="md:hidden flex items-center justify-between w-full px-4">
          <Link href="/" className="pointer-events-auto font-[family-name:var(--font-outfit)] text-[17px] font-extrabold text-[#006591] tracking-tight" style={{ textShadow: "0 1px 8px rgba(255,255,255,0.75)" }}>
            MicroJourney <span className="text-[#006e2f]">AR</span>
          </Link>
          {renderAvatar("w-9 h-9")}
        </div>

        {/* ── DESKTOP: papan kayu gantung (logo + menu + avatar di atas papan) ── */}
        <div className="hidden md:block absolute left-1/2 top-1/2 w-full max-w-[1280px] pointer-events-none" style={{ transform: "translate(-50%, -65%)" }}>
          <img src="/navbar-board-v3.png" width={1500} height={325} alt="" className="block w-full h-auto select-none" draggable={false} style={{ filter: "drop-shadow(0 8px 9px rgba(70,40,10,0.22))" }} />

          {/* Logo terukir di sisi kiri papan */}
          <Link
            href="/"
            className="absolute left-[5.5%] top-[79.6%] -translate-y-1/2 z-10 pointer-events-auto font-[family-name:var(--font-outfit)] text-[15px] lg:text-[20px] font-extrabold tracking-tight whitespace-nowrap"
            style={{ color: "#5a3917", textShadow: "0 1px 0 rgba(255,248,225,0.55), 0 -1px 1px rgba(60,30,5,0.35)" }}
          >
            MicroJourney <span style={{ color: "#2f6b1f" }}>AR</span>
          </Link>

          {/* Menu terukir lurus di tengah papan */}
          <svg viewBox="0 0 1500 325" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
            {navLinks.map((link, idx) => {
              const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.match ?? link.href);
              const cx = [420, 620, 790, 990, 1203][idx] ?? 809;
              return (
                <text
                  key={link.href}
                  x={cx}
                  y={272}
                  textAnchor="middle"
                  onClick={() => router.push(link.href)}
                  onMouseEnter={() => setHoverIdx(idx)}
                  onMouseLeave={() => setHoverIdx((v) => (v === idx ? null : v))}
                  className="pointer-events-auto cursor-pointer"
                  fill={isActive ? "#FFF7D8" : hoverIdx === idx ? "#FFE3A1" : "#5A3718"}
                  stroke={isActive ? "#D2A24A" : hoverIdx === idx ? "#E8BE6A" : "#F2D59C"}
                  strokeWidth={isActive ? 1.8 : hoverIdx === idx ? 1.4 : 1}
                  style={{
                    fontFamily: "var(--font-fredoka), sans-serif",
                    fontWeight: 600,
                    fontSize: 25,
                    letterSpacing: "1px",
                    paintOrder: "stroke fill",
                    transformBox: "fill-box",
                    transformOrigin: "center",
                    transform: hoverIdx === idx ? "translateY(-2.5px) scale(1.07)" : "translateY(0) scale(1)",
                    transition: "transform 220ms cubic-bezier(0.34,1.5,0.6,1), fill 160ms ease, stroke 160ms ease, filter 200ms ease",
                    filter: isActive
                      ? "drop-shadow(0 2px 0 rgba(60,30,5,.45)) drop-shadow(0 0 6px rgba(255,215,100,.35))"
                      : hoverIdx === idx
                        ? "drop-shadow(0 4px 2px rgba(48,24,4,.42)) drop-shadow(0 0 9px rgba(255,205,110,.6))"
                        : "drop-shadow(0 2px 0 rgba(60,30,5,.3))",
                  }}
                >
                  {link.label.toUpperCase()}
                </text>
              );
            })}
          </svg>

          {/* Avatar (+ ikon dashboard guru) di sisi kanan papan */}
          <div className="absolute right-[5.5%] top-[79.6%] -translate-y-1/2 z-10 flex items-center gap-1.5 pointer-events-auto">
            {isTeacher && (
              <Link href="/dashboard" className="p-1.5 text-[#5b3a14] hover:bg-white/30 rounded-lg transition-all active:scale-95" title="Dashboard">
                <span className="material-symbols-outlined text-xl">dashboard</span>
              </Link>
            )}
            {renderAvatar("w-10 h-10")}
          </div>
        </div>
      </nav>

      {/* Spacer for fixed navbar */}
      <div className="h-14 md:h-[112px]" />

      {/* ── Mobile bottom nav ── */}
      <BottomNav />
    </>
  );
}

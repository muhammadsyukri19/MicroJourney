"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/authStore";
import { useJourneyStore } from "@/lib/journeyStore";
import Navbar from "@/components/Navbar";

export default function LandingPage() {
  const router = useRouter();
  const { currentUser } = useAuthStore();
  const { setStudent, studentName } = useJourneyStore();

  function handleStart() {
    // Hanya set nama siswa, JANGAN reset — agar progress yang sudah ada tidak hilang
    if (currentUser?.role === "student") {
      setStudent(currentUser.name, currentUser.className || "-");
    } else if (!studentName) {
      // Hanya set guest jika belum ada nama (belum pernah mulai)
      setStudent("Siswa Tamu", "Mode Latihan");
    }
    router.push("/journey");
  }

  return (
    <div className="bg-[#f7f9fb] font-[family-name:var(--font-inter)] text-[#191c1e] overflow-x-hidden min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow">
        {/* Hero Section — full-bleed beach scene (navbar mengambang di atasnya) */}
        <section className="relative w-full overflow-hidden min-h-[540px] h-[99vh] max-h-[820px] -mt-14 md:-mt-[112px]">
          {/* Background scene */}
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url(/hero-bg.webp)" }} />
          {/* Soften vividness + lift text contrast */}
          <div className="absolute inset-0 bg-white/15" />
          <div className="absolute inset-x-0 top-0 h-1/3 md:h-2/5 bg-gradient-to-b from-white to-transparent pointer-events-none" />
          {/* Shadow/blend bawah MENYELURUH — lapisan paling atas, menutup seluruh dasar hero (pantai + signpost + Mika) seragam ke putih */}
          <div className="absolute inset-x-0 bottom-0 h-50 sm:h-40 md:h-52 lg:h-60 pointer-events-none z-30" style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.5) 50%, #ffffff 86%)" }} />

          {/* Hero content */}
          <div className="absolute inset-0 z-10 flex flex-col items-center text-center px-5 pt-[70px] md:pt-[170px]">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/90 backdrop-blur-sm text-[#0a7d52] text-xs sm:text-sm font-bold shadow-sm">
              <span className="material-symbols-outlined text-base">auto_awesome</span>
              Ekspedisi Mikroplastik
            </span>

            <h1
              className="mt-4 text-[26px] sm:text-[40px] lg:text-[52px] leading-[1.06] font-extrabold font-[family-name:var(--font-outfit)] text-[#083b54] tracking-tight max-w-[15ch]"
              style={{ textShadow: "0 2px 16px rgba(255,255,255,0.6)" }}
            >
              Jadi Detektif Mikroplastik Lewat <span className="text-[#0a8f5f]">Misi Seru</span>
            </h1>

            <p className="mt-3 text-[13px] sm:text-[16px] lg:text-[18px] leading-relaxed text-[#0c4a66] font-medium max-w-[44ch]" style={{ textShadow: "0 1px 10px rgba(255,255,255,0.75)" }}>
              Selidiki perjalanan plastik dari tanganmu hingga ke meja makan — lewat petualangan AR bersama Mika.
            </p>

            {currentUser?.role === "student" && (
              <div className="mt-4 bg-white/85 backdrop-blur-sm border border-[#006e2f]/20 rounded-full px-4 py-1.5 flex items-center gap-2 shadow-sm">
                <span className="material-symbols-outlined text-[#006e2f] text-base">school</span>
                <span className="text-[#006e2f] text-xs sm:text-sm font-bold">
                  {currentUser.name} · {currentUser.className || "-"}
                </span>
              </div>
            )}

            {/* CTA teks lama — diganti signpost kayu di semua ukuran */}
            <div className="mt-5 flex flex-col sm:flex-row gap-3 hidden">
              <button
                onClick={handleStart}
                className="bg-[#006591] hover:bg-[#004c6e] active:scale-[0.98] text-white font-bold px-7 py-3.5 rounded-full text-[15px] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#004c6e]/30"
              >
                <span className="material-symbols-outlined text-lg">explore</span>
                Mulai Investigasi
              </button>
              <Link href="/perjalanan-belajar" className="bg-white/90 hover:bg-white active:scale-[0.98] text-[#085b3a] font-bold px-6 py-3.5 rounded-full text-[15px] transition-all flex items-center justify-center gap-2 shadow-md">
                <span className="material-symbols-outlined text-lg">map</span>
                Lihat Peta Perjalanan
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-6 hidden sm:flex md:hidden gap-2.5">
              {[
                { val: "6", label: "Tahap Misi" },
                { val: "AR", label: "Kamera AI" },
                { val: "PDF", label: "Rapor" },
              ].map((s) => (
                <div key={s.label} className="bg-white/70 backdrop-blur-sm rounded-2xl px-4 py-2 text-center shadow-sm">
                  <div className="font-[family-name:var(--font-mono)] text-base font-bold text-[#006591] leading-none">{s.val}</div>
                  <div className="text-[10px] text-[#3e4850] mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Signpost CTA — desktop (papan kayu tertancap di pasir) */}
          <div className="block absolute bottom-[5%] md:bottom-0 left-[32%] sm:left-[26%] md:left-[20%] -translate-x-1/2 -rotate-[5deg] z-20 w-[185px] sm:w-[235px] md:w-[280px] lg:w-[320px]" style={{ aspectRatio: "790 / 1092" }}>
            <img src="/signpost.png" alt="" draggable={false} className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none" style={{ filter: "drop-shadow(0 12px 16px rgba(30,55,25,0.28))" }} />
            {/* Keping atas — Lihat Peta (sekunder) */}
            <Link href="/perjalanan-belajar" aria-label="Lihat Peta" className="group absolute left-[13%] right-[13%] top-[16%] h-[15.5%] flex items-center justify-center pointer-events-auto cursor-pointer">
              {/* Glow panel saat hover/tap → terlihat sebagai tombol */}
              <span className="absolute inset-x-[3%] inset-y-[12%] rounded-[7px] bg-[#ffdd86]/0 group-hover:bg-[#ffdd86]/45 group-active:bg-[#ffdd86]/55 transition-all duration-200 pointer-events-none group-hover:shadow-[0_0_14px_3px_rgba(255,210,105,0.6)]" />
              <span
                className="relative font-[family-name:var(--font-outfit)] font-extrabold text-[11px] sm:text-[13px] lg:text-[15px] tracking-tight leading-none text-center transition-transform duration-150 group-hover:scale-[1.05] group-active:translate-y-[1px]"
                style={{ color: "#43280f", textShadow: "0 1px 0 rgba(255,249,228,0.5), 0 -1px 1px rgba(35,18,4,0.4)" }}
              >
                Lihat Peta
              </span>
            </Link>
            {/* Keping bawah — Mulai Investigasi (utama) */}
            <button onClick={handleStart} aria-label="Mulai Investigasi" className="group absolute left-[13%] right-[13%] top-[39.5%] h-[15.5%] flex items-center justify-center pointer-events-auto cursor-pointer">
              {/* Glow panel saat hover/tap → terlihat sebagai tombol */}
              <span className="absolute inset-x-[3%] inset-y-[12%] rounded-[7px] bg-[#ffdd86]/0 group-hover:bg-[#ffdd86]/45 group-active:bg-[#ffdd86]/55 transition-all duration-200 pointer-events-none group-hover:shadow-[0_0_14px_3px_rgba(255,210,105,0.6)]" />
              <span
                className="relative font-[family-name:var(--font-outfit)] font-extrabold text-[11px] sm:text-[13px] lg:text-[15px] tracking-tight leading-none text-center transition-transform duration-150 group-hover:scale-[1.05] group-active:translate-y-[1px]"
                style={{ color: "#43280f", textShadow: "0 1px 0 rgba(255,249,228,0.5), 0 -1px 1px rgba(35,18,4,0.4)" }}
              >
                Mulai Investigasi
              </span>
            </button>
          </div>

          {/* Mika in scene */}
          <img src="/mika.webp" alt="Mika, maskot pemandu" draggable={false} className="absolute bottom-[5%] md:bottom-0 right-0 sm:right-[4%] lg:right-[6%] z-30 mika-float pointer-events-none select-none h-[50%] sm:h-[46%] lg:h-[60%]" />
        </section>

        {/* Misi Penyelidikan — 3 kartu */}
        <section className="py-[72px] bg-white">
          <div className="max-w-[1200px] mx-auto px-[24px]">
            <div className="text-center max-w-3xl mx-auto mb-[56px]">
              <p className="text-[13px] font-bold tracking-[2px] text-[#0a7d52] mb-3">MISI PENYELIDIKAN</p>
              <h2 className="text-[30px] md:text-[38px] leading-[1.15] font-extrabold font-[family-name:var(--font-outfit)] text-[#083b54]">
                Cara Seru Menyelidiki <span className="text-[#0a8f5f]">Bahaya Mikroplastik</span>
              </h2>
              <p className="text-[16px] leading-[26px] text-[#3e4850] mt-4">Tiga cara MicroJourney AR mengubah materi abstrak jadi petualangan yang nyata, interaktif, dan berkesan.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: "qr_code_scanner",
                  title: "Selidiki, Bukan Menghafal",
                  desc: "Pindai plastik nyata dengan kamera AR dan selidiki sendiri perjalanannya — dari pantai, ke laut, hingga ke dalam tubuhmu.",
                  bg: "#e4f1f9",
                  ic: "#006591",
                  tt: "#024c6e",
                  tx: "#235b73",
                },
                {
                  icon: "visibility",
                  title: "Lihat yang Tak Kasat Mata",
                  desc: "Proses yang mustahil dilihat — pelapukan plastik, mikroplastik di makanan, dampak pada organ — hadir lewat animasi & AR di depan matamu.",
                  bg: "#e1f5ee",
                  ic: "#0a8f5f",
                  tt: "#075a3b",
                  tx: "#1f6b4d",
                },
                {
                  icon: "workspace_premium",
                  title: "Jadi Penjaga Samudra",
                  desc: "Selesaikan 6 misi bersama Mika, isi E-LKPD digital, dan raih Sertifikat Penjaga Samudra sebagai bukti kamu paham & peduli.",
                  bg: "#faeeda",
                  ic: "#c39400",
                  tt: "#7d5e06",
                  tx: "#7a5e16",
                },
              ].map((c) => (
                <div key={c.title} className="relative rounded-[28px] p-7 flex flex-col gap-3 hover:-translate-y-2 transition-transform duration-300 shadow-sm" style={{ backgroundColor: c.bg }}>
                  <span className="absolute top-5 right-5 w-3 h-3 rounded-full" style={{ backgroundColor: c.ic, opacity: 0.5 }} />
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-md" style={{ backgroundColor: c.ic }}>
                    <span className="material-symbols-outlined text-white text-3xl">{c.icon}</span>
                  </div>
                  <h3 className="text-[20px] font-bold font-[family-name:var(--font-outfit)] mt-1" style={{ color: c.tt }}>
                    {c.title}
                  </h3>
                  <p className="text-[15px] leading-[24px]" style={{ color: c.tx }}>
                    {c.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Cara Kerja Section */}
        <section className="py-[72px] bg-[#f2f4f6]">
          <div className="max-w-[1200px] mx-auto px-[24px]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-[56px] lg:gap-[80px] items-center">
              {/* Mockup HP — screenshot asli app */}
              <div className="order-2 lg:order-1 flex justify-center">
                <div className="relative">
                  <div className="absolute -inset-6 bg-[#006591]/10 rounded-[48px] -rotate-3" />
                  <div className="absolute -inset-2 bg-[#006e2f]/10 rounded-[44px] rotate-2" />
                  <div className="relative z-10 w-[258px] rounded-[42px] border-[11px] border-[#16242b] bg-[#16242b] shadow-2xl overflow-hidden">
                    <img src="/app-peta.png" alt="Tampilan aplikasi MicroJourney AR" className="w-full block" draggable={false} />
                  </div>
                </div>
              </div>

              {/* 3 langkah */}
              <div className="order-1 lg:order-2 space-y-[36px]">
                <h2 className="text-[32px] md:text-[38px] leading-[1.15] font-extrabold font-[family-name:var(--font-outfit)] text-[#083b54]">
                  Tiga Langkah <span className="text-[#006591]">Eksplorasi</span>
                </h2>
                <div className="space-y-[26px]">
                  {[
                    { t: "Pindai Plastik", d: "Arahkan kamera ke sampah plastik di sekitarmu—botol, sedotan, kresek. AI mendeteksi jenis & dampaknya secara real-time." },
                    { t: "Selidiki Dampaknya", d: "Saksikan simulasi pelapukan, lacak mikroplastik di makananmu, lalu telusuri perjalanannya hingga ke organ tubuh." },
                    { t: "Buktikan & Berkomitmen", d: "Isi E-LKPD digital, tarik kesimpulanmu, dan raih Sertifikat Penjaga Samudra." },
                  ].map((s, i) => (
                    <div key={s.t} className="flex gap-[20px] group">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center font-extrabold text-[#006591] group-hover:bg-[#006591] group-hover:text-white transition-colors duration-300">
                        {i + 1}
                      </div>
                      <div>
                        <h4 className="text-[22px] leading-[30px] font-bold font-[family-name:var(--font-outfit)] text-[#083b54] mb-1">{s.t}</h4>
                        <p className="text-[16px] leading-[25px] text-[#3e4850]">{s.d}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Fitur Unggulan — grid fitur asli */}
        <section className="py-[72px] bg-white">
          <div className="max-w-[1200px] mx-auto px-[24px]">
            <div className="text-center max-w-3xl mx-auto mb-[48px]">
              <h2 className="text-[30px] md:text-[38px] leading-[1.15] font-extrabold font-[family-name:var(--font-outfit)] text-[#083b54]">
                Fitur <span className="text-[#006591]">Unggulan</span>
              </h2>
              <p className="text-[16px] leading-[26px] text-[#3e4850] mt-4">Semua yang kamu butuhkan untuk menyelidiki mikroplastik—dari deteksi AR hingga rapor digital untuk guru.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: "qr_code_scanner", c: "#006591", t: "Scanner AR Plastik", d: "Kamera HP-mu mendeteksi plastik nyata di sekitar lewat Computer Vision, lengkap dengan data degradasinya." },
                { icon: "science", c: "#0a8f5f", t: "Simulasi & Visualisasi", d: "Animasi pelapukan plastik, food tracker mikroplastik di makanan, hingga organ tubuh yang interaktif." },
                { icon: "assignment", c: "#c39400", t: "E-LKPD Digital", d: "Empat lembar kerja terintegrasi, jawaban tersimpan otomatis, dan bisa diekspor jadi rapor PDF satu klik." },
                { icon: "monitoring", c: "#006591", t: "Dashboard Guru", d: "Guru memantau progres seluruh siswa secara real-time dan menilai jawaban tanpa rekap manual." },
                { icon: "workspace_premium", c: "#c39400", t: "Sertifikat Penjaga Samudra", d: "Selesaikan semua misi dan raih sertifikat digital sebagai bukti komitmenmu menjaga laut." },
                { icon: "phone_iphone", c: "#0a8f5f", t: "Tanpa Instalasi", d: "Cukup buka di browser HP—tanpa unduh aplikasi. Ringan, cepat, dan bisa diakses siapa saja." },
              ].map((f) => (
                <div key={f.t} className="rounded-[24px] border border-[#e6edf2] bg-white p-7 flex flex-col gap-3 hover:-translate-y-1.5 hover:shadow-lg transition-all duration-300">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-md" style={{ backgroundColor: f.c }}>
                    <span className="material-symbols-outlined text-white text-3xl">{f.icon}</span>
                  </div>
                  <h3 className="text-[20px] font-bold font-[family-name:var(--font-outfit)] text-[#083b54] mt-1">{f.t}</h3>
                  <p className="text-[15px] leading-[24px] text-[#3e4850]">{f.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#eceef0] border-t border-[#bec8d2] pb-[76px] md:pb-0">
        <div className="w-full py-[64px] px-[24px] flex flex-col md:flex-row justify-between items-center gap-[24px] max-w-[1200px] mx-auto">
          <div className="flex flex-col items-center md:items-start gap-4">
            <span className="text-[24px] leading-[32px] font-semibold font-[family-name:var(--font-outfit)] font-bold text-[#191c1e]">MicroJourney AR</span>
            <p className="text-[14px] leading-[20px] font-semibold font-[family-name:var(--font-inter)] text-[#3e4850] text-center md:text-left">© 2026 MicroJourney AR. Petualangan Sains untuk Penjelajah Muda.</p>
          </div>
          <div className="flex gap-[40px] flex-wrap justify-center">
            <Link className="text-[14px] leading-[20px] font-semibold font-[family-name:var(--font-inter)] text-[#3e4850] hover:text-[#006e2f] transition-colors" href="#">
              Tentang Kami
            </Link>
            <Link className="text-[14px] leading-[20px] font-semibold font-[family-name:var(--font-inter)] text-[#3e4850] hover:text-[#006e2f] transition-colors" href="#">
              Bantuan
            </Link>
            <Link className="text-[14px] leading-[20px] font-semibold font-[family-name:var(--font-inter)] text-[#3e4850] hover:text-[#006e2f] transition-colors" href="#">
              Kebijakan Privasi
            </Link>
            <Link className="text-[14px] leading-[20px] font-semibold font-[family-name:var(--font-inter)] text-[#3e4850] hover:text-[#006e2f] transition-colors" href="#">
              Panduan Guru
            </Link>
          </div>
          <div className="flex gap-[24px]">
            <a className="w-10 h-10 rounded-full bg-[#e6e8ea] flex items-center justify-center text-[#3e4850] hover:bg-[#006591] hover:text-white transition-all" href="#">
              <span className="material-symbols-outlined">language</span>
            </a>
            <a className="w-10 h-10 rounded-full bg-[#e6e8ea] flex items-center justify-center text-[#3e4850] hover:bg-[#006591] hover:text-white transition-all" href="#">
              <span className="material-symbols-outlined">forum</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

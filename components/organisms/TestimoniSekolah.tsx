"use client";
import { useState } from "react";

// Satu gradasi untuk semua kartu, senada dengan warna utama MicroJourney
const GRADASI = "linear-gradient(135deg, #083b54 0%, #006591 100%)";

// Wawancara setelah uji coba di SMP Negeri 3 Banda Aceh; video YouTube tidak publik
const TESTIMONI = [
  {
    id: "TRxej1x-Puc",
    nama: "Bu Nurjani",
    peran: "Kepala Sekolah SMP Negeri 3 Banda Aceh",
    label: "Kepala Sekolah",
    icon: "account_balance",
    durasi: "1:23",
    kutipan: "Mereka sudah mulai menyadari bahwa sampah plastik itu sangat berpengaruh dengan kehidupan sehari-hari.",
  },
  {
    id: "ZZa4OPS1m_Y",
    nama: "Bu Sri Wahyuni",
    peran: "Guru SMP Negeri 3 Banda Aceh",
    label: "Guru",
    icon: "menu_book",
    durasi: "1:24",
    kutipan: "Ketika mereka mempelajari dengan media tersebut, mereka lebih antusias, lebih aktif, lebih terlibat dalam proses pembelajaran.",
  },
  {
    id: "eAfcd_ufMOA",
    nama: "Tisha dan Alfata",
    peran: "Siswa-Siswi SMP Negeri 3 Banda Aceh",
    label: "Siswa-Siswi",
    icon: "groups",
    durasi: "1:04",
    kutipan: "Saya paling tertarik pada saat melihat proses mikroplastik masuk ke dalam tubuh manusia, walaupun mikroplastik itu tidak terlihat.",
  },
];

export default function TestimoniSekolah() {
  // Pemutar YouTube baru dimuat saat kartunya ditekan, supaya beranda tetap ringan
  const [diputar, setDiputar] = useState<string | null>(null);

  return (
    <section className="py-[72px] bg-[#f2f4f6]">
      <div className="max-w-[1200px] mx-auto px-[24px]">
        <div className="text-center max-w-3xl mx-auto mb-[48px]">
          <h2 className="text-[30px] md:text-[38px] leading-[1.15] font-extrabold font-[family-name:var(--font-outfit)] text-[#083b54]">
            Kata Mereka <span className="text-[#006591]">di Sekolah</span>
          </h2>
          <p className="text-[16px] leading-[26px] text-[#3e4850] mt-4">
            Cerita kepala sekolah, guru, dan siswa SMP Negeri 3 Banda Aceh setelah belajar bersama MicroJourney.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONI.map(t => (
            <figure
              key={t.id}
              className="rounded-[24px] bg-gradient-to-b from-white to-[#eaf3f8] border border-[#e1ebf1] overflow-hidden flex flex-col shadow-[0_10px_30px_-14px_rgba(8,59,84,0.3)] hover:-translate-y-1 hover:shadow-[0_18px_40px_-16px_rgba(8,59,84,0.4)] transition-all duration-300"
            >
              <div className="relative aspect-video bg-[#083b54]">
                {diputar === t.id ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${t.id}?autoplay=1&rel=0`}
                    title={`Wawancara ${t.nama}`}
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    allowFullScreen
                    // YouTube menolak pemutar sematan tanpa asal situs (Error 153)
                    referrerPolicy="strict-origin-when-cross-origin"
                    className="absolute inset-0 w-full h-full"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setDiputar(t.id)}
                    aria-label={`Putar wawancara ${t.nama}`}
                    className="group absolute inset-0 w-full h-full cursor-pointer overflow-hidden"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- sampul dari YouTube */}
                    <img
                      src={`https://i.ytimg.com/vi/${t.id}/hqdefault.jpg`}
                      alt=""
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <span className="absolute inset-0 bg-gradient-to-t from-[#083b54]/60 via-transparent to-transparent" />
                    <span
                      className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold text-white"
                      style={{ backgroundImage: GRADASI }}
                    >
                      <span className="material-symbols-outlined text-[15px]">{t.icon}</span>
                      {t.label}
                    </span>
                    <span className="absolute bottom-3 right-3 rounded-full bg-black/55 px-2 py-0.5 text-[12px] font-semibold text-white">
                      {t.durasi}
                    </span>
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="w-14 h-14 rounded-full bg-white/95 shadow-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-[34px] text-[#006591]">play_arrow</span>
                      </span>
                    </span>
                  </button>
                )}
              </div>

              <div className="relative p-6 pt-9 flex flex-col gap-4 flex-1">
                {/* Tanda kutip menumpang di tepi foto */}
                <span
                  aria-hidden
                  className="absolute -top-6 left-6 w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg rotate-[-6deg]"
                  style={{ backgroundImage: GRADASI }}
                >
                  <span className="material-symbols-outlined text-3xl">format_quote</span>
                </span>
                <blockquote className="text-[16px] leading-[26px] text-[#191c1e] italic flex-1">
                  &ldquo;{t.kutipan}&rdquo;
                </blockquote>
                <figcaption className="flex items-center gap-3 pt-4 border-t border-[#dce8ef]">
                  <span
                    className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-white"
                    style={{ backgroundImage: GRADASI }}
                  >
                    <span className="material-symbols-outlined text-[20px]">{t.icon}</span>
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[16px] font-bold font-[family-name:var(--font-outfit)] text-[#083b54]">{t.nama}</span>
                    <span className="block text-[14px] text-[#3e4850]">{t.peran}</span>
                  </span>
                </figcaption>
              </div>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

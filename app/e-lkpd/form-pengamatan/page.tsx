'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import UserProfileWidget from '@/components/auth/UserProfileWidget';

export default function FormPengamatanPage() {
  const router = useRouter();
  const [rangeValue, setRangeValue] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => router.push('/e-lkpd'), 1500);
  }

  return (
    <div className="bg-[var(--color-background)] text-[var(--color-on-background)] min-h-screen flex flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <nav className="flex justify-between items-center w-full px-6 max-w-3xl mx-auto h-20">
          <div className="flex items-center gap-2">
            <Link href="/e-lkpd" className="material-symbols-outlined p-2 hover:bg-[var(--color-surface-container)] rounded-full transition-colors text-[var(--color-on-surface-variant)] mr-2">arrow_back</Link>
            <span className="font-[family-name:var(--font-plus-jakarta)] font-bold text-[var(--color-on-surface)] tracking-tight">Form Pengamatan</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              form="form-pengamatan"
              type="submit"
              className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-[var(--color-primary)]/90 transition-colors shadow-md cursor-pointer"
            >
              Kirim Jawaban
            </button>
            <UserProfileWidget sizeClass="w-9 h-9" />
          </div>
        </nav>
      </header>

      <main className="flex-grow max-w-3xl mx-auto w-full px-6 py-8">
        {/* Konteks Edukasi */}
        <div className="bg-[var(--color-secondary)]/10 border-l-4 border-[var(--color-secondary)] p-6 rounded-r-2xl mb-8">
          <div className="flex gap-4">
            <span className="material-symbols-outlined text-[var(--color-secondary)] text-3xl">menu_book</span>
            <div>
              <h2 className="text-lg font-bold text-[var(--color-secondary)] mb-1">Materi: Masuk ke Rantai Makanan (Tahap 4)</h2>
              <p className="text-sm text-[var(--color-on-surface-variant)] leading-relaxed">
                Partikel mikroplastik di lautan sering disangka sebagai plankton oleh hewan-hewan laut kecil.
                Ketika ikan memakan plankton tersebut, mikroplastik ikut tertelan dan terjebak di dalam sistem pencernaan mereka.
                Melalui simulasi AR sebelumnya, kamu telah memindai organ dalam ikan. Gunakan temuanmu untuk mengisi form di bawah ini!
              </p>
            </div>
          </div>
        </div>

        {submitted && (
          <div className="mb-6 p-4 bg-[var(--color-secondary-container)]/40 border border-[var(--color-secondary)] rounded-xl flex items-center gap-3">
            <span className="material-symbols-outlined text-[var(--color-secondary)]">check_circle</span>
            <p className="font-semibold text-[var(--color-secondary)]">Laporan berhasil dikirim ke Guru! Mengalihkan...</p>
          </div>
        )}

        <form id="form-pengamatan" className="space-y-8" onSubmit={handleSubmit}>
          {/* Unggah Bukti */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-[var(--color-outline-variant)]/30">
            <h3 className="text-xl font-[family-name:var(--font-plus-jakarta)] font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[var(--color-primary)]">add_a_photo</span> 1. Unggah Bukti Pengamatan AR
            </h3>
            <p className="text-sm text-[var(--color-on-surface-variant)] mb-4">Pilih screenshot atau hasil Capture dari kamera AR kamu saat melihat isi perut ikan.</p>
            <label className="border-2 border-dashed border-[var(--color-outline-variant)] rounded-xl p-8 text-center hover:bg-[var(--color-surface-container-low)] transition-colors cursor-pointer group block">
              <span className="material-symbols-outlined text-4xl text-[var(--color-outline)] mb-2 group-hover:text-[var(--color-primary)] transition-colors block">cloud_upload</span>
              <p className="font-semibold text-[var(--color-on-surface)]">Klik untuk mengunggah gambar</p>
              <p className="text-xs text-[var(--color-on-surface-variant)] mt-1">PNG, JPG up to 10MB</p>
              <input type="file" className="hidden" accept="image/*" />
            </label>
          </div>

          {/* Analisis Data */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-[var(--color-outline-variant)]/30">
            <h3 className="text-xl font-[family-name:var(--font-plus-jakarta)] font-bold mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-[var(--color-primary)]">biotech</span> 2. Lembar Analisis Data
            </h3>
            <div className="space-y-6">
              <div>
                <label className="block font-semibold text-[var(--color-on-surface)] mb-2">A. Jenis ikan apa yang kamu pindai dalam simulasi AR?</label>
                <select className="w-full bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)] rounded-lg px-4 py-3 text-[var(--color-on-surface)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]" required>
                  <option value="">Pilih jenis ikan...</option>
                  <option value="tuna">Ikan Tuna</option>
                  <option value="sarden">Ikan Sarden (Pemakan Plankton)</option>
                  <option value="kakap">Ikan Kakap</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-[var(--color-on-surface)] mb-2">B. Berdasarkan Composition Analysis di AR, berapa persentase kandungan plastik (Polietilen) yang terdeteksi?</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range" min="0" max="100" value={rangeValue}
                    onChange={e => setRangeValue(Number(e.target.value))}
                    className="flex-grow h-2 bg-[var(--color-surface-container)] rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="font-bold text-[var(--color-primary)] w-12 text-right">{rangeValue}%</span>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-[var(--color-on-surface)] mb-2">C. Menurut analisis kritismu, mengapa ikan tersebut bisa menelan plastik dalam jumlah sebanyak itu?</label>
                <textarea rows={4} placeholder="Tulis analisis ilmiahmu di sini..." className="w-full bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)] rounded-lg px-4 py-3 text-[var(--color-on-surface)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]" required />
              </div>
            </div>
          </div>

          {/* Refleksi */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-[var(--color-outline-variant)]/30">
            <h3 className="text-xl font-[family-name:var(--font-plus-jakarta)] font-bold mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-[var(--color-primary)]">psychology</span> 3. Refleksi Lingkungan
            </h3>
            <div>
              <label className="block font-semibold text-[var(--color-on-surface)] mb-2">Apa dampak jangka panjang jika manusia mengonsumsi ikan yang mengandung mikroplastik tersebut? (Bioakumulasi)</label>
              <textarea rows={4} placeholder="Berikan pendapatmu dari sudut pandang kesehatan..." className="w-full bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)] rounded-lg px-4 py-3 text-[var(--color-on-surface)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]" required />
            </div>
          </div>

          <div className="flex justify-end gap-4 mt-8">
            <Link href="/e-lkpd" className="px-6 py-3 border border-[var(--color-outline-variant)] text-[var(--color-on-surface)] font-semibold rounded-xl hover:bg-[var(--color-surface-container)] transition-colors">Batal</Link>
            <button type="submit" className="px-8 py-3 bg-[var(--color-primary)] text-white font-bold rounded-xl shadow-lg hover:bg-[var(--color-primary)]/90 hover:scale-105 active:scale-95 transition-all">
              Kirim & Selesaikan Misi
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

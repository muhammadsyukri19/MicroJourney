'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/authStore';
import { useJourneyStore } from '@/lib/journeyStore';
import EvidenceBoard from '@/components/stages/EvidenceBoard';
import StageCompletionModal from '@/components/ui/StageCompletionModal';

const SUGGESTED_CHIPS = [
  'Rantai Pangan',
  'Pelapukan UV & Ombak',
  'Mikroplastik Ingestif',
  'Biomagnifikasi',
  'Asam Lambung (HCl) Gagal',
  'Penumpukan di Usus Halus',
  'Pencemaran Lingkungan',
];

export default function Tahap5() {
  const router = useRouter();
  const { currentUser } = useAuthStore();
  const { completeStage, setLkpdAnswer, lkpdAnswers, studentName, studentClass, sessionId, totalParticles, selectedFoods, mostDangerousOrgan, quizCorrect, quizWrong } = useJourneyStore();
  const [lkpd4, setLkpd4] = useState(lkpdAnswers.lkpd4);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [boardUnlocked, setBoardUnlocked] = useState(false);
  const [error, setError] = useState('');
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  const addChipText = (chip: string) => {
    setLkpd4((prev) => (prev ? `${prev} ${chip}` : chip));
  };

  const wordCount = lkpd4.trim().split(/\s+/).filter(Boolean).length;
  const isValid = wordCount >= 3;
  const isRegisteredStudent = currentUser?.role === 'student';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    if (!isRegisteredStudent) {
      setLkpdAnswer('lkpd4', lkpd4);
      completeStage(5);
      setSubmitted(true);
      return;
    }
    setSubmitting(true);
    setError('');
    setLkpdAnswer('lkpd4', lkpd4);

    try {
      await fetch('/api/lkpd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName, studentClass, sessionId,
          studentAccountEmail: currentUser.email,
          assessmentEligible: true,
          lkpd1: lkpdAnswers.lkpd1,
          lkpd2: lkpdAnswers.lkpd2,
          lkpd3q1: lkpdAnswers.lkpd3q1,
          lkpd3q2: lkpdAnswers.lkpd3q2,
          lkpd4,
          commitment: lkpdAnswers.commitment,
          totalParticles,
          mostDangerousOrgan,
          quizCorrect,
          quizWrong,
          selectedFoods: selectedFoods.map(f => f.name),
        }),
      });
      setSubmitted(true);
      completeStage(5);
      setShowCompletionModal(true);
    } catch {
      setError('Gagal mengirim. Periksa koneksi internet.');
    } finally {
      setSubmitting(false);
    }
  }

  const PREV_LKPDS = [
    { label: 'LKPD 1', q: 'Proses pelapukan plastik menjadi mikroplastik', a: lkpdAnswers.lkpd1 },
    { label: 'LKPD 2', q: 'Jalur kontaminasi mikroplastik ke makanan', a: lkpdAnswers.lkpd2 },
    { label: 'LKPD 3 — Q1', q: 'Mengapa HCl gagal mencerna plastik?', a: lkpdAnswers.lkpd3q1 },
    { label: 'LKPD 3 — Q2', q: 'Organ paling berbahaya dan alasannya', a: lkpdAnswers.lkpd3q2 },
  ];

  return (
    <div className="min-h-screen pt-28 sm:pt-32 pb-20 bg-[linear-gradient(160deg,#083b54_0%,#006591_45%,#004c6e_100%)] text-white relative overflow-x-hidden">
      {/* Background patterns and glowing Orbs */}
      <div className="absolute inset-0 adventure-map opacity-10 pointer-events-none" />
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#f0a345]/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute top-1/2 -right-24 w-96 h-96 bg-[#6bff8f]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6 relative z-10">
        {/* Top Navigation */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => router.push('/journey/tahap-4')}
            className="w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs sm:text-sm backdrop-blur-md transition-all shadow-sm flex items-center justify-center gap-2 flex-shrink-0"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            <span className="hidden sm:inline">Kembali ke Tahap 4 (Organ Pencernaan)</span>
          </button>

          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-xl text-xs font-[family-name:var(--font-outfit)] font-extrabold text-[#ffdf9a]">
            <span className="material-symbols-outlined text-base">assignment</span>
            <span>Tahap 5 — Papan Bukti &amp; LKPD 4</span>
          </div>
        </div>

        {/* Hero Bento Cards (Bukti Hasil Temuan Siswa) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-7">
          {/* Card 1: Total Partikel */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-xl flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#006591]/60 border border-[#7dd3fc]/40 flex items-center justify-center text-[#7dd3fc] flex-shrink-0">
              <span className="material-symbols-outlined text-2xl">blur_on</span>
            </div>
            <div>
              <p className="text-[10px] font-extrabold text-white/60 font-[family-name:var(--font-mono)] uppercase tracking-wider">Total Partikel</p>
              <p className="font-[family-name:var(--font-outfit)] font-black text-xl text-[#7dd3fc]">
                +{totalParticles.toLocaleString('id-ID')} <span className="text-xs font-normal text-white/70">partikel</span>
              </p>
            </div>
          </div>

          {/* Card 2: Organ Target */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-xl flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#ba1a1a]/40 border border-[#ff8c8c]/40 flex items-center justify-center text-[#ff8c8c] flex-shrink-0">
              <span className="material-symbols-outlined text-2xl">warning</span>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold text-white/60 font-[family-name:var(--font-mono)] uppercase tracking-wider">Organ Target</p>
              <p className="font-[family-name:var(--font-outfit)] font-extrabold text-base text-[#ff8c8c] truncate">
                {mostDangerousOrgan || 'Usus Halus'}
              </p>
            </div>
          </div>

          {/* Card 3: Makanan Terkontaminasi */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-xl flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#006e2f]/50 border border-[#6bff8f]/40 flex items-center justify-center text-[#6bff8f] flex-shrink-0">
              <span className="material-symbols-outlined text-2xl">restaurant</span>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold text-white/60 font-[family-name:var(--font-mono)] uppercase tracking-wider">Pangan Terpapar</p>
              <p className="font-[family-name:var(--font-outfit)] font-bold text-xs text-[#6bff8f] truncate">
                {selectedFoods.map(f => f.name).join(', ') || 'Cilok, Es Teh, Garam'}
              </p>
            </div>
          </div>
        </div>

        {/* Evidence Board (Interactive Drag & Drop) */}
        {!submitted && (
          <div className="mb-8">
            <EvidenceBoard onUnlock={() => setBoardUnlocked(true)} />
          </div>
        )}

        {/* LKPD 4 — CASE SUMMARY DOSSIER */}
        {boardUnlocked && !submitted ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-5 sm:p-7 shadow-2xl relative text-white">
              {/* Card Header Tag */}
              <div className="flex items-center justify-between border-b border-white/15 pb-4 mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[linear-gradient(180deg,#f0a345_0%,#d27b22_100%)] text-[#3b2313] flex items-center justify-center font-bold shadow-md">
                    <span className="material-symbols-outlined text-xl">description</span>
                  </div>
                  <div>
                    <span className="bg-[#f0a345]/20 text-[#ffdf9a] text-[10px] font-bold px-2 py-0.5 rounded font-[family-name:var(--font-mono)] uppercase tracking-wider border border-[#f0a345]/40">
                      CASE SUMMARY
                    </span>
                    <h3 className="font-[family-name:var(--font-outfit)] text-lg sm:text-xl font-extrabold text-white leading-tight">
                      Kesimpulan Laporan Detektif (LKPD 4)
                    </h3>
                  </div>
                </div>
              </div>

              {/* Graphic Concept Card (Visual Diagram 2-Sisi) */}
              <div className="bg-gradient-to-r from-[#f0a345]/20 via-[#006591]/40 to-[#ba1a1a]/20 border border-white/20 rounded-2xl p-4 sm:p-5 mb-5 shadow-inner">
                <p className="text-xs font-[family-name:var(--font-mono)] text-[#ffdf9a] uppercase tracking-wider font-bold mb-3 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">psychology</span>
                  <span>Misi Analisis Hubungan Sebab-Akibat:</span>
                </p>

                {/* Visual Dual Concept Diagram */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <div className="bg-black/30 border border-[#f0a345]/40 rounded-xl p-3 flex items-start gap-2.5">
                    <span className="text-2xl">🕵️</span>
                    <div>
                      <p className="text-xs font-bold text-[#ffdf9a]">1. Manusia = PELAKU</p>
                      <p className="text-[11px] text-white/80 leading-snug mt-0.5">Memproduksi &amp; membuang sampah plastik sintetis ke lingkungan.</p>
                    </div>
                  </div>

                  <div className="bg-black/30 border border-[#ff8c8c]/40 rounded-xl p-3 flex items-start gap-2.5">
                    <span className="text-2xl">☣️</span>
                    <div>
                      <p className="text-xs font-bold text-[#ff8c8c]">2. Manusia = KORBAN</p>
                      <p className="text-[11px] text-white/80 leading-snug mt-0.5">Termakan kembali melalui rantai pangan &amp; masuk organ pencernaan.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 border-l-4 border-[#6bff8f] rounded-xl p-3.5">
                  <p className="text-white text-xs sm:text-sm leading-relaxed italic">
                    &ldquo;Kamu adalah <strong>PELAKU sekaligus KORBAN AKHIR</strong> dari pencemaran plastik ini. Jelaskan maksud pernyataan tersebut berdasarkan seluruh eksperimen &amp; ekspedisi yang sudah kamu jalani!&rdquo;
                  </p>
                </div>
              </div>

              {/* Interactive Word Bank Chips */}
              <div className="mb-4">
                <p className="text-xs font-[family-name:var(--font-mono)] text-white/70 mb-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm text-[#6bff8f]">auto_awesome</span>
                  <span>Bantuan Kata Kunci (Ketuk untuk menyisipkan ke jawabanmu):</span>
                </p>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {SUGGESTED_CHIPS.map((chip, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => addChipText(chip)}
                      className="text-[11px] font-semibold bg-white/10 hover:bg-[#006591] text-white hover:text-[#6bff8f] border border-white/20 hover:border-[#6bff8f]/50 px-2.5 py-1 rounded-lg transition-all active:scale-95 flex items-center gap-1 shadow-xs"
                    >
                      <span>+</span>
                      <span>{chip}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea Input */}
              <div className="relative">
                <textarea
                  value={lkpd4}
                  onChange={e => setLkpd4(e.target.value)}
                  className="w-full bg-black/40 border border-white/20 focus:border-[#6bff8f] rounded-2xl p-4 text-white placeholder-white/40 text-xs sm:text-sm resize-none h-44 focus:outline-none focus:ring-2 focus:ring-[#6bff8f]/40 transition-all font-sans leading-relaxed"
                  placeholder="Contoh: Manusia disebut sebagai pelaku karena secara sadar memproduksi plastik dan membuangnya ke laut. Namun melalui proses pelapukan dan rantai makanan, partikel mikroplastik tersebut masuk kembali ke tubuh manusia..."
                />
                
                <div className="flex justify-between items-center mt-2.5 px-1">
                  <p className={`text-xs font-[family-name:var(--font-mono)] flex items-center gap-1.5 ${isValid ? 'text-[#6bff8f]' : 'text-white/60'}`}>
                    <span>{wordCount} kata</span>
                    {!isValid && <span className="text-[#ff8c8c] text-[11px]">(minimal 3 kata)</span>}
                  </p>
                  {isValid && (
                    <span className="bg-[#006e2f]/60 border border-[#6bff8f]/40 text-[#6bff8f] text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      <span>Siap Dikirim</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {error && <p className="text-[#ff8c8c] text-sm bg-[#ba1a1a]/40 border border-[#ff8c8c]/40 p-3 rounded-xl text-center">{error}</p>}

            {/* Wooden 3D Submit Button */}
            <button
              type="submit"
              disabled={submitting || !isValid}
              className="w-full bg-[linear-gradient(180deg,#f0a345_0%,#d27b22_100%)] hover:brightness-110 text-[#3b2313] font-extrabold py-4 sm:py-5 rounded-2xl text-lg sm:text-xl transition-all flex items-center justify-center gap-3 shadow-[0_6px_0_#9a5310,0_10px_20px_rgba(0,0,0,0.3)] active:translate-y-1 active:shadow-[0_2px_0_#9a5310] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-2xl">progress_activity</span>
                  <span>Mengirim Laporan...</span>
                </>
              ) : (
                <>
                  <span>{isRegisteredStudent ? 'Kirim Laporan ke Guru' : 'Simpan Jawaban (Mode Latihan)'}</span>
                  <span className="material-symbols-outlined text-2xl">send</span>
                </>
              )}
            </button>
          </form>
        ) : submitted ? (
          <div className="bg-white/10 backdrop-blur-xl border border-[#6bff8f]/40 rounded-3xl p-8 sm:p-10 text-center shadow-2xl text-white">
            <div className="w-20 h-20 rounded-full bg-[#006e2f]/60 border-2 border-[#6bff8f] text-[#6bff8f] flex items-center justify-center mx-auto mb-5 shadow-[0_0_30px_rgba(107,255,143,0.4)]">
              <span className="material-symbols-outlined text-5xl">task_alt</span>
            </div>
            <h3 className="font-[family-name:var(--font-outfit)] text-2xl sm:text-3xl font-extrabold mb-3 text-white">
              {isRegisteredStudent ? 'Laporan Kasus Berhasil Terkirim!' : 'Jawaban Mode Latihan Tersimpan'}
            </h3>
            <p className="text-white/80 text-sm sm:text-base mb-8 max-w-lg mx-auto leading-relaxed">
              {isRegisteredStudent
                ? 'Seluruh bukti investigasi dan jawaban LKPD 4-mu telah tercatat di dashboard guru. Langkah terakhir adalah mengikrarkan komitmen ekologimu!'
                : 'Jawabanmu telah tersimpan di browser ini. Mari lanjutkan ke Tahap 6 untuk mengikrarkan Sumpah Komitmen!'}
            </p>

            <button
              onClick={() => router.push('/journey/tahap-6')}
              className="w-full bg-[linear-gradient(180deg,#f0a345_0%,#d27b22_100%)] hover:brightness-110 text-[#3b2313] font-extrabold py-4 sm:py-5 rounded-2xl text-lg sm:text-xl transition-all flex items-center justify-center gap-3 shadow-[0_6px_0_#9a5310,0_10px_20px_rgba(0,0,0,0.3)] active:translate-y-1 active:shadow-[0_2px_0_#9a5310]"
            >
              <span>Lanjut ke Tahap 6 (Misi Sumpah Komitmen)</span>
              <span className="material-symbols-outlined text-2xl">arrow_forward</span>
            </button>
          </div>
        ) : null}
      </div>

      <StageCompletionModal
        isOpen={showCompletionModal}
        stageNumber={5}
        stageTitle="Papan Bukti & LKPD 4"
        xpEarned={100}
        nextStagePath="/journey/tahap-6"
        onClose={() => setShowCompletionModal(false)}
      />
    </div>
  );
}

'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/authStore';
import { useJourneyStore } from '@/lib/journeyStore';
import EvidenceBoard from '@/components/stages/EvidenceBoard';

export default function Tahap5() {
  const router = useRouter();
  const { currentUser } = useAuthStore();
  const { completeStage, setLkpdAnswer, lkpdAnswers, studentName, studentClass, sessionId, totalParticles, selectedFoods, mostDangerousOrgan, quizCorrect, quizWrong } = useJourneyStore();
  const [lkpd4, setLkpd4] = useState(lkpdAnswers.lkpd4);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [boardUnlocked, setBoardUnlocked] = useState(false);
  const [error, setError] = useState('');
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
    <div className="min-h-[calc(100vh-88px)] bg-[#f7f9fb]">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header removed as requested by user */}

        {/* Data Injection: Clues Area */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white border border-[#bec8d2] rounded-xl p-3 shadow-sm flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-[#006591] text-2xl mb-1">blur_on</span>
            <span className="text-[10px] font-bold text-[#6e7881] uppercase tracking-wider">Total Partikel</span>
            <span className="font-bold text-[#191c1e]">{totalParticles.toLocaleString('id-ID')}</span>
          </div>
          <div className="bg-white border border-[#bec8d2] rounded-xl p-3 shadow-sm flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-[#ba1a1a] text-2xl mb-1">warning</span>
            <span className="text-[10px] font-bold text-[#6e7881] uppercase tracking-wider">Organ Target</span>
            <span className="font-bold text-[#191c1e] text-xs">{mostDangerousOrgan || 'Belum dipilih'}</span>
          </div>
          <div className="bg-white border border-[#bec8d2] rounded-xl p-3 shadow-sm flex flex-col items-center justify-center text-center col-span-2">
            <span className="material-symbols-outlined text-[#006e2f] text-2xl mb-1">restaurant</span>
            <span className="text-[10px] font-bold text-[#6e7881] uppercase tracking-wider">Makanan Terkontaminasi</span>
            <span className="font-bold text-[#191c1e] text-xs">{selectedFoods.map(f => f.name).join(', ') || 'Belum dipilih'}</span>
          </div>
        </div>

        {/* Evidence Board (Interactive Drag & Drop) */}
        {!submitted && (
          <div className="mb-8">
            <EvidenceBoard onUnlock={() => setBoardUnlocked(true)} />
          </div>
        )}

        {/* LKPD 4 — HOTS (Case Summary) */}
        {boardUnlocked && !submitted ? (
          <form onSubmit={handleSubmit}>
            <div className="bg-white border border-[#006591]/20 rounded-2xl p-6 mb-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="bg-[#006591] text-white text-xs font-bold px-2 py-0.5 rounded font-[family-name:var(--font-mono)]">CASE SUMMARY</span>
                <span className="text-xs text-[#3e4850]">Kesimpulan Detektif</span>
              </div>
              <div className="bg-[#ffdf9a]/20 border-l-4 border-[#c39400] rounded-xl p-4 mb-4">
                <p className="text-[#191c1e] text-sm leading-relaxed italic">
                  &ldquo;Kamu adalah pelaku SEKALIGUS korban akhir dari pencemaran plastik ini. Jelaskan maksud pernyataan tersebut berdasarkan seluruh perjalanan yang sudah kamu ikuti!&rdquo;
                </p>
              </div>
              <textarea value={lkpd4} onChange={e => setLkpd4(e.target.value)}
                className="w-full bg-[#f7f9fb] border border-[#bec8d2] rounded-xl p-4 text-[#191c1e] placeholder-[#6e7881] text-sm resize-none h-40 focus:outline-none focus:border-[#006591] focus:ring-1 focus:ring-[#006591] transition-colors"
                placeholder="Manusia disebut pelaku karena secara sadar memproduksi dan membuang plastik ke lingkungan. Namun pada saat yang sama, melalui rantai makanan yang sudah tercemar..." />
              <div className="flex justify-between items-center mt-2">
                <p className={`text-xs font-[family-name:var(--font-mono)] ${isValid ? 'text-[#006e2f]' : 'text-[#6e7881]'}`}>
                  {wordCount} kata {!isValid && `(minimal 3 kata)`}
                </p>
                {isValid && <span className="text-[#006e2f] text-xs font-semibold">✓ Cukup</span>}
              </div>
            </div>

            {error && <p className="text-[#ba1a1a] text-sm mb-4">{error}</p>}

            <button type="submit" disabled={submitting || !isValid}
              className="w-full bg-[#006591] hover:bg-[#004c6e] text-white font-bold py-4 rounded-xl text-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-[#006591]/20">
              {submitting ? (
                <><span className="material-symbols-outlined animate-spin">progress_activity</span> Mengirim...</>
              ) : (
                <>{isRegisteredStudent ? 'Kirim ke Guru' : 'Simpan Mode Latihan'} <span className="material-symbols-outlined">send</span></>
              )}
            </button>
          </form>
        ) : submitted ? (
          <div className="bg-white border border-[#006e2f]/20 rounded-2xl p-10 text-center shadow-sm">
            <span className="material-symbols-outlined text-[#006e2f] text-7xl mb-4 block">task_alt</span>
            <h3 className="font-[family-name:var(--font-outfit)] text-2xl font-bold mb-2 text-[#191c1e]">{isRegisteredStudent ? 'Laporan Terkirim!' : 'Mode Latihan Tersimpan'}</h3>
            <p className="text-[#3e4850] text-sm mb-8 leading-relaxed">
              {isRegisteredStudent
                ? 'Seluruh jawaban LKPD-mu telah tersimpan di sistem guru. Lanjutkan ke komitmen ekologi.'
                : 'Jawabanmu tersimpan di perangkat ini saja dan tidak masuk penilaian guru. Lanjutkan ke komitmen ekologi.'}
            </p>
            <button onClick={() => router.push('/journey/tahap-6')}
              className="w-full bg-[#006e2f] hover:bg-[#005321] text-white font-bold py-4 rounded-xl text-lg transition-colors flex items-center justify-center gap-2 shadow-md shadow-[#006e2f]/20">
              Lanjut ke Misi Komitmen <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

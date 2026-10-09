'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useJourneyStore } from '@/lib/journeyStore';
import { useAuthStore } from '@/lib/authStore';
import BottomNav from '@/components/BottomNav';
import MikaMascot from '@/components/MikaMascot';
import StageCompletionModal from '@/components/ui/StageCompletionModal';

interface LkpdDef {
  id: string;
  num: string;
  icon: string;
  title: string;
  tahap: string;
  tahapNum: number;
  type: 'Pilihan Ganda' | 'Esai';
  color: string;
  bgLight: string;
  question: string;
  options: { id: string; text: string }[];
  correct: string;
  explanation: string;
}

const LKPD_DEFS: LkpdDef[] = [
  {
    id: 'lkpd1',
    num: '1',
    icon: '☀️',
    title: 'Proses Pelapukan Plastik',
    tahap: 'Tahap 2',
    tahapNum: 2,
    type: 'Pilihan Ganda',
    color: '#7dd3fc',
    bgLight: 'rgba(125, 211, 252, 0.15)',
    question: 'Dua proses utama yang menyebabkan botol plastik utuh berubah menjadi partikel mikroplastik di laut adalah...',
    options: [
      { id: 'a', text: 'Fotodegradasi oleh sinar UV matahari + Abrasi mekanis oleh ombak & angin' },
      { id: 'b', text: 'Pembakaran oleh panas + Biodegradasi alami oleh bakteri laut' },
      { id: 'c', text: 'Hidrolisis kimia oleh air hujan + Oksidasi oleh uap air' },
      { id: 'd', text: 'Fermentasi biologis + Pembekuan akibat suhu dingin dasar laut' },
    ],
    correct: 'a',
    explanation: 'Sinar UV matahari melemahkan ikatan polimer plastik (fotodegradasi), kemudian hantaman keras ombak memecahnya menjadi mikroplastik sekunder (<5mm).',
  },
  {
    id: 'lkpd2',
    num: '2',
    icon: '🍱',
    title: 'Kontaminasi Pangan Laut',
    tahap: 'Tahap 3',
    tahapNum: 3,
    type: 'Pilihan Ganda',
    color: '#ff8c8c',
    bgLight: 'rgba(255, 140, 140, 0.15)',
    question: 'Bagaimana jalur utama mikroplastik masuk ke dalam makanan yang kita konsumsi harian?',
    options: [
      { id: 'a', text: 'Rantai makanan laut (bioakumulasi kerang/ikan) + peluruhan wadah kemasan plastik panas' },
      { id: 'b', text: 'Hanya melayang melalui udara saat malam hari' },
      { id: 'c', text: 'Melalui penyerapan pori-pori kulit saat memegang makanan' },
      { id: 'd', text: 'Proses memasak dengan api kompor gas' },
    ],
    correct: 'a',
    explanation: 'Hewan laut seperti kerang menyaring air tercemar (bioakumulasi), sementara wadah plastik/styrofoam meluruhkan polimer ketika terkena makanan/minuman panas.',
  },
  {
    id: 'lkpd3q1',
    num: '3A',
    icon: '🧪',
    title: 'Asam Lambung (HCl) & Plastik',
    tahap: 'Tahap 4',
    tahapNum: 4,
    type: 'Esai',
    color: '#ffdf9a',
    bgLight: 'rgba(255, 223, 154, 0.15)',
    question: 'Mengapa asam lambung (HCl) gagal mencerna partikel plastik di dalam perut manusia?',
    options: [],
    correct: '',
    explanation: 'Plastik tersusun atas rantai polimer sintetis dengan ikatan C-C yang sangat kuat. Enzim pencernaan manusia tidak memiliki Katalis kimia yang mampu memutus ikatan polimer sintetis tersebut.',
  },
  {
    id: 'lkpd3q2',
    num: '3B',
    icon: '🫀',
    title: 'Organ Pencernaan Kritis',
    tahap: 'Tahap 4',
    tahapNum: 4,
    type: 'Esai',
    color: '#6bff8f',
    bgLight: 'rgba(107, 255, 143, 0.15)',
    question: 'Organ pencernaan mana yang paling rentan terhadap penumpukan mikroplastik dan mengapa?',
    options: [],
    correct: '',
    explanation: 'Usus halus adalah organ paling kritis karena vili usus halus menyerap nutrisi. Partikel mikroplastik berukuran <10μm dapat menembus epitel vili usus dan masuk ke dalam pembuluh darah.',
  },
  {
    id: 'lkpd4',
    num: '4',
    icon: '🕵️',
    title: 'Sintesis HOTS: Pelaku & Korban',
    tahap: 'Tahap 5',
    tahapNum: 5,
    type: 'Esai',
    color: '#c084fc',
    bgLight: 'rgba(192, 132, 252, 0.15)',
    question: 'Jelaskan maksud pernyataan: "Manusia adalah PELAKU sekaligus KORBAN AKHIR dari pencemaran plastik ini"!',
    options: [],
    correct: '',
    explanation: 'Manusia memproduksi dan membuang limbah plastik ke laut (Pelaku), tetapi melalui pelapukan & rantai pangan, mikroplastik tersebut masuk kembali ke organ pencernaan manusia (Korban).',
  },
];

export default function ELKPDPage() {
  const { lkpdAnswers, setLkpdAnswer, completeStage, studentName, studentClass, totalParticles, selectedFoods, mostDangerousOrgan } = useJourneyStore();
  const { currentUser } = useAuthStore();
  const [expanded, setExpanded] = useState<string | null>('lkpd1');
  const [practiceAnswer, setPracticeAnswer] = useState<Record<string, string>>({});
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  const answered = {
    lkpd1: lkpdAnswers.lkpd1,
    lkpd2: lkpdAnswers.lkpd2,
    lkpd3q1: lkpdAnswers.lkpd3q1,
    lkpd3q2: lkpdAnswers.lkpd3q2,
    lkpd4: lkpdAnswers.lkpd4,
  } as Record<string, string>;

  const answeredCount = Object.values(answered).filter((v) => v && v.length > 0).length;
  const progressPct = Math.round((answeredCount / LKPD_DEFS.length) * 100);

  function handleSavePractice(lkpdId: string, val: string, tahapNum: number) {
    setLkpdAnswer(lkpdId as any, val);
    setPracticeAnswer((prev) => ({ ...prev, [lkpdId]: val }));
    completeStage(tahapNum);
  }

  async function downloadLogbookPDF() {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF();

    doc.setFillColor(8, 59, 84);
    doc.rect(0, 0, 210, 38, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('JURNAL MISI LKPD DIGITAL', 15, 18);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 255, 143);
    doc.text(`Nama: ${studentName || 'Siswa IPA'}   Kelas: ${studentClass || 'VIII'}   Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 15, 28);

    let y = 48;
    LKPD_DEFS.forEach((l) => {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 101, 145);
      doc.text(`LKPD ${l.num} — ${l.title} (${l.tahap})`, 15, y);
      y += 6;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      const qLines = doc.splitTextToSize(`Pertanyaan: ${l.question}`, 180);
      doc.text(qLines, 15, y);
      y += qLines.length * 4.5 + 2;

      const userAns = answered[l.id] || '(Belum diisi)';
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 110, 47);
      const aLines = doc.splitTextToSize(`Jawaban Siswa: ${userAns}`, 180);
      doc.text(aLines, 15, y);
      y += aLines.length * 4.5 + 8;
    });

    const filename = `jurnal-lkpd-${(studentName || 'siswa').replace(/\s+/g, '_')}.pdf`;
    try {
      doc.save(filename);
    } catch {
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }

  return (
    <div className="min-h-screen pt-24 sm:pt-28 pb-24 bg-[linear-gradient(160deg,#083b54_0%,#006591_45%,#004c6e_100%)] text-white relative overflow-x-hidden">
      {/* Background patterns */}
      <div className="absolute inset-0 adventure-map opacity-10 pointer-events-none" />
      <div className="absolute top-10 left-10 w-96 h-96 bg-[#6bff8f]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 relative z-10">
        {/* Header Title */}
        <div className="text-center mb-6">
          <span className="bg-[#6bff8f]/20 text-[#6bff8f] text-[10px] sm:text-xs font-extrabold px-3 py-1 rounded-full border border-[#6bff8f]/40 font-[family-name:var(--font-mono)] uppercase tracking-wider inline-block mb-2">
            PORTOFOLIO JURNAL INVESTIGASI SISWA
          </span>
          <h1 className="font-[family-name:var(--font-outfit)] text-3xl sm:text-4xl font-extrabold text-white leading-tight">
            Jurnal Misi LKPD Digital
          </h1>
          <p className="text-white/80 text-xs sm:text-sm mt-1.5 max-w-lg mx-auto leading-relaxed">
            Buku catatan eksplorasi sains terintegrasi. Jawabanmu tersimpan otomatis dari setiap tahap perjalanan dan dapat diulas kembali kapan saja.
          </p>
        </div>

        {/* Hero Bento Status Bar */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-5 sm:p-6 mb-7 shadow-2xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#006e2f]/50 border border-[#6bff8f]/40 text-[#6bff8f] flex items-center justify-center text-2xl font-bold">
                <span className="material-symbols-outlined text-3xl">assignment_turned_in</span>
              </div>
              <div>
                <p className="text-[10px] text-white/60 font-[family-name:var(--font-mono)] uppercase tracking-wider">Progress Lembar Kerja</p>
                <p className="font-[family-name:var(--font-outfit)] font-black text-xl text-white">
                  {answeredCount} dari {LKPD_DEFS.length} LKPD Terisi <span className="text-xs text-[#6bff8f] font-bold">({progressPct}%)</span>
                </p>
              </div>
            </div>

            <button
              onClick={downloadLogbookPDF}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm"
            >
              <span className="material-symbols-outlined text-lg">download</span>
              <span>Cetak Catatan LKPD</span>
            </button>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-black/40 rounded-full h-3 overflow-hidden p-0.5 border border-white/10 mb-4">
            <div className="h-full bg-gradient-to-r from-[#6bff8f] to-[#7dd3fc] rounded-full transition-all duration-700 shadow-[0_0_12px_rgba(107,255,143,0.5)]" style={{ width: `${progressPct}%` }} />
          </div>

          {/* LKPD Status Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
            {LKPD_DEFS.map((l) => {
              const isDone = !!(answered[l.id] && answered[l.id].length > 0);
              return (
                <div
                  key={l.id}
                  onClick={() => setExpanded(l.id)}
                  className={`cursor-pointer p-2 rounded-xl border text-xs font-[family-name:var(--font-mono)] font-bold transition-all ${
                    isDone
                      ? 'bg-[#006e2f]/50 border-[#6bff8f] text-[#6bff8f]'
                      : 'bg-black/30 border-white/15 text-white/50 hover:border-white/30'
                  }`}
                >
                  {isDone ? '✓' : '○'} LKPD {l.num}
                </div>
              );
            })}
          </div>
        </div>

        {/* Mascot Hint Toast */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 mb-6 flex items-center gap-3">
          <MikaMascot size={65} message="Setiap LKPD terisi otomatis saat kamu bereksperimen di ekspedisi. Kamu juga bisa latihan jawab langsung di bawah!" />
          <div className="flex-1">
            <p className="text-xs font-bold text-[#ffdf9a] font-[family-name:var(--font-mono)] uppercase">Petualangan Belajar Interactive</p>
            <p className="text-xs text-white/80 leading-relaxed mt-0.5">
              Klik kartu LKPD mana saja untuk membaca kunci pembahasan ilmiah atau mencoba latihan simulasi mandiri.
            </p>
          </div>
        </div>

        {/* Accordion LKPD Cards List */}
        <div className="space-y-4 mb-10">
          {LKPD_DEFS.map((lkpd) => {
            const userAnswer = answered[lkpd.id] || practiceAnswer[lkpd.id] || '';
            const hasAnswer = userAnswer.length > 0;
            const isCorrect = lkpd.type === 'Pilihan Ganda' ? userAnswer === lkpd.correct : null;
            const isOpen = expanded === lkpd.id;
            const matchedOption = lkpd.options.find((o) => o.id === userAnswer);

            return (
              <div
                key={lkpd.id}
                className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl overflow-hidden shadow-xl transition-all"
                style={{ borderLeft: `5px solid ${hasAnswer ? '#6bff8f' : lkpd.color}` }}
              >
                {/* Card Header Button */}
                <button
                  onClick={() => setExpanded(isOpen ? null : lkpd.id)}
                  className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-white/5 transition-colors gap-3"
                >
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 border border-white/20"
                      style={{ backgroundColor: lkpd.bgLight }}
                    >
                      {hasAnswer ? '✅' : lkpd.icon}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span
                          className="text-[10px] font-[family-name:var(--font-mono)] font-bold px-2 py-0.5 rounded border border-white/20"
                          style={{ backgroundColor: lkpd.bgLight, color: lkpd.color }}
                        >
                          LKPD {lkpd.num}
                        </span>
                        <span className="text-[10px] text-white/70 font-[family-name:var(--font-mono)]">{lkpd.tahap}</span>
                        <span className="text-[10px] bg-white/10 text-white px-2 py-0.5 rounded-full border border-white/15 font-bold">
                          {lkpd.type}
                        </span>
                      </div>
                      <h3 className="font-[family-name:var(--font-outfit)] text-base sm:text-lg font-extrabold text-white truncate">
                        {lkpd.title}
                      </h3>
                      <p className="text-white/70 text-xs truncate mt-0.5">
                        {hasAnswer
                          ? lkpd.type === 'Pilihan Ganda'
                            ? `Jawaban: Pilihan ${userAnswer.toUpperCase()} — ${isCorrect ? '✓ Benar' : '✗ Perlu Ditinjau'}`
                            : `Terisi (${userAnswer.length} karakter)`
                          : `Belum diisi — Ketuk untuk menjawab / buka ${lkpd.tahap}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {hasAnswer && (
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-extrabold border flex items-center gap-1 ${
                          isCorrect === true
                            ? 'bg-[#006e2f]/60 border-[#6bff8f] text-[#6bff8f]'
                            : isCorrect === false
                            ? 'bg-[#ba1a1a]/60 border-[#ff8c8c] text-[#ff8c8c]'
                            : 'bg-[#006591]/60 border-[#7dd3fc] text-[#7dd3fc]'
                        }`}
                      >
                        {isCorrect === true ? '✓ Selesai' : isCorrect === false ? '✗ Ulas' : '✓ Terisi'}
                      </span>
                    )}
                    <span
                      className="material-symbols-outlined text-white/60 transition-transform duration-300"
                      style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }}
                    >
                      expand_more
                    </span>
                  </div>
                </button>

                {/* Expanded Card Body */}
                {isOpen && (
                  <div className="p-5 sm:p-6 border-t border-white/15 bg-black/20 space-y-4">
                    {/* Question Statement */}
                    <div className="bg-white/5 border border-white/15 rounded-2xl p-4">
                      <p className="text-[10px] font-[family-name:var(--font-mono)] text-[#ffdf9a] uppercase tracking-wider mb-1 font-bold">
                        Pertanyaan Eksplorasi:
                      </p>
                      <p className="text-white text-xs sm:text-sm font-semibold leading-relaxed">{lkpd.question}</p>
                    </div>

                    {/* Mode Terjawab */}
                    {hasAnswer ? (
                      <div className="space-y-3">
                        <div
                          className={`p-4 rounded-2xl border ${
                            isCorrect === true
                              ? 'bg-[#006e2f]/30 border-[#6bff8f]/50'
                              : isCorrect === false
                              ? 'bg-[#ba1a1a]/30 border-[#ff8c8c]/50'
                              : 'bg-[#006591]/30 border-[#7dd3fc]/50'
                          }`}
                        >
                          <p className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider font-bold mb-1.5" style={{ color: lkpd.color }}>
                            Jawaban Siswa:
                          </p>
                          {lkpd.type === 'Pilihan Ganda' ? (
                            <div className="flex items-start gap-2 text-xs sm:text-sm text-white">
                              <span className="font-extrabold text-[#6bff8f]">[{userAnswer.toUpperCase()}]</span>
                              <span>{matchedOption?.text}</span>
                            </div>
                          ) : (
                            <p className="text-xs sm:text-sm text-white leading-relaxed italic">&ldquo;{userAnswer}&rdquo;</p>
                          )}
                        </div>

                        {/* Explanation Box */}
                        <div className="bg-white/10 border-l-4 border-[#6bff8f] rounded-2xl p-4 text-xs text-white/90 leading-relaxed">
                          <p className="font-bold text-[#6bff8f] text-[10px] font-[family-name:var(--font-mono)] uppercase mb-1">
                            💡 Pembahasan &amp; Konsep Sains:
                          </p>
                          <p>{lkpd.explanation}</p>
                        </div>
                      </div>
                    ) : (
                      /* Mode Latihan Inline Mandiri */
                      <div className="bg-black/30 border border-white/15 rounded-2xl p-4 sm:p-5">
                        <p className="text-xs font-bold text-[#ffdf9a] mb-3 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-base">edit_note</span>
                          <span>Isi LKPD Langsung di Sini (Mode Latihan):</span>
                        </p>

                        {lkpd.type === 'Pilihan Ganda' ? (
                          <div className="space-y-2 mb-4">
                            {lkpd.options.map((opt) => (
                              <button
                                key={opt.id}
                                onClick={() => handleSavePractice(lkpd.id, opt.id, lkpd.tahapNum)}
                                className="w-full text-left p-3 rounded-xl border border-white/20 bg-white/5 hover:bg-[#006591] hover:border-[#6bff8f] text-xs sm:text-sm text-white transition-all flex items-center gap-3"
                              >
                                <span className="w-6 h-6 rounded-full bg-white/10 border border-white/30 flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
                                  {opt.id}
                                </span>
                                <span>{opt.text}</span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <textarea
                              rows={3}
                              placeholder="Tuliskan jawaban analisismu di sini..."
                              value={practiceAnswer[lkpd.id] || ''}
                              onChange={(e) => setPracticeAnswer((prev) => ({ ...prev, [lkpd.id]: e.target.value }))}
                              className="w-full p-3.5 bg-black/40 border border-white/20 rounded-xl text-xs sm:text-sm text-white outline-none focus:border-[#6bff8f] transition-all resize-none"
                            />
                            <button
                              onClick={() => {
                                const val = practiceAnswer[lkpd.id] || '';
                                if (val.trim().length >= 3) {
                                  handleSavePractice(lkpd.id, val, lkpd.tahapNum);
                                }
                              }}
                              disabled={!(practiceAnswer[lkpd.id] || '').trim()}
                              className="w-full bg-[linear-gradient(180deg,#f0a345_0%,#d27b22_100%)] text-[#3b2313] font-extrabold py-3 rounded-xl text-xs sm:text-sm shadow-md transition-all active:scale-95 disabled:opacity-40"
                            >
                              Simpan Jawaban LKPD {lkpd.num}
                            </button>
                          </div>
                        )}

                        <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-white/70">
                          <span>Atau jalani pengalaman simulasi penuh di peta ekspedisi:</span>
                          <Link
                            href={`/journey/tahap-${lkpd.tahapNum}`}
                            className="text-[#6bff8f] font-bold hover:underline flex items-center gap-1"
                          >
                            <span>Buka {lkpd.tahap}</span>
                            <span className="material-symbols-outlined text-xs">arrow_forward</span>
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Global CTA Navigation */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-2xl">
          <div>
            <h3 className="font-[family-name:var(--font-outfit)] font-extrabold text-lg text-white">
              Siap Melanjutkan Ekspedisi?
            </h3>
            <p className="text-white/80 text-xs mt-0.5">
              Lanjutkan perjalanan 6 tahap untuk mengumpulkan seluruh bukti dan mengunduh Sertifikat Duta Ekologi.
            </p>
          </div>

          <Link
            href="/journey"
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-[linear-gradient(180deg,#f0a345_0%,#d27b22_100%)] text-[#3b2313] font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all shrink-0"
          >
            <span>Kembali ke Peta Ekspedisi</span>
            <span className="material-symbols-outlined text-lg">map</span>
          </Link>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

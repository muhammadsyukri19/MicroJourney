'use client';
import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useJourneyStore } from '@/lib/journeyStore';
import MikaMascot from '@/components/MikaMascot';

const QUICK_PLEDGES = [
  'Bawa tumbler sendiri ke sekolah setiap hari',
  'Tolak kantong plastik di kantin sekolah',
  'Ingatkan teman untuk kurangi plastik sekali pakai',
  'Tidak beli minuman kemasan plastik selama seminggu',
];

const MATCH_PAIRS = [
  { id: 'siswa', role: '🧑‍🎓 Siswa / Pelajar', task: 'Membawa tumbler & menolak sedotan plastik di kantin' },
  { id: 'pemerintah', role: '🏛️ Pemerintah', task: 'Membuat peraturan larangan penggunaan plastik sekali pakai' },
  { id: 'pabrik', role: '🏭 Pabrik / Produsen', task: 'Menggunakan bahan kemasan ramah lingkungan (bukan styrofoam)' },
  { id: 'masyarakat', role: '👨‍👩‍👧‍👦 Orang Tua / Keluarga', task: 'Selalu membawa tas belanja kain sendiri saat ke pasar' },
];

function MatchingGame({ onComplete }: { onComplete: () => void }) {
  const [roles, setRoles] = useState(MATCH_PAIRS);
  const [tasks, setTasks] = useState(MATCH_PAIRS);

  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [errorPair, setErrorPair] = useState<{role: string, task: string} | null>(null);

  useEffect(() => {
    setRoles([...MATCH_PAIRS].sort(() => Math.random() - 0.5));
    setTasks([...MATCH_PAIRS].sort(() => Math.random() - 0.5));
  }, []);

  const checkMatch = (rId: string, tId: string) => {
    if (rId === tId) {
      const newMatched = [...matched, rId];
      setMatched(newMatched);
      setSelectedRole(null);
      setSelectedTask(null);
      if (newMatched.length === MATCH_PAIRS.length) {
        setTimeout(onComplete, 1000);
      }
    } else {
      setErrorPair({ role: rId, task: tId });
      setTimeout(() => {
        setErrorPair(null);
        setSelectedRole(null);
        setSelectedTask(null);
      }, 800);
    }
  };

  const handleRoleClick = (id: string) => {
    if (matched.includes(id)) return;
    if (selectedRole === id) { setSelectedRole(null); return; } // toggle off
    if (selectedTask) checkMatch(id, selectedTask);
    else setSelectedRole(id);
  };

  const handleTaskClick = (id: string) => {
    if (matched.includes(id)) return;
    if (selectedTask === id) { setSelectedTask(null); return; } // toggle off
    if (selectedRole) checkMatch(selectedRole, id);
    else setSelectedTask(id);
  };

  return (
    <div className="bg-white rounded-[32px] p-6 shadow-sm border border-[#bec8d2] text-center mb-10">
      <h2 className="text-2xl font-extrabold text-[#083b54] mb-2 font-[family-name:var(--font-outfit)]">Siapa Bertanggung Jawab?</h2>
      <p className="text-sm text-[#3e4850] mb-8">Sebelum membuat janji komitmen, pasangkan <b>Tokoh</b> dengan <b>Tugas Lingkungannya</b> yang tepat!</p>

      <div className="grid grid-cols-2 gap-3 sm:gap-6 text-left">
        {/* Kolom Peran */}
        <div className="flex flex-col gap-2 sm:gap-3">
          <h3 className="font-bold text-[#006591] mb-1 sm:mb-2 text-[10px] sm:text-sm uppercase tracking-wider text-center">Tokoh</h3>
          {roles.map(r => (
            <button 
               key={r.id} 
               onClick={() => handleRoleClick(r.id)}
               className={`p-2 sm:p-3 rounded-lg sm:rounded-xl border-2 transition-all font-bold text-[#3e4850] text-xs sm:text-sm flex items-center justify-center min-h-[60px] sm:min-h-[80px] text-center ${
                 matched.includes(r.id) ? 'bg-[#c8e6c9] border-[#006e2f] opacity-50 cursor-not-allowed scale-95' :
                 errorPair?.role === r.id ? 'bg-[#ffcdd2] border-[#ba1a1a] animate-shake text-[#ba1a1a]' :
                 selectedRole === r.id ? 'bg-[#c9e6ff] border-[#006591] shadow-md scale-[1.02] text-[#006591]' :
                 'bg-[#f7f9fb] border-[#bec8d2] hover:border-[#006591]/50 hover:bg-white'
               }`}
            >
              {r.role}
            </button>
          ))}
        </div>

        {/* Kolom Tugas */}
        <div className="flex flex-col gap-2 sm:gap-3">
          <h3 className="font-bold text-[#006e2f] mb-1 sm:mb-2 text-[10px] sm:text-sm uppercase tracking-wider text-center">Tugas</h3>
          {tasks.map(t => (
            <button 
               key={t.id} 
               onClick={() => handleTaskClick(t.id)}
               className={`p-2 sm:p-3 rounded-lg sm:rounded-xl border-2 transition-all text-[10px] sm:text-sm text-center sm:text-left leading-tight sm:leading-relaxed flex items-center min-h-[60px] sm:min-h-[80px] ${
                 matched.includes(t.id) ? 'bg-[#c8e6c9] border-[#006e2f] opacity-50 cursor-not-allowed scale-95' :
                 errorPair?.task === t.id ? 'bg-[#ffcdd2] border-[#ba1a1a] animate-shake text-[#ba1a1a]' :
                 selectedTask === t.id ? 'bg-[#c9e6ff] border-[#006591] shadow-md scale-[1.02] text-[#006591] font-semibold' :
                 'bg-white border-[#bec8d2] hover:border-[#006591]/50 text-[#3e4850]'
               }`}
            >
              {t.task}
            </button>
          ))}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake { animation: shake 0.3s ease-in-out; }
      `}} />
    </div>
  );
}

export default function Tahap6() {
  const router = useRouter();
  const { completeStage, setLkpdAnswer, lkpdAnswers, studentName, studentClass } = useJourneyStore();
  const [commitment, setCommitment] = useState(lkpdAnswers.commitment);
  const [selectedPledges, setSelectedPledges] = useState<Set<string>>(new Set());
  const [pdfDone, setPdfDone] = useState(false);
  const [gameDone, setGameDone] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const drawing = useRef(false);
  const [hasSig, setHasSig] = useState(false);
  const isReady = commitment.trim().length > 10 && hasSig && gameDone;

  function togglePledge(p: string) {
    const s = new Set(selectedPledges);
    if (s.has(p)) { s.delete(p); setCommitment(prev => prev.replace('\n' + p, '').replace(p, '')); }
    else { s.add(p); setCommitment(prev => prev ? prev + '\n' + p : p); }
    setSelectedPledges(s);
  }

  function getPos(e: React.MouseEvent | React.TouchEvent, cv: HTMLCanvasElement) {
    const r = cv.getBoundingClientRect();
    if ('touches' in e) return { x: e.touches[0].clientX - r.left, y: e.touches[0].clientY - r.top };
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault(); drawing.current = true; lastPos.current = getPos(e, canvasRef.current!);
  }
  function draw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    if (!drawing.current || !canvasRef.current || !lastPos.current) return;
    const ctx = canvasRef.current.getContext('2d')!;
    const pos = getPos(e, canvasRef.current);
    ctx.beginPath(); ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y); ctx.strokeStyle = '#006591'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.stroke();
    lastPos.current = pos; setHasSig(true);
  }
  function stopDraw() { drawing.current = false; lastPos.current = null; }
  function clearSig() {
    const cv = canvasRef.current!; const ctx = cv.getContext('2d')!;
    ctx.clearRect(0, 0, cv.width, cv.height); setHasSig(false);
  }

  async function generatePDF() {
    setLkpdAnswer('commitment', commitment);
    completeStage(6);

    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF();

    // Header block
    doc.setFillColor(0, 101, 145); // #006591 primary
    doc.rect(0, 0, 210, 42, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22); doc.setFont('helvetica', 'bold');
    doc.text('MICROJOURNEY AR', 15, 18);
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.setTextColor(201, 230, 255); // primary-fixed
    doc.text('Rapor Jurnal Investigasi Mikroplastik — IPA Kelas VIII / Kurikulum Merdeka', 15, 28);
    doc.text(`Nama: ${studentName || '-'}    Kelas: ${studentClass || '-'}    Tanggal: ${new Date().toLocaleDateString('id-ID', { day:'numeric',month:'long',year:'numeric' })}`, 15, 36);

    doc.setTextColor(0, 0, 0);

    const { totalParticles, selectedFoods, mostDangerousOrgan, lkpdAnswers: answers } = useJourneyStore.getState();
    let y = 52;
    doc.setFontSize(13); doc.setFont('helvetica', 'bold');
    doc.setTextColor(186, 26, 26); // error color
    doc.text('HASIL EKSPLORASI', 15, y); y += 8;
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(0);
    doc.text(`Total mikroplastik tertelan hari ini: ${totalParticles.toLocaleString('id-ID')} partikel`, 15, y); y += 6;
    doc.text(`Organ paling terdampak (menurut siswa): ${mostDangerousOrgan || 'Usus Halus'}`, 15, y); y += 6;
    doc.text(`Makanan yang dianalisis: ${selectedFoods.map(f=>f.name).join(', ') || '-'}`, 15, y); y += 12;

    const sections = [
      { label: 'LKPD 1 — Proses Pelapukan Plastik', text: answers.lkpd1 },
      { label: 'LKPD 2 — Kontaminasi Pangan', text: answers.lkpd2 },
      { label: 'LKPD 3 Q1 — Mengapa HCl Gagal Mencerna Plastik', text: answers.lkpd3q1 },
      { label: 'LKPD 3 Q2 — Organ Paling Berbahaya', text: answers.lkpd3q2 },
      { label: 'LKPD 4 — Sintesis (HOTS)', text: answers.lkpd4 },
    ];

    sections.forEach(s => {
      if (y > 255) { doc.addPage(); y = 20; }
      doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 101, 145);
      doc.text(s.label, 15, y); y += 6;
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(0);
      const lines = doc.splitTextToSize(s.text || '(tidak diisi)', 180);
      doc.text(lines, 15, y); y += lines.length * 5 + 6;
    });

    // Commitment
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 110, 47);
    doc.text('KOMITMEN EKOLOGI', 15, y); y += 7;
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(0);
    const clines = doc.splitTextToSize(commitment || '-', 180);
    doc.text(clines, 15, y); y += clines.length * 5 + 8;

    // Signature
    if (canvasRef.current && hasSig) {
      doc.text('Tanda Tangan Digital:', 15, y); y += 5;
      doc.addImage(canvasRef.current.toDataURL('image/png'), 'PNG', 15, y, 70, 25); y += 30;
    }

    doc.setFontSize(8); doc.setTextColor(110, 120, 129);
    doc.text('MicroJourney AR · LIDM 2026 · Kurikulum Merdeka Fase D', 15, 290);

    doc.save(`rapor-microjourney-${studentName || 'siswa'}.pdf`);
    setPdfDone(true);
  }

  return (
    <div className="min-h-[calc(100vh-88px)] bg-[#f7f9fb] flex flex-col">
      <div className="max-w-2xl mx-auto px-4 py-8 w-full">
        
        {!gameDone && (
          <MatchingGame onComplete={() => setGameDone(true)} />
        )}

        {gameDone && (
          <div className="animate-[fadeIn_0.8s_ease-out]">
            {/* Conclusion */}
            <div className="text-center mb-10">
              <div className="flex justify-center mb-5">
                <MikaMascot size={120} bubbleSide="top" pop message="Penyelidikan selesai! Kamu sudah paham tanggung jawab setiap pihak. Sekarang, apa janjimu untuk samudra kita?" />
              </div>
              <h2 className="font-[family-name:var(--font-outfit)] text-3xl font-bold mb-5 text-[#191c1e]">Generalisasi &amp; Refleksi</h2>
              <div className="bg-white border border-[#bec8d2] rounded-2xl p-6 max-w-lg mx-auto shadow-sm">
                <p className="text-[#3e4850] leading-relaxed italic text-base">
                  &ldquo;Manusia adalah pelaku utama pencemaran sekaligus korban akhir dari kecerobohannya sendiri. Setiap keputusan kecil — menolak sedotan plastik, membawa tas belanja — adalah tindakan konkret yang bermakna.&rdquo;
                </p>
                <p className="text-[#6e7881] text-xs mt-3">— Kesimpulan Kurikulum, Modul Ajar IPA Kelas VIII</p>
              </div>
            </div>

        {/* Eco-pledge */}
        <div className="bg-white border border-[#006e2f]/15 rounded-2xl p-6 mb-6 shadow-sm">
          <h3 className="font-[family-name:var(--font-outfit)] font-bold text-lg mb-4 flex items-center gap-2 text-[#191c1e]">
            <span className="material-symbols-outlined text-[#006e2f]">park</span>
            Eco-Pledge — Komitmen Nyata
          </h3>

          <p className="text-[#3e4850] text-sm mb-3">Pilih komitmen cepat atau tulis sendiri:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
            {QUICK_PLEDGES.map(p => (
              <button key={p} onClick={() => togglePledge(p)}
                className={`text-left text-sm px-4 py-3 rounded-xl border-2 transition-all ${
                  selectedPledges.has(p)
                    ? 'bg-[#6bff8f]/20 border-[#006e2f] text-[#006e2f] font-semibold'
                    : 'bg-[#f7f9fb] border-[#bec8d2] text-[#3e4850] hover:border-[#006e2f]/40 hover:bg-[#6bff8f]/10'
                }`}>
                {selectedPledges.has(p) ? '✓ ' : '□ '}{p}
              </button>
            ))}
          </div>

          <textarea value={commitment} onChange={e => setCommitment(e.target.value)}
            className="w-full bg-[#f7f9fb] border border-[#bec8d2] rounded-xl p-4 text-[#191c1e] placeholder-[#6e7881] text-sm resize-none h-24 focus:outline-none focus:border-[#006e2f] focus:ring-1 focus:ring-[#006e2f] transition-colors"
            placeholder="Tulis komitmenmu sendiri di sini, atau edit pilihan di atas..." />
        </div>

        {/* Signature */}
        <div className="bg-white border border-[#bec8d2] rounded-2xl p-6 mb-6 shadow-sm">
          <h3 className="font-bold mb-3 flex items-center gap-2 text-[#191c1e]">
            <span className="material-symbols-outlined text-[#006591]">draw</span>
            Tanda Tangan Digital
          </h3>
          <p className="text-[#3e4850] text-sm mb-3">Tandatangani komitmenmu:</p>
          <div className="bg-[#f7f9fb] rounded-xl overflow-hidden border border-[#bec8d2]">
            <canvas ref={canvasRef} width={500} height={110} className="w-full touch-none cursor-crosshair block"
              onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
              onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw} />
          </div>
          {hasSig && (
            <button onClick={clearSig} className="text-[#6e7881] text-xs mt-2 underline hover:text-[#3e4850]">Hapus dan ulangi</button>
          )}
          {!hasSig && <p className="text-[#6e7881] text-xs mt-2 font-[family-name:var(--font-mono)]">Tanda tangani di area abu-abu di atas</p>}
        </div>

        {/* Generate PDF */}
        <button onClick={generatePDF} disabled={!isReady}
          className="w-full bg-gradient-to-r from-[#006591] to-[#006e2f] text-white font-bold py-5 rounded-xl text-xl transition-all flex items-center justify-center gap-3 disabled:opacity-30 disabled:cursor-not-allowed mb-4 shadow-lg shadow-[#006591]/25 hover:shadow-xl hover:scale-[1.01]">
          <span className="material-symbols-outlined">picture_as_pdf</span>
          {pdfDone ? 'Unduh Lagi' : 'Selesaikan &amp; Unduh Rapor PDF'}
        </button>

        {!isReady && (
          <p className="text-center text-[#6e7881] text-xs mb-4 font-[family-name:var(--font-mono)]">
            {!commitment.trim() ? '← Isi komitmenmu dahulu' : '← Tanda tangan diperlukan'}
          </p>
        )}

        {pdfDone && (
          <div className="text-center">
            <div className="bg-white border border-[#006e2f]/20 rounded-xl p-5 mb-4 shadow-sm">
              <span className="material-symbols-outlined text-[#006e2f] text-4xl block mb-2">check_circle</span>
              <p className="text-[#006e2f] font-bold">Rapor PDF berhasil diunduh!</p>
              <p className="text-[#3e4850] text-sm mt-1">Serahkan file kepada gurumu sebagai bukti selesainya perjalanan.</p>
            </div>
            <button onClick={() => router.push('/')} className="text-[#6e7881] text-sm underline hover:text-[#3e4850]">
              Kembali ke Beranda
            </button>
          </div>
        )}
          </div>
        )}

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </div>
  );
}

'use client';
import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useJourneyStore } from '@/lib/journeyStore';
import { useAuthStore } from '@/lib/authStore';
import MikaMascot from '@/components/MikaMascot';
import StageCompletionModal from '@/components/ui/StageCompletionModal';
import { useReturnedToStage, useStageBack } from '@/lib/stageBack';
import { stripEmoji } from '@/lib/stripEmoji';

interface StakeholderPair {
  id: string;
  role: string;
  task: string;
  impact?: string;
}

const DEFAULT_MATCH_PAIRS: StakeholderPair[] = [
  {
    id: 'siswa',
    role: 'Siswa / Pelajar',
    task: 'Membawa tumbler & menolak sedotan plastik di kantin',
    impact: 'Duta lingkungan & menekan 80% botol sekali pakai di sekolah'
  },
  {
    id: 'pemerintah',
    role: 'Pemerintah & Regulator',
    task: 'Membuat kebijakan larangan penggunaan plastik sekali pakai & aturan daur ulang',
    impact: 'Leverage point hulu terbesar untuk menekan 60% limbah plastik nasional'
  },
  {
    id: 'pabrik',
    role: 'Industri & Produsen',
    task: 'Mengganti kemasan sintetis dengan bioplastik ramah lingkungan',
    impact: 'Mencegah mikroplastik beracun yang sulit terurai sejak tahap manufaktur'
  },
  {
    id: 'masyarakat',
    role: 'Orang Tua & Keluarga',
    task: 'Selalu membawa tas belanja kain sendiri & memilah sampah dari rumah',
    impact: 'Mencegah akumulasi sampah anorganik terseret ke saluran drainase dan muara laut'
  },
];

const QUICK_PLEDGES = [
  'Bawa tumbler sendiri ke sekolah setiap hari',
  'Tolak kantong plastik di kantin sekolah',
  'Ingatkan teman untuk kurangi plastik sekali pakai',
  'Tidak beli minuman kemasan plastik selama seminggu',
];

/** Ikon tokoh mengikuti namanya, karena daftar tokoh bisa diubah guru dari dashboard */
function roleIcon(role: string) {
  const name = role.toLowerCase();
  if (/siswa|pelajar/.test(name)) return 'school';
  if (/pemerintah|regulator/.test(name)) return 'account_balance';
  if (/industri|produsen|pabrik/.test(name)) return 'factory';
  if (/orang tua|keluarga|masyarakat/.test(name)) return 'family_restroom';
  if (/supermarket|ritel|toko/.test(name)) return 'storefront';
  return 'groups';
}

// ─── STAKEHOLDER NETWORK GRAPH (FUTURISTIC LASER CONNECTOR) ──────────────────
function StakeholderNetworkGraph({ onComplete }: { onComplete: () => void }) {
  const [pairsData, setPairsData] = useState<StakeholderPair[]>(DEFAULT_MATCH_PAIRS);
  const [roles, setRoles] = useState<StakeholderPair[]>([]);
  const [tasks, setTasks] = useState<StakeholderPair[]>([]);
  
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [connectedIds, setConnectedIds] = useState<string[]>([]);
  const [errorPair, setErrorPair] = useState<{ role: string; task: string } | null>(null);
  const [activeImpact, setActiveImpact] = useState<string | null>(null);

  // Layout refs to calculate precise laser line SVG paths
  const containerRef = useRef<HTMLDivElement>(null);
  const roleRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const taskRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const [laserLines, setLaserLines] = useState<{ id: string; x1: number; y1: number; x2: number; y2: number }[]>([]);

  useEffect(() => {
    async function loadPairs() {
      try {
        const res = await fetch('/api/stakeholders');
        const json = await res.json();
        if (json.ok && Array.isArray(json.data) && json.data.length > 0) {
          setPairsData(json.data);
          initBoard(json.data);
          return;
        }
      } catch {
        // Fallback to default
      }
      initBoard(DEFAULT_MATCH_PAIRS);
    }
    loadPairs();
  }, []);

  function initBoard(data: StakeholderPair[]) {
    setRoles([...data].sort(() => Math.random() - 0.5));
    setTasks([...data].sort(() => Math.random() - 0.5));
  }

  // Recalculate laser SVG connection coordinates
  const updateLaserLines = () => {
    if (!containerRef.current) return;
    const cRect = containerRef.current.getBoundingClientRect();

    const newLines: { id: string; x1: number; y1: number; x2: number; y2: number }[] = [];

    connectedIds.forEach((id) => {
      const rElem = roleRefs.current[id];
      const tElem = taskRefs.current[id];
      if (rElem && tElem) {
        const rRect = rElem.getBoundingClientRect();
        const tRect = tElem.getBoundingClientRect();
        newLines.push({
          id,
          x1: rRect.right - cRect.left,
          y1: rRect.top + rRect.height / 2 - cRect.top,
          x2: tRect.left - cRect.left,
          y2: tRect.top + tRect.height / 2 - cRect.top,
        });
      }
    });

    setLaserLines(newLines);

  };

  useEffect(() => {
    updateLaserLines();
    const board = containerRef.current;
    const observer = new ResizeObserver(updateLaserLines);
    if (board) observer.observe(board);
    return () => observer.disconnect();
  }, [connectedIds, selectedRoleId, selectedTaskId, roles, tasks]);

  const checkConnection = (rId: string, tId: string) => {
    if (rId === tId) {
      const nextConnected = [...connectedIds, rId];
      setConnectedIds(nextConnected);

      const found = pairsData.find((p) => p.id === rId);
      if (found) {
        setActiveImpact(`${stripEmoji(found.role)}: ${found.impact || found.task}`);
      }

      setSelectedRoleId(null);
      setSelectedTaskId(null);

      if (nextConnected.length === pairsData.length) {
        setTimeout(onComplete, 2400);
      }
    } else {
      setErrorPair({ role: rId, task: tId });
      setTimeout(() => {
        setErrorPair(null);
        setSelectedRoleId(null);
        setSelectedTaskId(null);
      }, 700);
    }
  };

  const handleRoleTap = (id: string) => {
    if (connectedIds.includes(id)) return;
    if (selectedRoleId === id) {
      setSelectedRoleId(null);
      return;
    }
    if (selectedTaskId) {
      checkConnection(id, selectedTaskId);
    } else {
      setSelectedRoleId(id);
    }
  };

  const handleTaskTap = (id: string) => {
    if (connectedIds.includes(id)) return;
    if (selectedTaskId === id) {
      setSelectedTaskId(null);
      return;
    }
    if (selectedRoleId) {
      checkConnection(selectedRoleId, id);
    } else {
      setSelectedTaskId(id);
    }
  };

  // Pesan dampak menutupi bagian bawah layar HP, jadi hilang sendiri setelah sempat terbaca
  useEffect(() => {
    if (!activeImpact) return;
    const timer = window.setTimeout(() => setActiveImpact(null), 4500);
    return () => window.clearTimeout(timer);
  }, [activeImpact]);

  const progressPercent = Math.round((connectedIds.length / (pairsData.length || 1)) * 100);
  const selectedRole = pairsData.find((p) => p.id === selectedRoleId);
  const instruction = selectedRole
    ? `Sekarang ketuk tugas untuk ${stripEmoji(selectedRole.role)}.`
    : selectedTaskId
    ? 'Sekarang ketuk tokoh yang melakukannya.'
    : connectedIds.length === pairsData.length
    ? 'Semua tokoh sudah terhubung!'
    : 'Ketuk satu tokoh, lalu ketuk tugasnya.';

  return (
    <div
      ref={containerRef}
      className="bg-white/10 border border-white/20 rounded-3xl p-3 sm:p-7 shadow-2xl text-white mb-8 relative overflow-hidden"
    >
      {/* Garis penghubung berada di celah antara kolom tokoh dan kolom tugas */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-30">
        <defs>
          <linearGradient id="laserSuccess" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6bff8f" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#7dd3fc" stopOpacity="1" />
            <stop offset="100%" stopColor="#6bff8f" stopOpacity="0.9" />
          </linearGradient>
          <filter id="glowLaser" filterUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        {laserLines.map((line) => {
          // Gradien tidak tergambar pada garis yang benar-benar datar, jadi ujungnya digeser sedikit
          const y2 = Math.abs(line.y2 - line.y1) < 1 ? line.y1 + 1 : line.y2;
          // Lengkungan mengikuti lebar celah, yang di HP jauh lebih sempit daripada di web
          const bend = Math.min(60, (line.x2 - line.x1) * 0.6);
          const path = `M ${line.x1} ${line.y1} C ${line.x1 + bend} ${line.y1}, ${line.x2 - bend} ${y2}, ${line.x2} ${y2}`;
          return (
            <g key={line.id}>
              <path d={path} stroke="#6bff8f" strokeWidth="5" fill="none" opacity="0.4" filter="url(#glowLaser)" />
              <path d={path} stroke="url(#laserSuccess)" strokeWidth="2.5" fill="none" strokeDasharray="8 4" className="animate-[dash_1s_linear_infinite]" />
            </g>
          );
        })}
      </svg>

      <div className="text-center mb-3 sm:mb-5 relative z-20">
        <h2 className="text-xl sm:text-3xl font-extrabold text-white font-[family-name:var(--font-outfit)] leading-tight">
          Siapa Melakukan Apa?
        </h2>
        <p className="text-xs sm:text-sm text-white/80 mt-0.5">Hubungkan tiap tokoh dengan tindakannya untuk melindungi laut.</p>
      </div>

      {/* Kemajuan */}
      <div className="mb-3 sm:mb-5 relative z-20">
        <div className="flex items-center justify-between text-xs font-bold mb-1">
          <span className="flex items-center gap-1 text-white/90">
            <span className="material-symbols-outlined text-base text-[#7dd3fc]">waves</span>
            Perisai laut
          </span>
          <span className="text-[#6bff8f] font-[family-name:var(--font-mono)]">{connectedIds.length}/{pairsData.length} terhubung</span>
        </div>
        <div className="h-2 rounded-full bg-black/40 overflow-hidden">
          <div className="h-full rounded-full bg-[#6bff8f] transition-all duration-500" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <p aria-live="polite" className="mb-3 relative z-20 flex items-center justify-center gap-1.5 rounded-xl bg-[#f0a345]/15 border border-[#f0a345]/40 px-3 py-2 text-xs sm:text-sm font-bold text-[#ffdf9a] text-center">
        <span className="material-symbols-outlined text-base">touch_app</span>
        {instruction}
      </p>

      <div className="grid grid-cols-2 gap-x-7 md:gap-x-10 relative z-20">
        {/* Tokoh */}
        <div className="flex flex-col min-w-0">
          <p className="text-[11px] font-extrabold text-[#ffdf9a] uppercase tracking-wider font-[family-name:var(--font-mono)] mb-1.5">
            Tokoh
          </p>
          <div className="flex flex-col flex-1 gap-1.5 md:gap-2.5">
            {roles.map((r) => {
              const isConnected = connectedIds.includes(r.id);
              const isSelected = selectedRoleId === r.id;
              const isError = errorPair?.role === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  ref={(el) => { roleRefs.current[r.id] = el; }}
                  onClick={() => handleRoleTap(r.id)}
                  disabled={isConnected}
                  aria-pressed={isSelected}
                  className={`flex-1 min-h-[60px] p-1.5 md:p-3 rounded-xl border-2 transition-colors font-bold text-[11px] sm:text-sm leading-tight flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-2.5 text-center md:text-left select-none ${
                    isConnected
                      ? 'bg-[#006e2f]/50 border-[#6bff8f]/70 text-[#6bff8f]'
                      : isError
                      ? 'bg-[#ba1a1a]/60 border-[#ff8c8c] text-white animate-shake'
                      : isSelected
                      ? 'bg-[#7dd3fc] border-[#7dd3fc] text-[#083b54]'
                      : 'bg-black/30 border-white/20 text-white hover:border-[#7dd3fc] active:scale-95'
                  }`}
                >
                  <span className="material-symbols-outlined text-xl md:text-2xl flex-shrink-0">{isConnected ? 'check_circle' : roleIcon(r.role)}</span>
                  <span>{stripEmoji(r.role)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tugas */}
        <div className="flex flex-col min-w-0">
          <p className="text-[11px] font-extrabold text-[#6bff8f] uppercase tracking-wider font-[family-name:var(--font-mono)] mb-1.5">
            Tugas
          </p>
          <div className="flex flex-col flex-1 gap-1.5 md:gap-2.5">
            {tasks.map((t) => {
              const isConnected = connectedIds.includes(t.id);
              const isSelected = selectedTaskId === t.id;
              const isError = errorPair?.task === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  ref={(el) => { taskRefs.current[t.id] = el; }}
                  onClick={() => handleTaskTap(t.id)}
                  disabled={isConnected}
                  aria-pressed={isSelected}
                  className={`flex-auto min-h-[60px] px-2 py-1.5 md:px-3 md:py-2 rounded-xl border-2 transition-colors text-[11px] sm:text-sm leading-snug text-left select-none ${
                    isConnected
                      ? 'bg-[#006e2f]/50 border-[#6bff8f]/70 text-white'
                      : isError
                      ? 'bg-[#ba1a1a]/60 border-[#ff8c8c] text-white animate-shake'
                      : isSelected
                      ? 'bg-[#7dd3fc] border-[#7dd3fc] text-[#083b54] font-bold'
                      : 'bg-black/30 border-white/20 text-white/95 hover:border-[#6bff8f] active:scale-[0.98]'
                  }`}
                >
                  {t.task}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Dampak tindakan; di HP tampil di bawah layar supaya daftar tidak bergeser */}
      {activeImpact && (
        <div role="status" className="fixed md:static inset-x-3 bottom-3 z-40 md:mt-5 bg-[#00391a] md:bg-[#006e2f]/50 border border-[#6bff8f]/60 rounded-2xl p-3 flex items-start gap-2.5 shadow-2xl">
          <span className="material-symbols-outlined text-[#6bff8f] text-xl flex-shrink-0">eco</span>
          <p className="text-xs text-white leading-snug">{activeImpact}</p>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes dash {
          to { stroke-dashoffset: -24; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }
        .animate-shake { animation: shake 0.3s ease-in-out; }
      ` }} />
    </div>
  );
}

// ─── MAIN TAHAP 6 PAGE ────────────────────────────────────────────────────────
export default function Tahap6() {
  const router = useRouter();
  const { completeStage, completedStages, setLkpdAnswer, lkpdAnswers, studentName, studentClass, sessionId } = useJourneyStore();
  const returned = useReturnedToStage(6);
  const { currentUser } = useAuthStore();
  const [commitment, setCommitment] = useState(lkpdAnswers.commitment);
  const [selectedPledges, setSelectedPledges] = useState<Set<string>>(new Set());
  const [pdfDone, setPdfDone] = useState(returned && completedStages.includes(6));
  const [gameDone, setGameDone] = useState(returned);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const drawing = useRef(false);
  const [hasSig, setHasSig] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const isReady = commitment.trim().length > 10 && hasSig && gameDone;

  // Jurnal selesai -> sumpah -> permainan -> Tahap 5
  useStageBack(() => {
    if (pdfDone) {
      setPdfDone(false);
      return true;
    }
    if (gameDone) {
      setGameDone(false);
      setHasSig(false);
      return true;
    }
    return false;
  });

  function togglePledge(p: string) {
    const s = new Set(selectedPledges);
    if (s.has(p)) {
      s.delete(p);
      setCommitment((prev) => prev.replace('\n' + p, '').replace(p, ''));
    } else {
      s.add(p);
      setCommitment((prev) => (prev ? prev + '\n' + p : p));
    }
    setSelectedPledges(s);
  }

  function getPos(e: React.MouseEvent | React.TouchEvent, cv: HTMLCanvasElement) {
    const r = cv.getBoundingClientRect();
    if ('touches' in e) return { x: e.touches[0].clientX - r.left, y: e.touches[0].clientY - r.top };
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    drawing.current = true;
    lastPos.current = getPos(e, canvasRef.current!);
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    if (!drawing.current || !canvasRef.current || !lastPos.current) return;
    const ctx = canvasRef.current.getContext('2d')!;
    const pos = getPos(e, canvasRef.current);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#6bff8f';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();
    lastPos.current = pos;
    setHasSig(true);
  }

  function stopDraw() {
    drawing.current = false;
    lastPos.current = null;
  }

  function clearSig() {
    const cv = canvasRef.current!;
    const ctx = cv.getContext('2d')!;
    ctx.clearRect(0, 0, cv.width, cv.height);
    setHasSig(false);
  }

  async function generatePDF() {
    setLkpdAnswer('commitment', commitment);
    completeStage(6);

    // Sync final commitment to MongoDB
    try {
      const state = useJourneyStore.getState();
      await fetch('/api/lkpd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: state.sessionId || sessionId || `session-${Date.now()}`,
          studentName: state.studentName || currentUser?.name || 'Anonim',
          studentClass: state.studentClass || currentUser?.className || '-',
          studentAccountEmail: currentUser?.email || '',
          assessmentEligible: true,
          commitment,
          lkpdStep1: state.lkpdAnswers.lkpdStep1,
          lkpdStep2: state.lkpdAnswers.lkpdStep2,
          lkpd1: state.lkpdAnswers.lkpd1,
          lkpd2: state.lkpdAnswers.lkpd2,
          lkpd3q1: state.lkpdAnswers.lkpd3q1,
          lkpd3q2: state.lkpdAnswers.lkpd3q2,
          lkpd4: state.lkpdAnswers.lkpd4,
          totalParticles: state.totalParticles,
          mostDangerousOrgan: state.mostDangerousOrgan,
          quizCorrect: state.quizCorrect,
          quizWrong: state.quizWrong,
          preTestScore: state.preTestScore,
          postTestScore: state.postTestScore,
          selectedFoods: state.selectedFoods.map(f => f.name),
        }),
      });
    } catch (e) {
      console.error('Failed to sync final commitment to MongoDB:', e);
    }

    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF();

      // Header block
      doc.setFillColor(0, 101, 145);
      doc.rect(0, 0, 210, 42, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('MICROJOURNEY AR', 15, 18);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(201, 230, 255);
      doc.text('Rapor Jurnal Investigasi Mikroplastik — IPA Kelas VIII / Kurikulum Merdeka', 15, 28);
      doc.text(`Nama: ${studentName || '-'}    Kelas: ${studentClass || '-'}    Tanggal: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, 15, 36);

      doc.setTextColor(0, 0, 0);

      const { totalParticles, selectedFoods, mostDangerousOrgan, lkpdAnswers: answers } = useJourneyStore.getState();
      let y = 52;
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(186, 26, 26);
      doc.text('HASIL EKSPLORASI', 15, y);
      y += 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0);
      doc.text(`Total mikroplastik tertelan hari ini: ${totalParticles.toLocaleString('id-ID')} partikel`, 15, y);
      y += 6;
      doc.text(`Organ paling terdampak (menurut siswa): ${mostDangerousOrgan || 'Usus Halus'}`, 15, y);
      y += 6;
      doc.text(`Makanan yang dianalisis: ${selectedFoods.map((f) => f.name).join(', ') || '-'}`, 15, y);
      y += 12;

      const sections = [
        { label: 'LKPD Tahap 1 — Analisis AR Scanner', text: answers.lkpdStep1 },
        { label: 'LKPD Tahap 2 — Observasi Proses Pelapukan', text: answers.lkpdStep2 },
        { label: 'LKPD Tahap 3 — Kontaminasi Pangan (Makanan Dipilih)', text: answers.lkpd2 },
        { label: 'LKPD Tahap 4 — Mengapa HCl Lambung Gagal', text: answers.lkpd3q1 },
        { label: 'LKPD Tahap 4 — Organ Paling Terdampak', text: answers.lkpd3q2 },
        { label: 'LKPD Tahap 5 — Sintesis Jaring Kasus (HOTS)', text: answers.lkpd4 },
      ];

      sections.forEach((s) => {
        if (y > 255) {
          doc.addPage();
          y = 20;
        }
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 101, 145);
        doc.text(s.label, 15, y);
        y += 6;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0);
        const lines = doc.splitTextToSize(s.text || '(tidak diisi)', 180);
        doc.text(lines, 15, y);
        y += lines.length * 5 + 6;
      });

      // Commitment
      if (y > 240) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 110, 47);
      doc.text('KOMITMEN EKOLOGI', 15, y);
      y += 7;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0);
      const clines = doc.splitTextToSize(commitment || '-', 180);
      doc.text(clines, 15, y);
      y += clines.length * 5 + 8;

      // Signature safely embedded
      if (canvasRef.current && hasSig) {
        try {
          const dataUrl = canvasRef.current.toDataURL('image/png');
          if (dataUrl && dataUrl.length > 50) {
            doc.text('Tanda Tangan Digital:', 15, y);
            y += 5;
            doc.addImage(dataUrl, 'PNG', 15, y, 70, 25);
            y += 30;
          }
        } catch (sigErr) {
          console.warn('Signature embedding skipped:', sigErr);
        }
      }

      doc.setFontSize(8);
      doc.setTextColor(110, 120, 129);
      doc.text('MicroJourney AR · LIDM 2026 · Kurikulum Merdeka Fase D', 15, 290);

      const filename = `jurnal-microjourney-${(studentName || 'siswa').replace(/\s+/g, '_')}.pdf`;

      // Try primary save, with robust HTML anchor fallback for mobile/webviews
      try {
        doc.save(filename);
      } catch {
        const blob = doc.output('blob');
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      }

      setPdfDone(true);
      setShowCompletionModal(true);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('Gagal mengunduh berkas. Pastikan browser mendukung pengunduhan.');
    }
  }

  return (
    <div className="min-h-[100dvh] pt-24 sm:pt-32 pb-20 bg-[linear-gradient(160deg,#083b54_0%,#006591_45%,#004c6e_100%)] text-white relative page-clip">
      {/* Background patterns and glowing Orbs */}
      <div className="absolute inset-0 adventure-map opacity-10 pointer-events-none" />
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#f0a345]/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute top-1/2 -right-24 w-96 h-96 bg-[#6bff8f]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-3xl mx-auto px-3 sm:px-4 sm:py-6 relative z-10">
        {!gameDone && <StakeholderNetworkGraph onComplete={() => setGameDone(true)} />}

        {gameDone && (
          <div className="space-y-6 animate-fade-in">
            {/* Conclusion Header */}
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <MikaMascot
                  size={120}
                  bubbleSide="top"
                  pop
                  message="Misi Jaringan Berhasil! Seluruh stakeholder telah terhubung & perisai samudra aktif 100%. Tancapkan Sumpah Komitmenmu!"
                />
              </div>
              <h2 className="font-[family-name:var(--font-outfit)] text-2xl sm:text-3xl font-extrabold text-white mb-3">
                Generalisasi &amp; Refleksi Ekologi
              </h2>
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-5 max-w-lg mx-auto shadow-xl">
                <p className="text-white/90 leading-relaxed italic text-sm sm:text-base">
                  &ldquo;Manusia adalah pelaku utama pencemaran sekaligus korban akhir dari kecerobohannya sendiri. Setiap keputusan kecil — menolak sedotan plastik, membawa tas belanja — adalah tindakan konkret yang bermakna.&rdquo;
                </p>
                <p className="text-[#ffdf9a] text-xs font-[family-name:var(--font-mono)] mt-2 font-bold">— Kesimpulan Kurikulum Merdeka IPA Kelas VIII</p>
              </div>
            </div>

            {/* Eco-pledge Card */}
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-5 sm:p-7 shadow-2xl">
              <h3 className="font-[family-name:var(--font-outfit)] font-extrabold text-lg sm:text-xl mb-4 flex items-center gap-2 text-white">
                <span className="material-symbols-outlined text-[#6bff8f]">park</span>
                Eco-Pledge — Komitmen Nyata
              </h3>

              <p className="text-white/80 text-xs sm:text-sm mb-3">Pilih janji komitmen cepat atau tuliskan komitmenmu sendiri:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
                {QUICK_PLEDGES.map((p) => (
                  <button
                    key={p}
                    onClick={() => togglePledge(p)}
                    className={`text-left text-xs sm:text-sm px-3 py-3 rounded-xl border transition-all flex items-center gap-2 ${
                      selectedPledges.has(p)
                        ? 'bg-[#006e2f]/60 border-[#6bff8f] text-[#6bff8f] font-bold shadow-[0_0_15px_rgba(107,255,143,0.3)]'
                        : 'bg-black/30 border-white/20 text-white/90 hover:border-[#6bff8f]/50 hover:bg-white/10'
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg flex-shrink-0">{selectedPledges.has(p) ? 'check_box' : 'check_box_outline_blank'}</span>
                    <span>{p}</span>
                  </button>
                ))}
              </div>

              <textarea
                value={commitment}
                onChange={(e) => setCommitment(e.target.value)}
                className="w-full bg-black/40 border border-white/20 rounded-2xl p-4 text-white placeholder-white/40 text-xs sm:text-sm resize-none h-28 focus:outline-none focus:border-[#6bff8f] focus:ring-2 focus:ring-[#6bff8f]/30 transition-all font-sans leading-relaxed"
                placeholder="Tulis komitmen ekologimu sendiri di sini, atau edit pilihan di atas..."
              />
            </div>

            {/* Signature Canvas Card */}
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-5 sm:p-7 shadow-2xl">
              <h3 className="font-extrabold text-lg sm:text-xl mb-2 flex items-center gap-2 text-white font-[family-name:var(--font-outfit)]">
                <span className="material-symbols-outlined text-[#7dd3fc]">draw</span>
                Tanda Tangan Digital Sumpah
              </h3>
              <p className="text-white/80 text-xs sm:text-sm mb-3">Goreskan tanda tangan digitalmu di atas kanvas berikut:</p>

              <div className="bg-black/50 rounded-2xl overflow-hidden border border-white/20 shadow-inner">
                <canvas
                  ref={canvasRef}
                  width={500}
                  height={120}
                  className="w-full touch-none cursor-crosshair block"
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={stopDraw}
                  onMouseLeave={stopDraw}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={stopDraw}
                />
              </div>

              <div className="flex justify-between items-center mt-2 px-1">
                {hasSig ? (
                  <button onClick={clearSig} className="text-[#ff8c8c] text-xs underline hover:text-white transition-colors">
                    Hapus &amp; Ulangi Tanda Tangan
                  </button>
                ) : (
                  <p className="text-white/60 text-xs font-[family-name:var(--font-mono)]">Goreskan tanda tangan di area gelap di atas</p>
                )}
                {hasSig && (
                  <span className="text-[#6bff8f] text-xs font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">check_circle</span> Tanda Tangan Sah
                  </span>
                )}
              </div>
            </div>

            {/* Wooden 3D Submit Button */}
            <button
              onClick={generatePDF}
              disabled={!isReady}
              className="w-full bg-[linear-gradient(180deg,#f0a345_0%,#d27b22_100%)] hover:brightness-110 text-[#3b2313] font-extrabold py-4 sm:py-5 rounded-2xl text-lg sm:text-xl transition-all flex items-center justify-center gap-3 shadow-[0_6px_0_#9a5310,0_10px_20px_rgba(0,0,0,0.3)] active:translate-y-1 active:shadow-[0_2px_0_#9a5310] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-2xl">workspace_premium</span>
              <span>{pdfDone ? 'Unduh Ulang Jurnal Ekspedisi' : 'Selesaikan Misi & Simpan Jurnal Ekspedisi'}</span>
            </button>

            {!isReady && (
              <p className="text-center text-[#ffdf9a] text-xs font-[family-name:var(--font-mono)]">
                {!commitment.trim()
                  ? 'Lengkapi isi komitmenmu dahulu'
                  : !hasSig
                  ? 'Bubuhkan tanda tangan digital di atas'
                  : 'Selesaikan hubungan tokoh dan tugas dahulu'}
              </p>
            )}

            {pdfDone && (
              <div className="mt-8 border-t border-white/15 pt-6 text-center space-y-4">
                <div className="p-4 rounded-2xl bg-[#006e2f]/50 border border-[#6bff8f]/50 text-[#6bff8f] text-xs sm:text-sm font-bold flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-xl">verified</span>
                  <span>Jurnal Ekspedisi Terunduh! Ekspedisi 6 Tahapmu Resmi Selesai!</span>
                </div>

                <button
                  onClick={() => router.push('/journey/post-test')}
                  className="w-full py-4 px-6 rounded-2xl text-base sm:text-lg font-extrabold text-[#3b2313] flex items-center justify-center gap-3 transition-all transform active:scale-95 shadow-xl border-2 border-[#8e4912]"
                  style={{
                    fontFamily: 'var(--font-outfit)',
                    background: 'linear-gradient(to bottom, #f0a345, #d27b22)',
                    boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.3), 0 8px 16px rgba(0,0,0,0.25)',
                  }}
                >
                  <span>Lanjut ke Tes Akhir (Post-test)</span>
                  <span className="material-symbols-outlined text-2xl">arrow_forward</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <StageCompletionModal
        isOpen={showCompletionModal}
        stageNumber={6}
        stageTitle="Sumpah Komitmen Ekologi"
        xpEarned={150}
        nextStagePath="/journey/post-test"
        nextStageLabel="Lanjut ke Tes Akhir (Post-test)"
        onClose={() => setShowCompletionModal(false)}
      />
    </div>
  );
}

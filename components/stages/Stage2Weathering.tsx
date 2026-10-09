import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, PanInfo, AnimatePresence } from 'framer-motion';
import YouTubePlayer from '@/components/ui/YouTubePlayer';
import { useJourneyStore } from '@/lib/journeyStore';

// ─── Types ────────────────────────────────────────────────────────────────────
type LabPhase = 'lab' | 'breaking' | 'complete';

interface Particle {
  x: number; y: number; vx: number; vy: number;
  w: number; h: number; opacity: number; color: string;
}

// ─── Plastic Objects Data ─────────────────────────────────────────────────────
const PLASTIC_OBJECTS = [
  { id: 'bottle', emoji: '🍶', label: 'Botol Minum', type: 'PET', years: 450, color: '#B3E5FC', strokeColor: '#64B5F6' },
  { id: 'bag', emoji: '🛍️', label: 'Kantong Kresek', type: 'LDPE', years: 1000, color: '#E1BEE7', strokeColor: '#AB47BC' },
  { id: 'cap', emoji: '🧴', label: 'Tutup Botol', type: 'PP', years: 400, color: '#FFCCBC', strokeColor: '#FF7043' },
  { id: 'straw', emoji: '🥤', label: 'Sedotan', type: 'PP', years: 200, color: '#F8BBD0', strokeColor: '#E91E63' },
  { id: 'jug', emoji: '🫙', label: 'Jerigen', type: 'HDPE', years: 500, color: '#C8E6C9', strokeColor: '#43A047' },
];

// ─── Pertanyaan Evaluasi (LKPD) ───────────────────────────────────────────────
const EVALUATION_QUESTIONS = [
  {
    id: 1,
    text: "Dari percobaan tadi, apa sih yang bikin benda plastiknya jadi rapuh dan hancur berkeping-keping di lautan?",
    options: [
      { id: 'a', text: 'Panas terik matahari (Sinar UV) dan hantaman keras ombak laut' },
      { id: 'b', text: 'Dimakan oleh ikan-ikan kecil dan hewan laut lainnya' },
      { id: 'c', text: 'Membeku karena suhu air laut yang sangat dingin' }
    ],
    correct: 'a'
  },
  {
    id: 2,
    text: "Waktu kita mencoba alat 'Bakteri', kenapa kumannya tidak bisa menghancurkan atau memakan plastik tersebut?",
    options: [
      { id: 'a', text: 'Karena plastiknya terlalu licin untuk ditempeli bakteri' },
      { id: 'b', text: 'Karena plastik itu buatan manusia (sintetis), bukan makanan alami yang dikenal bakteri' },
      { id: 'c', text: 'Karena bakteri di laut tidak bisa hidup di air yang terlalu asin' }
    ],
    correct: 'b'
  },
  {
    id: 3,
    text: "Setelah plastiknya hancur oleh ombak dan matahari menjadi serpihan yang sangat kecil, disebut apakah potongan tersebut?",
    options: [
      { id: 'a', text: 'Bioplastik (plastik ramah lingkungan yang bisa jadi kompos)' },
      { id: 'b', text: 'Mikroplastik (potongan plastik super kecil yang berbahaya jika termakan)' },
      { id: 'c', text: 'Makroplastik (sampah plastik ukuran besar yang masih utuh)' }
    ],
    correct: 'b'
  }
];

// ─── SVG Shapes per Object ────────────────────────────────────────────────────
function PlasticSVG({ objectId, uvExposure, breaking }: { objectId: string, uvExposure: number, breaking: boolean }) {
  const filter = `brightness(${1 - uvExposure * 0.003}) sepia(${uvExposure * 0.6}%) saturate(${Math.max(0.2, 1 - uvExposure * 0.008)})`;
  const obj = PLASTIC_OBJECTS.find(o => o.id === objectId)!;
  const crackOpacity = (threshold: number) => Math.max(0, (uvExposure - threshold) / (100 - threshold));

  const cls = `transition-all duration-500 drop-shadow-2xl mx-auto block ${breaking ? 'opacity-0 scale-50' : 'opacity-100 scale-150'}`;

  if (objectId === 'bottle') {
    return (
      <svg width="100" height="200" viewBox="0 0 130 240" className={cls} style={{ filter }}>
        <rect x="45" y="0" width="40" height="22" rx="7" fill={obj.strokeColor} />
        <rect x="30" y="22" width="70" height="196" rx="18" fill={obj.color} fillOpacity="0.9" stroke={obj.strokeColor} strokeWidth="2" />
        <rect x="40" y="42" width="12" height="130" rx="6" fill="white" fillOpacity="0.4" />
        <rect x="35" y="80" width="60" height="70" rx="6" fill="#006591" fillOpacity="0.15" />
        <text x="65" y="118" textAnchor="middle" fill="#006591" fontSize="10" fontWeight="bold">PET</text>
        {uvExposure > 25 && <line x1="50" y1="55" x2="82" y2="95" stroke="#ba1a1a" strokeWidth="1.5" opacity={crackOpacity(25)} />}
        {uvExposure > 50 && <line x1="55" y1="110" x2="95" y2="145" stroke="#ba1a1a" strokeWidth="1" opacity={crackOpacity(50)} />}
        {uvExposure > 70 && <line x1="38" y1="150" x2="78" y2="185" stroke="#ba1a1a" strokeWidth="1.5" opacity={crackOpacity(70)} />}
      </svg>
    );
  }

  if (objectId === 'bag') {
    return (
      <svg width="100" height="140" viewBox="0 0 130 180" className={cls} style={{ filter }}>
        <path d="M20 30 Q65 10 110 30 L100 160 Q65 175 30 160 Z" fill={obj.color} fillOpacity="0.9" stroke={obj.strokeColor} strokeWidth="2" />
        <path d="M50 30 Q65 15 80 30" fill="none" stroke={obj.strokeColor} strokeWidth="3" strokeLinecap="round" />
        <path d="M45 30 Q65 12 85 30" fill="none" stroke={obj.strokeColor} strokeWidth="2" strokeLinecap="round" />
        <rect x="40" y="55" width="55" height="35" rx="5" fill="#fff" fillOpacity="0.15" />
        <text x="65" y="78" textAnchor="middle" fill="#5c2666" fontSize="10" fontWeight="bold">LDPE</text>
        {uvExposure > 30 && <line x1="45" y1="80" x2="90" y2="110" stroke="#ba1a1a" strokeWidth="1.5" opacity={crackOpacity(30)} />}
        {uvExposure > 60 && <line x1="70" y1="50" x2="50" y2="130" stroke="#ba1a1a" strokeWidth="1" opacity={crackOpacity(60)} />}
      </svg>
    );
  }

  if (objectId === 'cap') {
    return (
      <svg width="100" height="100" viewBox="0 0 130 130" className={cls} style={{ filter }}>
        <ellipse cx="65" cy="65" rx="52" ry="52" fill={obj.color} fillOpacity="0.9" stroke={obj.strokeColor} strokeWidth="2.5" />
        <ellipse cx="65" cy="65" rx="40" ry="40" fill="none" stroke={obj.strokeColor} strokeWidth="1.5" strokeDasharray="4 3" opacity="0.5" />
        <ellipse cx="52" cy="52" rx="12" ry="8" fill="white" fillOpacity="0.3" />
        <text x="65" y="70" textAnchor="middle" fill="#5d4037" fontSize="12" fontWeight="bold">PP</text>
        {uvExposure > 35 && <line x1="30" y1="40" x2="90" y2="100" stroke="#ba1a1a" strokeWidth="2" opacity={crackOpacity(35)} />}
        {uvExposure > 65 && <line x1="90" y1="30" x2="30" y2="90" stroke="#ba1a1a" strokeWidth="1.5" opacity={crackOpacity(65)} />}
      </svg>
    );
  }

  if (objectId === 'straw') {
    return (
      <svg width="50" height="200" viewBox="0 0 60 260" className={cls} style={{ filter }}>
        <rect x="15" y="10" width="30" height="240" rx="15" fill={obj.color} fillOpacity="0.9" stroke={obj.strokeColor} strokeWidth="2" />
        <rect x="22" y="20" width="8" height="200" rx="4" fill="white" fillOpacity="0.3" />
        {uvExposure > 20 && <line x1="18" y1="80" x2="42" y2="120" stroke="#ba1a1a" strokeWidth="1.5" opacity={crackOpacity(20)} />}
        {uvExposure > 55 && <line x1="18" y1="150" x2="42" y2="190" stroke="#ba1a1a" strokeWidth="1" opacity={crackOpacity(55)} />}
      </svg>
    );
  }

  if (objectId === 'jug') {
    return (
      <svg width="110" height="160" viewBox="0 0 140 200" className={cls} style={{ filter }}>
        <rect x="30" y="20" width="80" height="160" rx="14" fill={obj.color} fillOpacity="0.9" stroke={obj.strokeColor} strokeWidth="2.5" />
        <rect x="30" y="10" width="50" height="20" rx="8" fill={obj.strokeColor} />
        <path d="M110 50 Q135 70 110 110" fill="none" stroke={obj.strokeColor} strokeWidth="8" strokeLinecap="round" />
        <rect x="42" y="40" width="16" height="100" rx="8" fill="white" fillOpacity="0.3" />
        <text x="70" y="115" textAnchor="middle" fill="#1b5e20" fontSize="10" fontWeight="bold">HDPE</text>
        {uvExposure > 40 && <line x1="45" y1="60" x2="95" y2="100" stroke="#ba1a1a" strokeWidth="2" opacity={crackOpacity(40)} />}
        {uvExposure > 75 && <line x1="95" y1="130" x2="45" y2="170" stroke="#ba1a1a" strokeWidth="1.5" opacity={crackOpacity(75)} />}
      </svg>
    );
  }

  return null;
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface Props {
  onComplete: () => void;
  videoUrl?: string;
}

export default function Stage2Weathering({ onComplete, videoUrl = 'https://www.youtube.com/embed/dQw4w9WgXcQ' }: Props) {
  const { lkpdAnswers, setLkpdAnswer } = useJourneyStore();
  const [hasWatched, setHasWatched] = useState(false);
  const [labPhase, setLabPhase] = useState<LabPhase>('lab');
  const [selectedObject, setSelectedObject] = useState('bottle');
  const [uvExposure, setUvExposure] = useState(0);
  const [bottleIntegrity, setBottleIntegrity] = useState(100);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'info' | 'error' | 'success'>('info');
  const [activeEffect, setActiveEffect] = useState<'uv' | 'wave' | 'bacteria' | null>(null);
  
  // State for evaluation questions
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showErrors, setShowErrors] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);
  const phaseRef = useRef(labPhase);
  phaseRef.current = labPhase;

  const showMessage = (text: string, type: 'info' | 'error' | 'success' = 'info') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleSelectObject = (id: string) => {
    if (labPhase === 'breaking' || labPhase === 'complete') return;
    setSelectedObject(id);
    setUvExposure(0);
    setBottleIntegrity(100);
    setMessage('');
  };

  const playVoiceInstruction = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const text = "Selamat datang di laboratorium virtual. Silakan seret alat panas matahari dan ombak laut ke arah objek plastik di tengah untuk melihat proses pelapukan mikroplastik.";
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'id-ID';
      utterance.rate = 0.95;
      utterance.pitch = 1.1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  };

  const playSound = (type: 'uv' | 'wave' | 'error' | 'break') => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      let duration = 0.5;

      if (type === 'uv') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start(); osc.stop(ctx.currentTime + 0.5);
        duration = 0.5;
      } else if (type === 'wave') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.8);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
        osc.start(); osc.stop(ctx.currentTime + 0.8);
        duration = 0.8;
      } else if (type === 'error') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(); osc.stop(ctx.currentTime + 0.3);
        duration = 0.3;
      } else if (type === 'break') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(100, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start(); osc.stop(ctx.currentTime + 0.5);
        duration = 0.5;
      }
      
      // Clean up AudioContext to prevent exceeding browser limits
      setTimeout(() => {
        if (ctx.state !== 'closed') {
          ctx.close();
        }
      }, (duration * 1000) + 100);

    } catch (e) { console.error('Audio play failed', e); }
  };

  const handleDragEnd = (tool: 'uv' | 'wave' | 'bacteria', info: PanInfo) => {
    if (info.offset.y > -20) return;

    if (tool === 'bacteria') {
      setActiveEffect('bacteria');
      playSound('error');
      showMessage('❌ Bakteri: "Plastik ini sintetis, aku tidak bisa memakannya!"', 'error');
    } else if (tool === 'uv') {
      setActiveEffect('uv');
      playSound('uv');
      if (uvExposure < 100) {
        setUvExposure(prev => Math.min(100, prev + 35));
        showMessage('☀️ Sinar UV memutus ikatan polimer, plastik mulai melemah.', 'info');
      } else {
        showMessage('Objek sudah mencapai batas kerapuhan dari UV!', 'info');
      }
    } else if (tool === 'wave') {
      setActiveEffect('wave');
      playSound('wave');
      if (uvExposure < 50) {
        showMessage('🌊 Ombak menerjang, tapi plastiknya masih terlalu kuat!', 'error');
      } else {
        const damage = uvExposure >= 100 ? 50 : 25;
        setBottleIntegrity(prev => {
          const next = Math.max(0, prev - damage);
          if (next <= 0) triggerBreak();
          else showMessage('💥 Ombak meretakkan plastik yang getas.', 'success');
          return next;
        });
      }
    }
    
    setTimeout(() => setActiveEffect(null), 1200);
  };

  const triggerBreak = useCallback(() => {
    if (phaseRef.current === 'breaking' || phaseRef.current === 'complete') return;
    setLabPhase('breaking');
    playSound('break');
    showMessage('💥 Hancur menjadi jutaan mikroplastik!', 'success');
    const colors = ['#90caf9', '#80cbc4', '#ce93d8', '#fff176', '#ef9a9a', '#a5d6a7'];
    particlesRef.current = Array.from({ length: 150 }, () => ({
      x: 0.5, y: 0.5,
      vx: (Math.random() - 0.5) * 0.018,
      vy: (Math.random() - 0.5) * 0.018 - 0.01,
      w: Math.random() * 0.025 + 0.01,
      h: Math.random() * 0.025 + 0.01,
      opacity: 1,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
  }, []);

  useEffect(() => {
    if (labPhase !== 'breaking') return;
    const canvas = canvasRef.current!;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesRef.current = particlesRef.current.map(p => ({
        ...p,
        x: p.x + p.vx, y: p.y + p.vy + 0.0015,
        vy: p.vy + 0.0004, opacity: p.opacity - 0.006,
      })).filter(p => p.opacity > 0);

      particlesRef.current.forEach(p => {
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.roundRect(p.x * canvas.width, p.y * canvas.height, p.w * canvas.width, p.h * canvas.height, 4);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      if (particlesRef.current.length > 0) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        setTimeout(() => {
          setLabPhase('complete');
          // Smooth scroll down to evaluation after lab breaks
          setTimeout(() => {
            window.scrollBy({ top: 400, behavior: 'smooth' });
          }, 300);
        }, 400);
      }
    }
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [labPhase]);

  const obj = PLASTIC_OBJECTS.find(o => o.id === selectedObject)!;

  // Check if all questions are answered and correct
  const allAnswered = EVALUATION_QUESTIONS.every(q => answers[q.id]);
  const allCorrect = EVALUATION_QUESTIONS.every(q => answers[q.id] === q.correct);

  const handleSubmitEvaluation = () => {
    if (allCorrect) {
      onComplete();
    } else {
      setShowErrors(true);
      showMessage('❌ Masih ada jawaban yang belum tepat. Silakan periksa kembali!', 'error');
    }
  };

  return (
    <div className="w-full h-full font-[family-name:var(--font-inter)] relative flex flex-col items-center justify-start max-w-5xl mx-auto py-6">

      {/* ── PHASE 1: VIDEO TAYANGAN AWAL ── */}
      <AnimatePresence mode="wait">
        {!hasWatched && (
          <motion.div 
            key="video-phase"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-3xl mx-auto flex flex-col gap-6 mt-4"
          >
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#6bff8f]/10 border border-[#6bff8f]/30 text-[#6bff8f] text-xs font-bold uppercase tracking-widest mb-3 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#6bff8f] animate-pulse" />
                Tahap 2 · Uji Pelapukan
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-white font-[family-name:var(--font-outfit)] leading-tight mb-2 drop-shadow-md">
                Tahap 2: Pelapukan Plastik
              </h1>
              <p className="text-blue-100 text-sm md:text-base font-medium max-w-xl mx-auto">
                Tonton penjelasan singkat di bawah ini sebelum kamu memulai uji laboratorium.
              </p>
            </div>

            {/* Video Player - Soft Glass Frame with YouTube option */}
            <div className="p-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
              <YouTubePlayer url={videoUrl} title="Video Pelapukan Mikroplastik" />
            </div>

            {/* Button Lanjut */}
            <div className="flex justify-center mt-2 mb-16">
              <motion.button
                onClick={() => {
                  setHasWatched(true);
                  playVoiceInstruction();
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative inline-flex items-center justify-center gap-3 px-10 py-4 font-extrabold text-[#3b2313] text-xl font-[family-name:var(--font-outfit)] transition-all"
                style={{
                  background: 'linear-gradient(to bottom, #f0a345, #d27b22)',
                  border: '3px solid #8e4912',
                  borderRadius: '24px',
                  boxShadow: 'inset 0 4px 0 rgba(255,255,255,0.3), inset 0 -4px 0 rgba(0,0,0,0.2), 0 10px 20px rgba(0,0,0,0.3)',
                }}
              >
                <span className="absolute left-4 w-3 h-3 rounded-full bg-[#5a2e0a] shadow-inner" />
                <span className="absolute right-4 w-3 h-3 rounded-full bg-[#5a2e0a] shadow-inner" />
                <span className="material-symbols-outlined text-2xl">science</span>
                Mulai Virtual Lab
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ── PHASE 2: VIRTUAL LAB ── */}
        {hasWatched && (
          <motion.div 
            key="lab-phase"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full flex flex-col gap-6"
          >
            {/* Object Selection Tabs (Vibrant Glass Theme) */}
            <div className="flex flex-wrap gap-2 md:gap-4 justify-center">
              {PLASTIC_OBJECTS.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleSelectObject(item.id)}
                  className={`flex flex-col items-center gap-1 px-4 py-2.5 md:px-6 md:py-3.5 rounded-2xl md:rounded-3xl transition-all border-2 ${
                    selectedObject === item.id 
                      ? 'bg-gradient-to-b from-white to-[#e4f1f9] border-[#6bff8f] text-[#083b54] shadow-[0_0_20px_rgba(107,255,143,0.4)] scale-105 z-10 font-bold' 
                      : 'bg-white/10 backdrop-blur-md border-white/20 text-white/90 hover:bg-white/20 hover:text-white hover:scale-105'
                  }`}
                >
                  <span className="text-2xl md:text-3xl">{item.emoji}</span>
                  <span className="text-[10px] md:text-sm font-extrabold font-[family-name:var(--font-outfit)]">{item.label}</span>
                </button>
              ))}
            </div>

            {/* The Lab Area - Soft Water Gradient (Fixed Height to not jump around) */}
            <div className="w-full h-[500px] rounded-[40px] overflow-hidden shadow-2xl relative flex flex-col border-[4px] border-white/40 bg-gradient-to-b from-[#87CEEB] to-[#004c6e] transition-all duration-700">
              
              {/* Gelombang Laut Berjalan */}
              <div className="absolute inset-0 pointer-events-none opacity-40">
                {[...Array(4)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute bottom-0 left-[-50%] right-[-50%] h-64 opacity-50"
                    style={{ 
                      background: `radial-gradient(ellipse at center, rgba(255,255,255,0.3) 0%, transparent 70%)`,
                      borderRadius: '50% 50% 0 0'
                    }}
                    animate={{ x: [0, 100, 0], y: [0, -15, 0] }}
                    transition={{ duration: 8 + i*2, repeat: Infinity, ease: 'easeInOut', delay: i }}
                  />
                ))}
              </div>

              {/* Gelembung Air Bawah Laut */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={`bubble-${i}`}
                    className="absolute bottom-[-20px] rounded-full bg-white/30 border border-white/50 shadow-sm"
                    style={{ left: `${Math.random() * 100}%`, width: Math.random() * 15 + 5, height: Math.random() * 15 + 5 }}
                    animate={{ y: -600, x: Math.random() * 60 - 30 }}
                    transition={{ duration: Math.random() * 4 + 3, repeat: Infinity, ease: 'linear', delay: Math.random() * 3 }}
                  />
                ))}
              </div>

              {/* Notifikasi Pop-up Lembut */}
              <AnimatePresence>
                {message && (
                  <motion.div
                    key={message}
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute top-4 md:top-8 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm"
                  >
                    <div className={`px-4 py-2 md:px-6 md:py-3 rounded-2xl md:rounded-full shadow-lg backdrop-blur-md border-2 text-center text-xs md:text-sm font-bold ${
                      messageType === 'error' ? 'bg-white/95 border-[#ba1a1a] text-[#ba1a1a]' :
                      messageType === 'success' ? 'bg-white/95 border-[#006e2f] text-[#006e2f]' :
                      'bg-white/95 border-[#006591] text-[#006591]'
                    }`}>
                      {message}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* HUD Indicators & Voice Guide Button */}
              <div className="absolute top-4 right-4 md:top-8 md:right-8 flex flex-col gap-2 md:gap-3 z-20 items-end">
                <button
                  onClick={playVoiceInstruction}
                  title="Dengarkan Suara Panduan"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/90 backdrop-blur-md border border-[#006591]/30 text-[#006591] text-xs font-bold shadow-md hover:bg-[#006591] hover:text-white transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined text-base animate-pulse">volume_up</span>
                  <span>Suara Panduan</span>
                </button>
                <div className="bg-white/80 backdrop-blur-sm border-2 border-white rounded-xl md:rounded-2xl px-3 py-2 md:px-5 md:py-3 w-28 md:w-40 shadow-sm">
                  <p className="text-[#006591] text-[10px] md:text-xs font-bold uppercase tracking-widest mb-1 md:mb-2 flex justify-between">
                    <span>Sinar UV</span> <span>{uvExposure}%</span>
                  </p>
                  <div className="w-full bg-[#c9e6ff] h-2 md:h-3 rounded-full overflow-hidden shadow-inner">
                    <motion.div className="h-full bg-[#f0a345]" animate={{ width: `${uvExposure}%` }} />
                  </div>
                </div>
                <div className="bg-white/80 backdrop-blur-sm border-2 border-white rounded-xl md:rounded-2xl px-3 py-2 md:px-5 md:py-3 w-28 md:w-40 shadow-sm">
                  <p className="text-[#006e2f] text-[10px] md:text-xs font-bold uppercase tracking-widest mb-1 md:mb-2 flex justify-between">
                    <span>Fisik</span> <span>{bottleIntegrity}%</span>
                  </p>
                  <div className="w-full bg-[#c9e6ff] h-2 md:h-3 rounded-full overflow-hidden shadow-inner">
                    <motion.div className="h-full bg-[#6bff8f]" animate={{ width: `${bottleIntegrity}%` }} />
                  </div>
                </div>
              </div>

              {/* Canvas Area (Central Focus) */}
              <div className="flex-1 relative flex items-center justify-center">
                
                {/* Visual Effects Render */}
                {activeEffect === 'uv' && (
                  <motion.div 
                    initial={{ scale: 0, opacity: 1, rotate: 0 }} 
                    animate={{ scale: 4, opacity: 0, rotate: 90 }} 
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className="absolute w-40 h-40 bg-gradient-to-tr from-[#ffeb3b] to-[#ff9800] rounded-full mix-blend-screen blur-xl pointer-events-none z-10"
                  />
                )}
                
                {activeEffect === 'wave' && (
                  <motion.div 
                    initial={{ scale: 0.5, opacity: 1, y: 50 }} 
                    animate={{ scale: 2.5, opacity: 0, y: -50 }} 
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="absolute w-full h-full flex items-center justify-center pointer-events-none z-10"
                  >
                    <div className="w-48 h-48 border-[12px] border-white/60 rounded-full blur-md" />
                    <div className="absolute w-32 h-32 border-[8px] border-[#c9e6ff]/80 rounded-full blur-sm" />
                  </motion.div>
                )}

                {activeEffect === 'bacteria' && (
                  <motion.div className="absolute w-full h-full flex items-center justify-center pointer-events-none z-10">
                     {[...Array(6)].map((_, i) => (
                       <motion.div 
                         key={`bac-${i}`} 
                         initial={{ opacity: 1, y: 0, x: 0, scale: 1 }} 
                         animate={{ opacity: 0, y: -100, x: (Math.random()-0.5)*150, scale: 0.5 }} 
                         transition={{ duration: 1.2, ease: "easeOut" }} 
                         className="absolute text-4xl"
                       >
                         🦠
                       </motion.div>
                     ))}
                  </motion.div>
                )}

                {labPhase !== 'complete' && (
                  <motion.div animate={labPhase === 'lab' ? { y: [0, -15, 0] } : {}} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
                    <PlasticSVG objectId={selectedObject} uvExposure={uvExposure} breaking={labPhase === 'breaking'} />
                  </motion.div>
                )}
                {labPhase === 'complete' && (
                  <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center">
                     <div className="w-20 h-20 rounded-full bg-white/50 flex items-center justify-center text-5xl mb-4 shadow-xl border-4 border-white">🎉</div>
                     <h3 className="font-extrabold font-[family-name:var(--font-outfit)] text-white text-3xl drop-shadow-md">Berhasil Hancur!</h3>
                     <p className="text-[#6bff8f] font-bold mt-2 text-lg drop-shadow-sm">Plastik telah menjadi mikroplastik di lautan.</p>
                  </motion.div>
                )}
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-10" />
              </div>

              {/* Draggable Tools Desk (Bottom) - Only show if not complete */}
              <AnimatePresence>
                {labPhase === 'lab' && (
                  <motion.div 
                    initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
                    className="relative z-20 p-3 md:p-6 flex justify-center gap-3 md:gap-8 bg-white/10 backdrop-blur-md border-t border-white/40"
                  >
                    <ToolTile id="uv" icon="wb_sunny" label="Panas Matahari" desc="(UV)" color="from-[#fff3d4] to-[#fde08b]" textColor="text-[#b27b00]" onDragEnd={handleDragEnd} />
                    <ToolTile id="wave" icon="waves" label="Abrasi Pantai" desc="(Ombak)" color="from-[#e4f1f9] to-[#c9e6ff]" textColor="text-[#006591]" onDragEnd={handleDragEnd} />
                    <ToolTile id="bacteria" icon="coronavirus" label="Biodegradasi" desc="(Bakteri)" color="from-[#e6f4ea] to-[#c8e6c9]" textColor="text-[#006e2f]" onDragEnd={handleDragEnd} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* ── PHASE 3: EVALUATION LKPD (Muncul di bawah lab) ── */}
            <AnimatePresence>
              {labPhase === 'complete' && (
                <motion.div 
                  initial={{ opacity: 0, y: 50, height: 0 }} 
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  className="w-full flex flex-col gap-6 mt-4 mb-20"
                >
                  <div className="bg-white/10 backdrop-blur-xl rounded-[32px] p-6 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.4)] border border-white/20">
                    <div className="flex items-center gap-4 mb-8 border-b border-white/15 pb-6">
                      <div className="w-12 h-12 rounded-2xl bg-[#6bff8f]/20 border border-[#6bff8f]/40 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-2xl text-[#6bff8f]">assignment</span>
                      </div>
                      <div>
                        <h2 className="text-2xl font-extrabold text-white font-[family-name:var(--font-outfit)]">Evaluasi Eksperimen</h2>
                        <p className="text-blue-200 text-sm">Jawab 3 pertanyaan berikut berdasarkan hasil uji laboratorium virtual tadi.</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-8">
                      {EVALUATION_QUESTIONS.map((q, index) => {
                        const isAnswered = !!answers[q.id];
                        const isCorrect = answers[q.id] === q.correct;
                        const showError = showErrors && isAnswered && !isCorrect;

                        return (
                          <div key={q.id} className="flex flex-col gap-3">
                            <h3 className="font-bold text-white text-base flex gap-2">
                              <span className="text-[#6bff8f] font-extrabold">{index + 1}.</span> {q.text}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {q.options.map(opt => {
                                const isSelected = answers[q.id] === opt.id;
                                let bgClass = 'bg-white/5 border-white/15 text-blue-100 hover:bg-white/15 hover:text-white';
                                if (isSelected) {
                                  if (showErrors && !isCorrect) {
                                    bgClass = 'bg-[#ba1a1a]/30 border-[#ba1a1a] text-red-200 shadow-lg';
                                  } else {
                                    bgClass = 'bg-[#006591]/60 border-[#6bff8f] text-white shadow-[0_0_15px_rgba(107,255,143,0.3)] scale-[1.02]';
                                  }
                                }
                                return (
                                  <button
                                    key={opt.id}
                                    onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt.id }))}
                                    className={`p-4 rounded-2xl border-2 text-left transition-all text-sm font-semibold flex items-start gap-3 ${bgClass}`}
                                  >
                                    <span className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center flex-shrink-0 mt-0.5">
                                      {isSelected && <span className="w-2.5 h-2.5 rounded-full bg-current" />}
                                    </span>
                                    {opt.text}
                                  </button>
                                );
                              })}
                            </div>
                            {showError && (
                              <p className="text-[#ff8c8c] text-xs font-bold italic mt-1">Jawaban ini kurang tepat, coba pikirkan lagi peristiwa di lab tadi.</p>
                            )}
                          </div>
                        );
                      })}
                      {/* LKPD Textarea for Stage 2 */}
                      <div className="mt-8 p-6 bg-white/5 border border-white/20 rounded-2xl">
                        <label className="block text-sm font-bold text-white mb-3 uppercase font-[family-name:var(--font-outfit)]">
                          Tuliskan Kesimpulan Analisismu (LKPD Tahap 2)
                        </label>
                        <p className="text-blue-200 text-xs mb-4">
                          Berdasarkan simulasi dan 3 pertanyaan di atas, simpulkan bagaimana botol plastik utuh bisa berakhir menjadi mikroplastik yang tertelan ikan di lautan.
                        </p>
                        <textarea
                          value={lkpdAnswers.lkpdStep2}
                          onChange={(e) => setLkpdAnswer('lkpdStep2', e.target.value)}
                          placeholder="Kesimpulan saya..."
                          className="w-full h-28 p-4 bg-white/10 text-white border-2 border-white/30 rounded-xl text-sm placeholder:text-blue-300 focus:border-[#6bff8f] focus:ring-0 outline-none resize-none transition-all"
                        />
                      </div>

                    </div>

                    {/* Submit Button */}
                    <div className="mt-8 pt-6 border-t border-white/15 flex justify-end">
                      <motion.button
                        onClick={() => {
                          if (!lkpdAnswers.lkpdStep2.trim()) {
                            alert('Harap isi kesimpulan analisismu (LKPD) sebelum melanjutkan!');
                            return;
                          }
                          handleSubmitEvaluation();
                        }}
                        disabled={!allAnswered}
                        whileHover={allAnswered ? { scale: 1.05 } : {}}
                        whileTap={allAnswered ? { scale: 0.95 } : {}}
                        className="relative inline-flex items-center justify-center gap-3 px-10 py-4 font-extrabold text-[#3b2313] text-lg font-[family-name:var(--font-outfit)] transition-all disabled:opacity-40 disabled:grayscale disabled:cursor-not-allowed"
                        style={{
                          background: 'linear-gradient(to bottom, #f0a345, #d27b22)',
                          border: '3px solid #8e4912',
                          borderRadius: '20px',
                          boxShadow: allAnswered ? 'inset 0 4px 0 rgba(255,255,255,0.3), inset 0 -4px 0 rgba(0,0,0,0.2), 0 8px 16px rgba(0,0,0,0.3)' : 'none',
                        }}
                      >
                        <span className="absolute left-4 w-2 h-2 rounded-full bg-[#5a2e0a]" />
                        <span className="absolute right-4 w-2 h-2 rounded-full bg-[#5a2e0a]" />
                        Selesai & Lanjut Tahap 3 <span className="material-symbols-outlined text-2xl">arrow_forward</span>
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Helper component for Draggable Tools (Bigger Soft Tiles for full screen)
function ToolTile({ id, icon, label, desc, color, textColor, onDragEnd }: { id: any, icon: string, label: string, desc: string, color: string, textColor: string, onDragEnd: any }) {
  return (
    <motion.div
      drag dragSnapToOrigin
      onDragEnd={(_, info) => onDragEnd(id, info)}
      whileDrag={{ scale: 1.15, zIndex: 50, rotate: id === 'uv' ? -5 : 5 }}
      className={`w-24 h-24 md:w-32 md:h-32 rounded-2xl md:rounded-3xl flex flex-col items-center justify-center gap-1 md:gap-2 cursor-grab active:cursor-grabbing shadow-sm bg-gradient-to-br ${color} border-2 md:border-[3px] border-white hover:shadow-lg transition-shadow`}
    >
      <span className={`material-symbols-outlined ${textColor} text-3xl md:text-4xl`}>{icon}</span>
      <div className="text-center px-1">
        <div className={`text-[10px] md:text-xs font-extrabold ${textColor} leading-tight`}>{label}</div>
        <div className={`text-[8px] md:text-[10px] font-bold ${textColor} opacity-70`}>{desc}</div>
      </div>
    </motion.div>
  );
}

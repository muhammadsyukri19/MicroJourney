import { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion, PanInfo, AnimatePresence } from 'framer-motion';
import YouTubePlayer from '@/components/ui/YouTubePlayer';
import MikaMascot from '@/components/MikaMascot';
import PlasticShatter3D, { CRACK_END } from '@/components/stages/PlasticShatter3D';
import { useJourneyStore } from '@/lib/journeyStore';
import { useStageBack } from '@/lib/stageBack';
import MIKA_VOICE_LINES from '@/lib/mikaVoiceLines.json';

const MicroplasticAR = dynamic(() => import('@/components/stages/MicroplasticAR'), { ssr: false });

// ─── Types ────────────────────────────────────────────────────────────────────
type LabPhase = 'lab' | 'breaking' | 'complete';

interface Particle {
  x: number; y: number; vx: number; vy: number;
  w: number; h: number; opacity: number; color: string;
}

// ─── Plastic Objects Data ─────────────────────────────────────────────────────
const PLASTIC_OBJECTS = [
  { id: 'bottle', emoji: '🧴', label: 'Botol Plastik', type: 'PET (Kode 1)', years: 450, color: '#B3E5FC', strokeColor: '#64B5F6' },
  { id: 'cup', emoji: '🥤', label: 'Gelas Plastik', type: 'PP (Kode 5)', years: 400, color: '#FFCCBC', strokeColor: '#FF7043' },
  { id: 'bag', emoji: '🛍️', label: 'Kantong Kresek', type: 'LDPE (Kode 4)', years: 1000, color: '#E1BEE7', strokeColor: '#AB47BC' },
  { id: 'straw', emoji: '🧃', label: 'Sedotan Plastik', type: 'PP (Kode 5)', years: 200, color: '#F8BBD0', strokeColor: '#E91E63' },
  { id: 'jug', emoji: '🫙', label: 'Wadah Plastik', type: 'HDPE (Kode 2)', years: 500, color: '#C8E6C9', strokeColor: '#43A047' },
];

type VoiceLine = keyof typeof MIKA_VOICE_LINES;

const BREAK_AUDIO_URLS = {
  crack: '/audio/sfx/plastik-retak.mp3',
  shatter: '/audio/sfx/plastik-pecah.mp3',
  voice: '/audio/mika/tahap2-broken.mp3',
};
// Potongan berkas suara (detik): retak punya dua bunyi "krek", pecah diawali 0,3 detik hening
const CRACK_FIRST = { offset: 0, duration: 0.25 };
const CRACK_SECOND = { offset: 1.42, duration: 0.58, at: 0.42 };
const SHATTER_OFFSET = 0.3;
// Mika baru bicara setelah bunyi pecah utama selesai
const BROKEN_VOICE_AT = 1.8;

// Urutan pilihan suara wanita Indonesia di berbagai browser/HP
const FEMALE_VOICE_HINTS = [/gadis/i, /damayanti/i, /natural/i, /google/i, /wanita|female/i];

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

// ─── SVG Shapes per Object (Large, Bold & Realistic) ──────────────────────────
function PlasticSVG({ objectId, uvExposure, integrity, breaking }: { objectId: string, uvExposure: number, integrity: number, breaking: boolean }) {
  // Makin lama terjemur, plastik makin menguning
  const filter = `brightness(${1 - uvExposure * 0.0008}) sepia(${uvExposure * 0.62}%) saturate(${1 + uvExposure * 0.006})`;
  const obj = PLASTIC_OBJECTS.find(o => o.id === objectId)!;
  // Matahari hanya memunculkan retak halus pertama; retakan besar baru terbuka oleh hantaman ombak
  const wear = uvExposure * 0.4 + (100 - integrity) * 0.6;
  const crackOpacity = (threshold: number) => Math.max(0, Math.min(1, (wear - threshold) / 30));

  const baseCls = `transition-all duration-500 drop-shadow-2xl mx-auto block ${breaking ? 'opacity-0 scale-50' : 'opacity-100 scale-100 sm:scale-105'}`;

  if (objectId === 'bottle') {
    return (
      <svg viewBox="0 0 160 300" className={`h-full w-auto md:w-60 md:h-[400px] ${baseCls}`} style={{ filter }}>
        <defs>
          <filter id="crackGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#ba1a1a" floodOpacity="0.8" />
          </filter>
        </defs>

        {/* Tutup Botol & Cincin Segel */}
        <rect x="62" y="8" width="36" height="22" rx="4" fill="#0288d1" stroke="#01579b" strokeWidth="2" />
        <line x1="68" y1="12" x2="68" y2="26" stroke="#01579b" strokeWidth="1.5" />
        <line x1="74" y1="12" x2="74" y2="26" stroke="#01579b" strokeWidth="1.5" />
        <line x1="80" y1="12" x2="80" y2="26" stroke="#01579b" strokeWidth="1.5" />
        <line x1="86" y1="12" x2="86" y2="26" stroke="#01579b" strokeWidth="1.5" />
        <line x1="92" y1="12" x2="92" y2="26" stroke="#01579b" strokeWidth="1.5" />
        <rect x="59" y="30" width="42" height="7" rx="2" fill="#0277bd" stroke="#01579b" strokeWidth="1.5" />

        {/* Leher & Bodi Botol Mineral PET */}
        <path 
          d="M 64 37 L 64 56 L 44 82 L 38 105 L 38 272 Q 38 288 54 288 L 106 288 Q 122 288 122 272 L 122 105 L 116 82 L 96 56 L 96 37 Z" 
          fill={obj.color} 
          fillOpacity="0.88" 
          stroke={obj.strokeColor} 
          strokeWidth="3.5" 
          strokeLinejoin="round"
        />

        {/* Lekukan Struktural Tulang Botol (Grip Ribs) */}
        <path d="M 40 135 Q 80 142 120 135" fill="none" stroke="white" strokeWidth="2.5" strokeOpacity="0.5" strokeLinecap="round" />
        <path d="M 40 155 Q 80 162 120 155" fill="none" stroke="white" strokeWidth="2.5" strokeOpacity="0.5" strokeLinecap="round" />
        <path d="M 40 225 Q 80 232 120 225" fill="none" stroke="white" strokeWidth="2.5" strokeOpacity="0.5" strokeLinecap="round" />
        <path d="M 40 245 Q 80 252 120 245" fill="none" stroke="white" strokeWidth="2.5" strokeOpacity="0.5" strokeLinecap="round" />

        {/* Kilau Plastik Vertikal */}
        <rect x="46" y="90" width="12" height="160" rx="6" fill="white" fillOpacity="0.35" />
        <rect x="110" y="105" width="4" height="135" rx="2" fill="white" fillOpacity="0.25" />

        {/* Label Merek / Kemasan */}
        <rect x="37" y="166" width="86" height="52" rx="4" fill="white" fillOpacity="0.95" stroke="#0288d1" strokeWidth="2" />
        <rect x="37" y="178" width="86" height="26" fill="#006591" fillOpacity="0.9" />
        <text x="80" y="175" textAnchor="middle" fill="#006591" fontSize="9" fontWeight="bold">♳ KODE 1</text>
        <text x="80" y="196" textAnchor="middle" fill="white" fontSize="13" fontWeight="900" letterSpacing="1.5">PET</text>
        <text x="80" y="213" textAnchor="middle" fill="#083b54" fontSize="8" fontWeight="800">AIR MINERAL • 600ml</text>

        {/* Retakan Jagged Akibat UV & Ombak */}
        {uvExposure > 20 && (
          <path 
            d="M 52 82 L 68 105 L 60 120 L 78 142 L 70 160" 
            fill="none" 
            stroke="#ba1a1a" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            opacity={crackOpacity(20)}
            filter="url(#crackGlow)"
          />
        )}
        {uvExposure > 45 && (
          <path 
            d="M 108 120 L 92 145 L 102 165 L 85 195 L 95 220" 
            fill="none" 
            stroke="#ba1a1a" 
            strokeWidth="3" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            opacity={crackOpacity(45)}
            filter="url(#crackGlow)"
          />
        )}
        {uvExposure > 65 && (
          <path 
            d="M 44 215 L 68 235 L 56 255 L 84 275 L 75 288" 
            fill="none" 
            stroke="#ba1a1a" 
            strokeWidth="3.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            opacity={crackOpacity(65)}
            filter="url(#crackGlow)"
          />
        )}
        {uvExposure > 80 && (
          <>
            <path d="M 68 105 L 88 118 L 106 112" fill="none" stroke="#e53935" strokeWidth="2.5" strokeLinecap="round" opacity={crackOpacity(80)} filter="url(#crackGlow)" />
            <path d="M 42 172 L 65 182 L 80 178" fill="none" stroke="#e53935" strokeWidth="2.5" strokeLinecap="round" opacity={crackOpacity(80)} filter="url(#crackGlow)" />
            <path d="M 92 230 L 114 245" fill="none" stroke="#e53935" strokeWidth="3" strokeLinecap="round" opacity={crackOpacity(80)} filter="url(#crackGlow)" />
          </>
        )}
      </svg>
    );
  }

  if (objectId === 'cap' || objectId === 'cup') {
    return (
      <svg viewBox="0 0 180 240" className={`h-full w-auto md:w-68 md:h-[350px] ${baseCls}`} style={{ filter }}>
        <defs>
          <filter id="crackGlowCup" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#ba1a1a" floodOpacity="0.8" />
          </filter>
        </defs>

        {/* Bibir Gelas Atas / Rim */}
        <ellipse cx="90" cy="30" rx="66" ry="14" fill={obj.color} stroke={obj.strokeColor} strokeWidth="3.5" />
        <ellipse cx="90" cy="30" rx="56" ry="9" fill="white" fillOpacity="0.4" />

        {/* Bodi Tapered Cup PP */}
        <polygon points="26,30 154,30 134,215 46,215" fill={obj.color} fillOpacity="0.86" stroke={obj.strokeColor} strokeWidth="3.5" strokeLinejoin="round" />
        <ellipse cx="90" cy="215" rx="44" ry="9" fill={obj.color} stroke={obj.strokeColor} strokeWidth="3" />

        {/* Cincin Penguat Horisontal Cup */}
        <path d="M 33 80 Q 90 92 147 80" fill="none" stroke="white" strokeWidth="2.5" strokeOpacity="0.45" strokeLinecap="round" />
        <path d="M 37 115 Q 90 126 143 115" fill="none" stroke="white" strokeWidth="2.5" strokeOpacity="0.45" strokeLinecap="round" />
        <path d="M 41 150 Q 90 160 139 150" fill="none" stroke="white" strokeWidth="2.5" strokeOpacity="0.45" strokeLinecap="round" />

        {/* Kilau Sisi */}
        <polygon points="34,35 48,35 58,210 49,210" fill="white" fillOpacity="0.3" />

        {/* Cetakan Logo & Kode Daur Ulang */}
        <rect x="62" y="105" width="56" height="42" rx="8" fill="#fff" fillOpacity="0.3" stroke="#d27b22" strokeWidth="2" />
        <text x="90" y="122" textAnchor="middle" fill="#d27b22" fontSize="9" fontWeight="bold">♷ KODE 5</text>
        <text x="90" y="137" textAnchor="middle" fill="#5d4037" fontSize="13" fontWeight="900">PP</text>
        <text x="90" y="145" textAnchor="middle" fill="#5d4037" fontSize="6.5" fontWeight="800">CUP 22 oz</text>

        {/* Retakan Akibat UV */}
        {uvExposure > 25 && (
          <path 
            d="M 45 32 L 62 65 L 54 90 L 78 125" 
            fill="none" 
            stroke="#ba1a1a" 
            strokeWidth="3" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            opacity={crackOpacity(25)}
            filter="url(#crackGlowCup)"
          />
        )}
        {uvExposure > 55 && (
          <path 
            d="M 135 60 L 115 95 L 125 130 L 98 175" 
            fill="none" 
            stroke="#ba1a1a" 
            strokeWidth="3" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            opacity={crackOpacity(55)}
            filter="url(#crackGlowCup)"
          />
        )}
        {uvExposure > 75 && (
          <path 
            d="M 55 170 L 80 190 L 68 215 M 105 185 L 125 210" 
            fill="none" 
            stroke="#e53935" 
            strokeWidth="3.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            opacity={crackOpacity(75)}
            filter="url(#crackGlowCup)"
          />
        )}
      </svg>
    );
  }

  if (objectId === 'bag') {
    return (
      <svg viewBox="0 0 200 240" className={`h-full w-auto md:w-72 md:h-[350px] ${baseCls}`} style={{ filter }}>
        <defs>
          <filter id="crackGlowBag" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#ba1a1a" floodOpacity="0.8" />
          </filter>
        </defs>

        {/* Kantong Kresek Belanja dengan Gagang Kembar */}
        <path 
          d="M 40 55 Q 40 18 68 18 Q 92 18 92 55 L 92 75 L 108 75 L 108 55 Q 108 18 132 18 Q 160 18 160 55 L 175 95 L 165 222 Q 100 236 35 222 L 25 95 Z" 
          fill={obj.color} 
          fillOpacity="0.88" 
          stroke={obj.strokeColor} 
          strokeWidth="3.5" 
          strokeLinejoin="round"
        />

        {/* Lubang Gagang Kresek */}
        <path d="M 54 35 Q 68 26 80 35 L 78 58 Q 68 62 56 58 Z" fill="#75bde0" fillOpacity="0.85" stroke={obj.strokeColor} strokeWidth="2.5" />
        <path d="M 120 35 Q 132 26 146 35 L 144 58 Q 132 62 122 58 Z" fill="#75bde0" fillOpacity="0.85" stroke={obj.strokeColor} strokeWidth="2.5" />

        {/* Lipatan & Kerutan Kantong Kresek */}
        <path d="M 30 110 Q 60 135 100 120 Q 140 105 170 125" fill="none" stroke="white" strokeWidth="2" strokeOpacity="0.4" strokeLinecap="round" />
        <path d="M 32 165 Q 70 185 100 170 Q 135 155 167 175" fill="none" stroke="white" strokeWidth="2" strokeOpacity="0.4" strokeLinecap="round" />

        {/* Cetakan Kantong Belanja */}
        <rect x="68" y="118" width="64" height="42" rx="8" fill="white" fillOpacity="0.25" stroke="#5c2666" strokeWidth="2" />
        <text x="100" y="135" textAnchor="middle" fill="#5c2666" fontSize="9" fontWeight="bold">♶ KODE 4</text>
        <text x="100" y="149" textAnchor="middle" fill="#5c2666" fontSize="13" fontWeight="900">LDPE</text>
        <text x="100" y="157" textAnchor="middle" fill="#5c2666" fontSize="6.5" fontWeight="800">KANTONG KRESEK</text>

        {/* Sobekan / Robekan Jagged */}
        {uvExposure > 20 && (
          <path 
            d="M 38 48 L 52 65 L 45 80 M 88 65 L 102 78" 
            fill="none" 
            stroke="#ba1a1a" 
            strokeWidth="3" 
            strokeLinecap="round" 
            opacity={crackOpacity(20)}
            filter="url(#crackGlowBag)"
          />
        )}
        {uvExposure > 45 && (
          <path 
            d="M 30 130 L 65 145 L 85 135 L 125 155 L 165 140" 
            fill="none" 
            stroke="#ba1a1a" 
            strokeWidth="3.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            opacity={crackOpacity(45)}
            filter="url(#crackGlowBag)"
          />
        )}
        {uvExposure > 70 && (
          <path 
            d="M 48 180 L 80 200 L 115 185 L 148 215" 
            fill="none" 
            stroke="#e53935" 
            strokeWidth="3.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            opacity={crackOpacity(70)}
            filter="url(#crackGlowBag)"
          />
        )}
      </svg>
    );
  }

  if (objectId === 'straw') {
    return (
      <svg viewBox="0 0 100 320" className={`h-full w-auto md:w-44 md:h-[400px] ${baseCls}`} style={{ filter }}>
        <defs>
          <filter id="crackGlowStraw" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#ba1a1a" floodOpacity="0.8" />
          </filter>
        </defs>

        {/* Sedotan Tabung Utama */}
        <rect x="35" y="15" width="30" height="290" rx="15" fill={obj.color} fillOpacity="0.9" stroke={obj.strokeColor} strokeWidth="3" />
        <rect x="42" y="25" width="7" height="270" rx="3.5" fill="white" fillOpacity="0.4" />

        {/* Garis Spiral Corak Sedotan */}
        <path d="M 36 60 L 64 80" stroke="#f0a345" strokeWidth="4" strokeLinecap="round" />
        <path d="M 36 120 L 64 140" stroke="#f0a345" strokeWidth="4" strokeLinecap="round" />
        <path d="M 36 180 L 64 200" stroke="#f0a345" strokeWidth="4" strokeLinecap="round" />
        <path d="M 36 240 L 64 260" stroke="#f0a345" strokeWidth="4" strokeLinecap="round" />

        {/* Bagian Fleksibel / Tekukan Akordeon Sedotan */}
        <rect x="33" y="70" width="34" height="6" rx="2" fill="#d27b22" stroke={obj.strokeColor} strokeWidth="1.5" />
        <rect x="33" y="78" width="34" height="6" rx="2" fill="#d27b22" stroke={obj.strokeColor} strokeWidth="1.5" />
        <rect x="33" y="86" width="34" height="6" rx="2" fill="#d27b22" stroke={obj.strokeColor} strokeWidth="1.5" />

        {/* Label PP */}
        <text x="50" y="165" textAnchor="middle" fill="#5d4037" fontSize="10" fontWeight="900" transform="rotate(-90 50 165)">PP • KODE 5</text>

        {/* Patah & Pecah Getas Sedotan */}
        {uvExposure > 20 && (
          <path 
            d="M 35 83 L 65 83" 
            stroke="#ba1a1a" 
            strokeWidth="3.5" 
            strokeLinecap="round" 
            opacity={crackOpacity(20)}
            filter="url(#crackGlowStraw)"
          />
        )}
        {uvExposure > 50 && (
          <path 
            d="M 35 155 L 50 170 L 65 155" 
            fill="none" 
            stroke="#ba1a1a" 
            strokeWidth="3.5" 
            strokeLinecap="round" 
            opacity={crackOpacity(50)}
            filter="url(#crackGlowStraw)"
          />
        )}
        {uvExposure > 75 && (
          <path 
            d="M 35 225 L 52 245 L 65 230" 
            fill="none" 
            stroke="#e53935" 
            strokeWidth="4" 
            strokeLinecap="round" 
            opacity={crackOpacity(75)}
            filter="url(#crackGlowStraw)"
          />
        )}
      </svg>
    );
  }

  if (objectId === 'jug') {
    return (
      <svg viewBox="0 0 200 240" className={`h-full w-auto md:w-72 md:h-[350px] ${baseCls}`} style={{ filter }}>
        <defs>
          <filter id="crackGlowJug" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#ba1a1a" floodOpacity="0.8" />
          </filter>
        </defs>

        {/* Tutup Botol / Spout di Kiri Atas */}
        <rect x="36" y="14" width="44" height="24" rx="6" fill="#006e2f" stroke="#004d20" strokeWidth="2.5" />
        <line x1="44" y1="18" x2="44" y2="34" stroke="#004d20" strokeWidth="1.5" />
        <line x1="58" y1="18" x2="58" y2="34" stroke="#004d20" strokeWidth="1.5" />
        <line x1="72" y1="18" x2="72" y2="34" stroke="#004d20" strokeWidth="1.5" />

        {/* Bodi Utama Jerigen HDPE */}
        <rect x="32" y="36" width="115" height="186" rx="20" fill={obj.color} fillOpacity="0.9" stroke={obj.strokeColor} strokeWidth="3.5" />
        
        {/* Gagang Pegangan Jerigen (Molded Handle) */}
        <path d="M 147 65 Q 185 85 147 140" fill="none" stroke={obj.strokeColor} strokeWidth="18" strokeLinecap="round" />
        <path d="M 147 65 Q 185 85 147 140" fill="none" stroke={obj.color} strokeWidth="12" strokeLinecap="round" />

        {/* Kilau & Tulang Struktural */}
        <rect x="46" y="55" width="14" height="145" rx="7" fill="white" fillOpacity="0.35" />
        <line x1="40" y1="185" x2="140" y2="185" stroke="white" strokeWidth="2.5" strokeOpacity="0.4" />

        {/* Cetakan Emboss HDPE */}
        <rect x="65" y="105" width="55" height="42" rx="8" fill="white" fillOpacity="0.25" stroke="#1b5e20" strokeWidth="2" />
        <text x="92" y="122" textAnchor="middle" fill="#1b5e20" fontSize="9" fontWeight="bold">♴ KODE 2</text>
        <text x="92" y="137" textAnchor="middle" fill="#1b5e20" fontSize="13" fontWeight="900">HDPE</text>
        <text x="92" y="145" textAnchor="middle" fill="#1b5e20" fontSize="6.5" fontWeight="800">WADAH JERIGEN</text>

        {/* Retakan Struktural */}
        {uvExposure > 25 && (
          <path 
            d="M 50 75 L 75 95 L 65 120" 
            fill="none" 
            stroke="#ba1a1a" 
            strokeWidth="3" 
            strokeLinecap="round" 
            opacity={crackOpacity(25)}
            filter="url(#crackGlowJug)"
          />
        )}
        {uvExposure > 55 && (
          <path 
            d="M 130 90 L 105 125 L 120 150 L 95 185" 
            fill="none" 
            stroke="#ba1a1a" 
            strokeWidth="3.5" 
            strokeLinecap="round" 
            opacity={crackOpacity(55)}
            filter="url(#crackGlowJug)"
          />
        )}
        {uvExposure > 75 && (
          <path 
            d="M 50 170 L 80 195 L 125 185 M 155 90 L 170 110" 
            fill="none" 
            stroke="#e53935" 
            strokeWidth="3.5" 
            strokeLinecap="round" 
            opacity={crackOpacity(75)}
            filter="url(#crackGlowJug)"
          />
        )}
      </svg>
    );
  }

  return null;
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface Props {
  onComplete: () => void;
  videoUrl?: string;
  /** Siswa kembali dari Tahap 3: langsung ke evaluasi dengan jawaban yang sudah benar */
  startAtEnd?: boolean;
}

export default function Stage2Weathering({ onComplete, videoUrl = 'https://www.youtube.com/embed/dQw4w9WgXcQ', startAtEnd = false }: Props) {
  const { lkpdAnswers, setLkpdAnswer } = useJourneyStore();
  const [hasWatched, setHasWatched] = useState(startAtEnd);
  const [screen, setScreen] = useState<'lab' | 'evaluation'>(startAtEnd ? 'evaluation' : 'lab');
  const [labPhase, setLabPhase] = useState<LabPhase>('lab');
  const [selectedObject, setSelectedObject] = useState('bottle');
  const [testedObjects, setTestedObjects] = useState<string[]>(startAtEnd ? ['bottle'] : []);
  const [uvExposure, setUvExposure] = useState(0);
  const [bottleIntegrity, setBottleIntegrity] = useState(100);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'info' | 'error' | 'success'>('info');
  const [activeEffect, setActiveEffect] = useState<'uv' | 'wave' | 'bacteria' | null>(null);
  
  // State for evaluation questions
  const [answers, setAnswers] = useState<Record<number, string>>(() =>
    startAtEnd ? Object.fromEntries(EVALUATION_QUESTIONS.map(q => [q.id, q.correct])) : {},
  );
  const [showErrors, setShowErrors] = useState(false);
  const [focusQuestion, setFocusQuestion] = useState<number | null>(null);
  const [summaryMissing, setSummaryMissing] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const [useFallbackBreak, setUseFallbackBreak] = useState(false);
  const [hasBurst, setHasBurst] = useState(false);
  const [showAr, setShowAr] = useState(false);
  const animRef = useRef<number>(0);
  const phaseRef = useRef(labPhase);
  phaseRef.current = labPhase;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const voiceFilesMissingRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const breakBuffersRef = useRef<Partial<Record<keyof typeof BREAK_AUDIO_URLS, AudioBuffer>>>({});
  const scheduledVoiceRef = useRef<{ source?: AudioBufferSourceNode; timer?: number }>({});
  const [showOceanSampleModal, setShowOceanSampleModal] = useState(false);

  const showMessage = (text: string, type: 'info' | 'error' | 'success' = 'info') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 3500);
  };

  const handleSelectObject = (id: string) => {
    if (labPhase === 'breaking') return;
    stopVoice();
    setSelectedObject(id);
    setUvExposure(0);
    setBottleIntegrity(100);
    setLabPhase('lab');
    setMessage('');
  };

  const handleResetCurrent = () => {
    setUvExposure(0);
    setBottleIntegrity(100);
    setLabPhase('lab');
    setMessage('');
    stopVoice();
    showMessage(`Sampel objek telah di-reset ke kondisi awal. Silakan uji coba lagi!`, 'info');
  };

  const stopVoice = useCallback(() => {
    if (voiceAudioRef.current) {
      voiceAudioRef.current.onended = null;
      voiceAudioRef.current.onerror = null;
      voiceAudioRef.current.pause();
      voiceAudioRef.current = null;
    }
    window.clearTimeout(scheduledVoiceRef.current.timer);
    if (scheduledVoiceRef.current.source) {
      scheduledVoiceRef.current.source.onended = null;
      try {
        scheduledVoiceRef.current.source.stop();
      } catch {
        // Sudah selesai diputar
      }
    }
    scheduledVoiceRef.current = {};
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  /** Suara bawaan HP: pilih suara wanita Indonesia yang terdengar paling natural */
  const speakWithDeviceVoice = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setIsSpeaking(false);
      return;
    }
    const indonesian = window.speechSynthesis
      .getVoices()
      .filter(v => /^(id|in)[-_]/i.test(v.lang));
    const voice = FEMALE_VOICE_HINTS.map(hint => indonesian.find(v => hint.test(v.name))).find(Boolean) ?? indonesian[0];
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    if (voice) utterance.voice = voice;
    utterance.rate = 1.05;
    utterance.pitch = 1.2;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, []);

  /** MP3 di public/audio/mika bila tersedia; bila belum ada, memakai suara bawaan HP */
  const speakMika = useCallback((key: VoiceLine) => {
    stopVoice();
    const text = MIKA_VOICE_LINES[key];
    if (voiceFilesMissingRef.current) {
      speakWithDeviceVoice(text);
      return;
    }
    const audio = new Audio(`/audio/mika/tahap2-${key}.mp3`);
    voiceAudioRef.current = audio;
    const fallBack = () => {
      if (voiceAudioRef.current !== audio) return;
      voiceAudioRef.current = null;
      voiceFilesMissingRef.current = true;
      speakWithDeviceVoice(text);
    };
    audio.onended = () => setIsSpeaking(false);
    audio.onerror = fallBack;
    setIsSpeaking(true);
    audio.play().catch((err: Error) => {
      // Diblokir browser bukan berarti berkasnya hilang
      if (err.name === 'NotAllowedError') setIsSpeaking(false);
      else fallBack();
    });
  }, [speakWithDeviceVoice, stopVoice]);

  /** Retak, pecah, lalu suara Mika dijadwalkan bersama agar pas dengan animasi */
  const playBreakAudio = useCallback(() => {
    const ctx = audioCtxRef.current;
    const { crack, shatter, voice } = breakBuffersRef.current;
    if (ctx && crack && shatter) {
      const start = ctx.currentTime + 0.02;
      const play = (buffer: AudioBuffer, at: number, offset: number, duration?: number) => {
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(start + at, offset, duration);
      };
      play(crack, 0, CRACK_FIRST.offset, CRACK_FIRST.duration);
      play(crack, CRACK_SECOND.at, CRACK_SECOND.offset, CRACK_SECOND.duration);
      play(shatter, CRACK_END, SHATTER_OFFSET);
    }
    if (ctx && voice) {
      const source = ctx.createBufferSource();
      source.buffer = voice;
      source.connect(ctx.destination);
      source.onended = () => setIsSpeaking(false);
      source.start(ctx.currentTime + BROKEN_VOICE_AT);
      scheduledVoiceRef.current = {
        source,
        timer: window.setTimeout(() => setIsSpeaking(true), BROKEN_VOICE_AT * 1000),
      };
    } else {
      scheduledVoiceRef.current = {
        timer: window.setTimeout(() => speakMika('broken'), BROKEN_VOICE_AT * 1000),
      };
    }
  }, [speakMika]);

  // Unduh suara pecah lebih awal; AudioContext diaktifkan saat siswa menyentuh alat
  useEffect(() => {
    if (!hasWatched || audioCtxRef.current) return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    audioCtxRef.current = ctx;
    (Object.keys(BREAK_AUDIO_URLS) as (keyof typeof BREAK_AUDIO_URLS)[]).forEach(key => {
      fetch(BREAK_AUDIO_URLS[key])
        .then(res => res.arrayBuffer())
        .then(data => ctx.decodeAudioData(data))
        .then(buffer => {
          breakBuffersRef.current[key] = buffer;
        })
        .catch(err => console.warn('Suara gagal dimuat:', key, err));
    });
  }, [hasWatched]);

  useEffect(() => () => {
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
  }, []);

  // Evaluasi -> hasil lab -> lab -> video
  useStageBack(() => {
    if (hasWatched && screen === 'evaluation') {
      setScreen('lab');
      return true;
    }
    if (hasWatched) {
      stopVoice();
      // Hasil pecah, atau animasi yang sedang berjalan, kembali ke lab
      if (labPhase !== 'lab') {
        setLabPhase('lab');
        setUvExposure(0);
        setBottleIntegrity(100);
        setMessage('');
        return true;
      }
      setHasWatched(false);
      return true;
    }
    return false;
  }, 1);

  const toggleVoiceGuide = () => {
    if (isSpeaking) stopVoice();
    else speakMika('intro');
  };

  // Daftar suara HP dimuat asinkron; hentikan suara saat keluar dari halaman
  useEffect(() => {
    if ('speechSynthesis' in window) window.speechSynthesis.getVoices();
    return stopVoice;
  }, [stopVoice]);

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

  const handleApplyTool = (tool: 'uv' | 'wave' | 'bacteria') => {
    if (labPhase === 'breaking' || labPhase === 'complete') return;
    // Browser HP hanya mengizinkan audio aktif dari sentuhan siswa
    audioCtxRef.current?.resume().catch(() => {});

    if (tool === 'bacteria') {
      setActiveEffect('bacteria');
      playSound('error');
      speakMika('bacteria');
      showMessage('Bakteri menyerah! Plastik buatan manusia, jadi tidak bisa ia uraikan.', 'error');
    } else if (tool === 'uv') {
      setActiveEffect('uv');
      playSound('uv');
      if (uvExposure < 50 && uvExposure + 35 >= 50) speakMika('uvReady');
      if (uvExposure < 100) {
        setUvExposure(prev => {
          const next = Math.min(100, prev + 35);
          if (next >= 100) {
            showMessage('Sudah sangat rapuh! Hantam terus pakai Ombak!', 'success');
          } else {
            showMessage(`Plastiknya mulai rapuh (${next}%). Terus!`, 'info');
          }
          return next;
        });
      } else {
        showMessage('Sudah cukup dijemur! Sekarang pakai Ombak!', 'info');
      }
    } else if (tool === 'wave') {
      setActiveEffect('wave');
      playSound('wave');
      if (uvExposure < 50) {
        speakMika('waveEarly');
        showMessage('Plastiknya masih kuat! Jemur dulu pakai Matahari.', 'error');
      } else {
        const damage = uvExposure >= 100 ? 50 : 35;
        setBottleIntegrity(prev => {
          const next = Math.max(0, prev - damage);
          if (next <= 0) {
            triggerBreak();
          } else {
            showMessage(`Retak! Tinggal ${next}%. Hantam lagi!`, 'success');
          }
          return next;
        });
      }
    }
    
    setTimeout(() => setActiveEffect(null), 1200);
  };

  const handleDragEnd = (tool: 'uv' | 'wave' | 'bacteria', info: PanInfo) => {
    // Geser ke atas minimal 15px atau geser dinamis memicu alat
    if (info.offset.y < -15 || Math.abs(info.offset.x) > 25) {
      handleApplyTool(tool);
    }
  };

  const triggerBreak = useCallback(() => {
    if (phaseRef.current === 'breaking' || phaseRef.current === 'complete') return;
    setHasBurst(false);
    setLabPhase('breaking');
    stopVoice();
    showMessage('Pecah jadi serpihan sangat kecil!', 'success');
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
  }, [stopVoice]);

  const markBurst = useCallback(() => setHasBurst(true), []);
  const markFallback = useCallback(() => setUseFallbackBreak(true), []);

  const finishBreak = useCallback(() => {
    setLabPhase('complete');
    setTestedObjects(prev => Array.from(new Set([...prev, selectedObject])));
  }, [selectedObject]);

  // Muat pustaka 3D lebih awal agar animasi pecah langsung tampil
  useEffect(() => {
    if (hasWatched) import('three').catch(() => setUseFallbackBreak(true));
  }, [hasWatched]);

  // Animasi 2D hanya dipakai bila 3D tidak tersedia di perangkat
  useEffect(() => {
    if (labPhase !== 'breaking' || !useFallbackBreak) return;
    playBreakAudio();
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
        setTimeout(finishBreak, 400);
      }
    }
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [labPhase, useFallbackBreak, finishBreak, playBreakAudio]);

  const obj = PLASTIC_OBJECTS.find(o => o.id === selectedObject)!;


  /** Soal kosong atau salah pertama langsung dibawa ke tengah layar, begitu juga kesimpulan yang belum diisi */
  const handleSubmitEvaluation = () => {
    const firstProblem = EVALUATION_QUESTIONS.find(q => answers[q.id] !== q.correct);
    if (firstProblem) {
      setShowErrors(true);
      setSummaryMissing(false);
      setFocusQuestion(firstProblem.id);
      document.getElementById(`soal-${firstProblem.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.setTimeout(() => setFocusQuestion(null), 1800);
      return;
    }
    if (!lkpdAnswers.lkpdStep2.trim()) {
      setSummaryMissing(true);
      const field = document.getElementById('kesimpulan-lkpd');
      field?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      field?.focus({ preventScroll: true });
      return;
    }
    onComplete();
  };

  return (
    <div className="w-full h-full font-[family-name:var(--font-inter)] relative flex flex-col items-center justify-start max-w-5xl mx-auto py-2 md:py-6">

      {/* ── PHASE 1: VIDEO TAYANGAN AWAL ── */}
      <AnimatePresence mode="wait">
        {!hasWatched && (
          <motion.div 
            key="video-phase"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-3xl mx-auto flex flex-col gap-3 [@media(min-height:720px)]:gap-5 md:gap-6 md:mt-4"
          >
            <div className="text-center">
              <div className="hidden [@media(min-height:720px)]:inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#6bff8f]/10 border border-[#6bff8f]/30 text-[#6bff8f] text-xs font-bold uppercase tracking-widest mb-3 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#6bff8f] animate-pulse" />
                Uji Pelapukan
              </div>
              <h1 className="text-2xl [@media(min-height:720px)]:text-3xl md:text-4xl font-extrabold text-white font-[family-name:var(--font-outfit)] leading-tight mb-1 md:mb-2 drop-shadow-md">
                Tahap 2: Pelapukan Plastik
              </h1>
              <p className="text-blue-100 text-sm md:text-base font-medium max-w-xl mx-auto">
                Tonton videonya dulu, lalu coba sendiri di lab.
              </p>
            </div>

            {/* Video Player - Soft Glass Frame with YouTube option */}
            <div className="md:p-2 md:bg-white/10 md:backdrop-blur-xl md:border md:border-white/20 rounded-3xl md:shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
              <YouTubePlayer url={videoUrl} title="Video Pelapukan Mikroplastik" />
            </div>

            {/* Button Lanjut */}
            <div className="flex justify-center md:mt-2 md:mb-16">
              <motion.button
                onClick={() => {
                  setHasWatched(true);
                  speakMika('intro');
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative inline-flex items-center justify-center gap-2 md:gap-3 px-9 py-3 md:px-10 md:py-4 font-extrabold text-[#3b2313] text-lg md:text-xl font-[family-name:var(--font-outfit)] transition-all"
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

        {/* ── PHASE 2: VIRTUAL LAB SCREEN ── */}
        {hasWatched && screen === 'lab' && (
          <motion.div 
            key="lab-phase"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full flex flex-col gap-2 md:gap-6 h-[calc(100dvh-7.75rem)] md:h-auto"
          >
            {/* Object Selection Tabs & Direct Navigation to Evaluation */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-2 md:gap-3 w-full shrink-0">
              <div className="grid grid-cols-5 gap-1.5 w-full md:flex md:flex-wrap md:gap-3 md:justify-start md:flex-1">
                {PLASTIC_OBJECTS.map(item => {
                  const isTested = testedObjects.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectObject(item.id)}
                      className={`flex flex-col items-center gap-0.5 md:gap-1 px-0.5 py-1.5 md:px-5 md:py-3 rounded-xl md:rounded-3xl transition-all border-2 relative ${
                        selectedObject === item.id 
                          ? 'bg-gradient-to-b from-white to-[#e4f1f9] border-[#6bff8f] text-[#083b54] shadow-[0_0_20px_rgba(107,255,143,0.4)] md:scale-105 z-10 font-bold' 
                          : 'bg-white/10 backdrop-blur-md border-white/20 text-white/90 hover:bg-white/20 hover:text-white hover:scale-105'
                      }`}
                    >
                      {isTested && (
                        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#006e2f] border-2 border-[#6bff8f] text-white flex items-center justify-center text-[10px] font-extrabold shadow-sm">
                          <span className="material-symbols-outlined text-[13px] leading-none">check</span>
                        </span>
                      )}
                      <span className="text-xl md:text-3xl leading-none">{item.emoji}</span>
                      <span className="text-[11px] md:hidden font-bold leading-tight font-[family-name:var(--font-outfit)]">{item.label.split(' ')[0]}</span>
                      <span className="hidden md:inline text-xs font-extrabold font-[family-name:var(--font-outfit)]">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Tombol Menuju Evaluasi */}
              <button
                onClick={() => {
                  setScreen('evaluation');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`${testedObjects.length > 0 ? 'inline-flex' : 'hidden md:inline-flex'} w-full md:w-auto justify-center items-center gap-2 px-5 py-2 md:py-3 rounded-xl md:rounded-2xl font-extrabold text-sm text-[#3b2313] transition-all shadow-xl active:scale-95 border-2 border-[#8e4912] flex-shrink-0`}
                style={{
                  background: 'linear-gradient(to bottom, #f0a345, #d27b22)',
                }}
              >
                <span className="material-symbols-outlined text-base">assignment</span>
                <span>Lanjut ke Evaluasi {testedObjects.length > 0 ? `(${testedObjects.length}/5 dicoba)` : ''}</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>

            {/* The Lab Area - Spacious Water Aquarium Container */}
            <div className="w-full flex-1 min-h-0 md:flex-none md:min-h-[920px] rounded-3xl md:rounded-[40px] overflow-hidden shadow-2xl relative flex flex-col justify-between border-[3px] md:border-[4px] border-white/40 bg-gradient-to-b from-[#87CEEB] to-[#004c6e] transition-all duration-700">
              
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
                    className="absolute top-14 md:top-20 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm"
                  >
                    <div className={`px-4 py-2 md:px-6 md:py-2.5 rounded-2xl md:rounded-full shadow-lg backdrop-blur-md border-2 text-center text-xs md:text-sm font-bold ${
                      messageType === 'error' ? 'bg-white/95 border-[#ba1a1a] text-[#ba1a1a]' :
                      messageType === 'success' ? 'bg-white/95 border-[#006e2f] text-[#006e2f]' :
                      'bg-white/95 border-[#006591] text-[#006591]'
                    }`}>
                      {message}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Top HUD Bar */}
              <div className="relative z-20 w-full px-2.5 pt-2.5 sm:px-6 sm:pt-5 flex items-center justify-between gap-2 shrink-0">
                {/* Left Controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setShowOceanSampleModal(true)}
                    title="Kenapa pakai sampel laut?"
                    aria-label="Kenapa pakai sampel laut?"
                    className="flex items-center justify-center gap-1.5 min-w-10 h-10 md:px-3 rounded-full bg-white/90 hover:bg-white text-[#006591] text-xs font-bold border border-[#006591]/30 shadow-md transition-all active:scale-95"
                  >
                    <span className="material-symbols-outlined text-xl text-[#006591]">help</span>
                    <span className="hidden md:inline">Kenapa Sampel Laut?</span>
                  </button>
                  <button
                    onClick={toggleVoiceGuide}
                    title={isSpeaking ? 'Hentikan suara Mika' : 'Dengarkan Mika'}
                    aria-label={isSpeaking ? 'Hentikan suara Mika' : 'Dengarkan Mika'}
                    className={`flex items-center justify-center gap-1.5 min-w-10 h-10 md:px-3 rounded-full border text-xs font-bold shadow-md transition-all active:scale-95 ${
                      isSpeaking 
                        ? 'bg-[#6bff8f] text-[#083b54] border-[#006e2f] animate-pulse ring-2 ring-[#6bff8f]' 
                        : 'bg-white/90 backdrop-blur-md border-[#006591]/30 text-[#006591] hover:bg-[#006591] hover:text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xl">
                      {isSpeaking ? 'volume_up' : 'record_voice_over'}
                    </span>
                    <span className="hidden md:inline">{isSpeaking ? 'Mika berbicara...' : 'Dengarkan Mika'}</span>
                  </button>
                  <button
                    onClick={handleResetCurrent}
                    title="Ulangi dari awal"
                    aria-label="Ulangi dari awal"
                    className="flex items-center justify-center gap-1.5 min-w-10 h-10 md:px-3 rounded-full bg-white/90 hover:bg-white text-[#006591] text-xs font-bold border border-[#006591]/30 shadow-md transition-all active:scale-95"
                  >
                    <span className="material-symbols-outlined text-xl text-[#006591]">restart_alt</span>
                    <span className="hidden md:inline">Ulangi</span>
                  </button>
                </div>

                {/* Right Indicators */}
                <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1 justify-end">
                  <div className="bg-white/85 backdrop-blur-sm border border-white rounded-xl md:rounded-2xl px-2 py-1.5 md:px-4 md:py-2 min-w-0 flex-1 md:flex-none md:w-36 shadow-sm">
                    <p className="text-[#006591] text-[11px] md:text-xs font-bold mb-0.5 md:mb-1 flex justify-between gap-1">
                      <span>Rapuh</span> <span>{uvExposure}%</span>
                    </p>
                    <div className="w-full bg-[#c9e6ff] h-2 md:h-2.5 rounded-full overflow-hidden shadow-inner">
                      <motion.div className="h-full bg-[#f0a345]" animate={{ width: `${uvExposure}%` }} />
                    </div>
                  </div>
                  <div className="bg-white/85 backdrop-blur-sm border border-white rounded-xl md:rounded-2xl px-2 py-1.5 md:px-4 md:py-2 min-w-0 flex-1 md:flex-none md:w-36 shadow-sm">
                    <p className="text-[#006e2f] text-[11px] md:text-xs font-bold mb-0.5 md:mb-1 flex justify-between gap-1">
                      <span>Utuh</span> <span>{bottleIntegrity}%</span>
                    </p>
                    <div className="w-full bg-[#c9e6ff] h-2 md:h-2.5 rounded-full overflow-hidden shadow-inner">
                      <motion.div className="h-full bg-[#6bff8f]" animate={{ width: `${bottleIntegrity}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Canvas Area (Central Focus) */}
              <div className="flex-1 min-h-0 relative flex items-center justify-center md:py-10 md:my-auto md:min-h-[520px]">
                
                {/* Visual Effects Render */}
                {activeEffect === 'uv' && (
                  <motion.div 
                    initial={{ scale: 0, opacity: 1, rotate: 0 }} 
                    animate={{ scale: 3.5, opacity: 0, rotate: 90 }} 
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className="absolute w-36 h-36 bg-gradient-to-tr from-[#ffeb3b] to-[#ff9800] rounded-full mix-blend-screen blur-xl pointer-events-none z-10"
                  />
                )}
                
                {activeEffect === 'wave' && (
                  <motion.div 
                    initial={{ scale: 0.5, opacity: 1, y: 50 }} 
                    animate={{ scale: 2.2, opacity: 0, y: -50 }} 
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="absolute w-full h-full flex items-center justify-center pointer-events-none z-10"
                  >
                    <div className="w-44 h-44 border-[10px] border-white/60 rounded-full blur-md" />
                    <div className="absolute w-28 h-28 border-[6px] border-[#c9e6ff]/80 rounded-full blur-sm" />
                  </motion.div>
                )}

                {activeEffect === 'bacteria' && (
                  <motion.div className="absolute w-full h-full flex items-center justify-center pointer-events-none z-10">
                     {[...Array(6)].map((_, i) => (
                       <motion.div 
                         key={`bac-${i}`} 
                         initial={{ opacity: 1, y: 0, x: 0, scale: 1 }} 
                         animate={{ opacity: 0, y: -80, x: (Math.random()-0.5)*120, scale: 0.5 }} 
                         transition={{ duration: 1.2, ease: "easeOut" }} 
                         className="absolute material-symbols-outlined text-3xl sm:text-4xl text-[#c8e6c9]"
                       >
                         coronavirus
                       </motion.div>
                     ))}
                  </motion.div>
                )}

                {/* Benda asli tetap tampil dan rusak bertahap sampai pecahan 3D mengambil alih */}
                {(labPhase === 'lab' || (labPhase === 'breaking' && !hasBurst && !useFallbackBreak)) && (
                  <motion.div
                    animate={labPhase === 'lab' ? { y: [0, -14, 0], rotate: [-1, 1, -1] } : { y: 0, rotate: 0 }}
                    transition={labPhase === 'lab' ? { duration: 4.5, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.1 }}
                    className="absolute inset-2 md:relative md:inset-auto z-10 flex items-center justify-center md:p-2"
                  >
                    {/* Berguncang tiap kena ombak, dan bergetar makin kuat sesaat sebelum pecah */}
                    <motion.div
                      key={`hit-${bottleIntegrity}-${labPhase}`}
                      className="h-full md:h-auto flex items-center justify-center"
                      initial={false}
                      animate={
                        labPhase === 'breaking'
                          ? { x: [0, -3, 3, -5, 5, -8, 8, -10, 10, 0], rotate: [0, -0.5, 0.5, -1, 1, -1.5, 1.5, -2, 2, 0] }
                          : bottleIntegrity < 100
                          ? { x: [0, -12, 11, -8, 6, -3, 0], rotate: [0, -3, 3, -2, 1, 0, 0] }
                          : {}
                      }
                      transition={{ duration: labPhase === 'breaking' ? CRACK_END : 0.55, ease: 'easeOut' }}
                    >
                      <PlasticSVG objectId={selectedObject} uvExposure={uvExposure} integrity={bottleIntegrity} breaking={false} />
                    </motion.div>
                  </motion.div>
                )}

                {/* Celebration Card When Broken: Try again OR Go to Evaluation */}
                {labPhase === 'complete' && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    className="flex flex-col items-center z-20 text-center max-w-md mx-3 p-4 md:p-8 bg-[#083b54]/95 backdrop-blur-xl border-3 border-[#6bff8f] rounded-[28px] shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                  >
                    <div className="w-14 h-14 md:w-20 md:h-20 rounded-full bg-[#6bff8f]/20 border-2 border-[#6bff8f] flex items-center justify-center text-3xl md:text-5xl mb-2 md:mb-3 shadow-xl animate-bounce">
                      <span className="material-symbols-outlined text-3xl md:text-4xl text-[#6bff8f]">celebration</span>
                    </div>
                    <h3 className="font-extrabold font-[family-name:var(--font-outfit)] text-white text-2xl sm:text-3xl drop-shadow-md">
                      Berhasil pecah!
                    </h3>
                    <p className="text-[#6bff8f] font-bold text-sm sm:text-base mt-1 drop-shadow-sm">
                      {obj.label} jadi mikroplastik!
                    </p>
                    <p className="text-blue-100 text-xs sm:text-sm mt-2 leading-relaxed">
                      Matahari membuat plastik rapuh, lalu ombak memecahnya jadi serpihan sangat kecil. Serpihan ini tetap ada di laut, lho!
                    </p>

                    <button
                      onClick={() => {
                        stopVoice();
                        setShowAr(true);
                      }}
                      className="mt-3 md:mt-5 w-full min-h-12 py-2 px-3 rounded-xl bg-[#6bff8f] hover:bg-[#4ee876] text-[#06293b] font-extrabold text-sm sm:text-base transition-all flex items-center justify-center gap-2 shadow-xl active:scale-95"
                    >
                      <span className="material-symbols-outlined text-xl">view_in_ar</span>
                      <span>Lihat mikroplastik di AR</span>
                    </button>

                    {/* Dua Pilihan Interaksi: Coba Uji Lagi ATAU Lanjut ke Halaman Evaluasi */}
                    <div className="flex flex-row items-stretch gap-2 md:gap-3 mt-2 md:mt-3 w-full">
                      <button
                        onClick={handleResetCurrent}
                        className="flex-1 min-h-12 py-2 px-2 md:px-4 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs sm:text-sm border border-white/30 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-md"
                      >
                        <span className="material-symbols-outlined text-base">replay</span>
                        <span>Coba lagi</span>
                      </button>
                      <button
                        onClick={() => {
                          setScreen('evaluation');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="flex-1 min-h-12 py-2 px-2 md:px-4 rounded-xl font-extrabold text-sm text-[#3b2313] transition-all flex items-center justify-center gap-2 shadow-xl active:scale-95"
                        style={{
                          background: 'linear-gradient(to bottom, #f0a345, #d27b22)',
                          border: '2px solid #8e4912',
                        }}
                      >
                        <span>Evaluasi</span>
                        <span className="material-symbols-outlined text-base">arrow_forward</span>
                      </button>
                    </div>
                  </motion.div>
                )}
                {(labPhase === 'breaking' || labPhase === 'complete') && !useFallbackBreak && (
                  <PlasticShatter3D
                    objectId={selectedObject}
                    uvExposure={uvExposure}
                    onStart={playBreakAudio}
                    onBurst={markBurst}
                    onDone={finishBreak}
                    onUnavailable={markFallback}
                    paused={showAr}
                  />
                )}
                {showAr && <MicroplasticAR onClose={() => setShowAr(false)} />}
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-10" />
              </div>

              {/* Draggable Tools Desk (Bottom) */}
              <AnimatePresence>
                {(labPhase === 'lab' || (labPhase === 'breaking' && !hasBurst && !useFallbackBreak)) && (
                  <motion.div 
                    initial={{ y: 40, opacity: 0 }} 
                    animate={{ y: 0, opacity: 1 }} 
                    exit={{ y: 40, opacity: 0 }}
                    className="relative z-20 w-full p-2 sm:p-4 flex flex-col items-center bg-white/15 backdrop-blur-md border-t border-white/30 shrink-0"
                  >
                    {/* Petunjuk satu kalimat dari Mika sesuai langkah saat ini */}
                    <div className="w-full max-w-2xl mx-auto mb-2 px-2.5 py-1.5 sm:py-2.5 bg-[#083b54]/95 border-2 border-[#f0a345] rounded-2xl shadow-xl flex items-center gap-2">
                      <img
                        src="/mika.webp"
                        alt="Mika"
                        className={`w-9 h-9 sm:w-12 sm:h-12 object-contain flex-shrink-0 drop-shadow-md ${isSpeaking ? 'animate-bounce' : ''}`}
                      />
                      <p className="flex-1 min-w-0 text-left text-white text-sm font-semibold leading-snug">
                        {uvExposure === 0
                          ? 'Seret Matahari ke plastiknya!'
                          : uvExposure < 50
                          ? 'Bagus! Jemur lagi biar makin rapuh.'
                          : bottleIntegrity === 100
                          ? 'Mulai rapuh! Hantam pakai Ombak!'
                          : 'Terus hantam sampai pecah!'}
                      </p>
                    </div>

                    {/* 3 Tool Tiles */}
                    <div className="flex justify-center gap-2 sm:gap-4 md:gap-6 w-full">
                      <ToolTile id="uv" icon="wb_sunny" label="Matahari" desc="Sinar UV" color="from-[#fff3d4] to-[#fde08b]" textColor="text-[#b27b00]" onDragEnd={handleDragEnd} onClick={() => handleApplyTool('uv')} />
                      <ToolTile id="wave" icon="waves" label="Ombak" desc="Abrasi" color="from-[#e4f1f9] to-[#c9e6ff]" textColor="text-[#006591]" onDragEnd={handleDragEnd} onClick={() => handleApplyTool('wave')} />
                      <ToolTile id="bacteria" icon="coronavirus" label="Bakteri" desc="Biodegradasi" color="from-[#e6f4ea] to-[#c8e6c9]" textColor="text-[#006e2f]" onDragEnd={handleDragEnd} onClick={() => handleApplyTool('bacteria')} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* ── PHASE 3: EVALUATION & LKPD (DEDICATED FULL SCREEN) ── */}
        {hasWatched && screen === 'evaluation' && (
          <motion.div 
            key="evaluation-screen"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full flex flex-col gap-6 max-w-4xl mx-auto mt-2 mb-20"
          >
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-blue-100">
              <span className="w-2.5 h-2.5 rounded-full bg-[#6bff8f] animate-pulse" />
              <span>Halaman Evaluasi &amp; LKPD · {testedObjects.length} Sampel Teruji</span>
            </div>

            {/* The Evaluation Container */}
            <div className="bg-white/10 backdrop-blur-xl rounded-[32px] p-6 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.4)] border border-white/20">
              {/* Header Banner with Mika Mascot */}
              <div className="flex items-center gap-4 mb-8 border-b border-white/15 pb-6">
                <img 
                  src="/mika.webp" 
                  alt="Mika" 
                  className="w-14 h-14 sm:w-16 sm:h-16 object-contain flex-shrink-0 drop-shadow-md" 
                />
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#6bff8f]/20 border border-[#6bff8f]/40 text-[#6bff8f] text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1">
                    <span className="material-symbols-outlined text-xs">assignment</span>
                    Lembar Kerja Peserta Didik (LKPD)
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-[family-name:var(--font-outfit)]">
                    Evaluasi Eksperimen Pelapukan
                  </h2>
                  <p className="text-blue-100 text-xs sm:text-sm mt-1">
                    Jawab 3 pertanyaan analisis berikut dan tuliskan kesimpulanmu berdasarkan hasil eksperimen di laboratorium tadi.
                  </p>
                </div>
              </div>

              {/* The 3 Questions */}
              <div className="flex flex-col gap-8">
                {EVALUATION_QUESTIONS.map((q, index) => {
                  const isAnswered = !!answers[q.id];
                  const isCorrect = answers[q.id] === q.correct;
                  const showError = showErrors && !isCorrect;

                  return (
                    <div
                      key={q.id}
                      id={`soal-${q.id}`}
                      className={`flex flex-col gap-3 rounded-2xl transition-all duration-300 ${focusQuestion === q.id ? 'ring-2 ring-[#ff8c8c] ring-offset-8 ring-offset-transparent' : ''}`}
                    >
                      <h3 className="font-bold text-white text-base sm:text-lg flex gap-2">
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
                              className={`p-4 rounded-2xl border-2 text-left transition-all text-xs sm:text-sm font-semibold flex items-start gap-3 ${bgClass}`}
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
                        <div className="flex items-center gap-2 mt-1 p-2.5 rounded-xl bg-[#ba1a1a]/20 border border-[#ba1a1a]/40 text-[#ff8c8c] text-xs font-bold">
                          <span className="material-symbols-outlined text-sm">info</span>
                          <span>{isAnswered ? 'Jawaban ini kurang tepat. Coba pilih lagi, atau tekan Kembali di atas untuk mengulang lab.' : 'Soal ini belum dijawab.'}</span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* LKPD Textarea for Stage 2 */}
                <div className="mt-4 p-5 sm:p-6 bg-white/5 border border-white/20 rounded-2xl">
                  <label className="block text-sm font-bold text-white mb-2 uppercase font-[family-name:var(--font-outfit)] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#f0a345] text-lg">edit_note</span>
                    Tuliskan Kesimpulan Analisismu (LKPD Tahap 2)
                  </label>
                  <p className="text-blue-200 text-xs mb-3 leading-relaxed">
                    Berdasarkan simulasi laboratorium dan pertanyaan di atas, simpulkan bagaimana sampah plastik utuh di alam bisa berakhir menjadi mikroplastik yang mencemari lautan dan membahayakan biota laut.
                  </p>
                  <textarea
                    id="kesimpulan-lkpd"
                    value={lkpdAnswers.lkpdStep2}
                    onChange={(e) => {
                      setLkpdAnswer('lkpdStep2', e.target.value);
                      setSummaryMissing(false);
                    }}
                    placeholder="Contoh: Plastik di alam mengalami pelapukan oleh panas matahari (sinar UV) sehingga ikatan polimernya getas..."
                    className="w-full h-32 p-4 bg-white/10 text-white border-2 border-white/30 rounded-xl text-sm placeholder:text-blue-300/60 focus:border-[#6bff8f] focus:ring-0 outline-none resize-none transition-all leading-relaxed"
                  />
                  {summaryMissing && (
                    <p className="mt-2 text-xs font-bold text-[#ff8c8c]">Isi dulu kesimpulanmu sebelum melanjutkan.</p>
                  )}
                </div>
              </div>

              {/* Navigation Footer */}
              <div className="mt-8 pt-6 border-t border-white/15 flex justify-end">
                <motion.button
                  onClick={handleSubmitEvaluation}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full sm:w-auto relative inline-flex items-center justify-center gap-3 px-10 py-4 font-extrabold text-[#3b2313] text-lg font-[family-name:var(--font-outfit)] transition-all"
                  style={{
                    background: 'linear-gradient(to bottom, #f0a345, #d27b22)',
                    border: '3px solid #8e4912',
                    borderRadius: '20px',
                    boxShadow: 'inset 0 4px 0 rgba(255,255,255,0.3), inset 0 -4px 0 rgba(0,0,0,0.2), 0 8px 16px rgba(0,0,0,0.3)',
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

      {/* Modal: Mengapa Laut Menjadi Sampel Utama? */}
      <AnimatePresence>
        {showOceanSampleModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border-2 border-[#c9e6ff] text-[#083b54]"
            >
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-2xl text-[#006591]">waves</span>
                  <h3 className="text-lg sm:text-xl font-bold font-[family-name:var(--font-outfit)] text-[#006591]">
                    Mengapa Laut Menjadi Sampel Utama?
                  </h3>
                </div>
                <button
                  onClick={() => setShowOceanSampleModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-500"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-[#3e4850] leading-relaxed">
                <div className="p-3.5 rounded-2xl bg-[#f0f8ff] border border-[#d0e6f7] flex gap-3">
                  <span className="material-symbols-outlined text-2xl flex-shrink-0 text-[#006591]">waves</span>
                  <div>
                    <strong className="text-[#083b54] block mb-0.5">1. Muara Akhir Sampah Dunia (Ultimate Sink)</strong>
                    Lebih dari 80% sampah plastik dari daratan terbawa aliran selokan, sungai, dan hujan hingga akhirnya bermuara di lautan lepas.
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#fff8ed] border border-[#fde3c4] flex gap-3">
                  <span className="material-symbols-outlined text-2xl flex-shrink-0 text-[#d27b22]">wb_sunny</span>
                  <div>
                    <strong className="text-[#083b54] block mb-0.5">2. Katalis Pelapukan Alami Terbesar</strong>
                    Di lautan terbuka, plastik terpapar radiasi fotooksidasi UV matahari dan abrasi mekanis hantaman ombak pantai tanpa henti bertahun-tahun.
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#edf9f0] border border-[#cbeed4] flex gap-3">
                  <span className="material-symbols-outlined text-2xl flex-shrink-0 text-[#006e2f]">restaurant</span>
                  <div>
                    <strong className="text-[#083b54] block mb-0.5">3. Rute Kembali ke Piring Makanan Manusia</strong>
                    Partikel mikroplastik menyerupai plankton, dimakan ikan dan hewan penyaring (kerang), serta mengendap pada penguapan garam laut yang kita konsumsi kembali!
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowOceanSampleModal(false)}
                className="w-full mt-6 bg-[#006591] hover:bg-[#004c6e] text-white font-bold py-3 rounded-xl text-sm transition-all shadow-md"
              >
                Paham, Lanjutkan Eksperimen!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Helper component for Draggable Tools (Comfortable Soft Tiles)
function ToolTile({ id, icon, label, desc, color, textColor, onDragEnd, onClick }: { 
  id: any, icon: string, label: string, desc: string, color: string, textColor: string, onDragEnd: any, onClick?: () => void 
}) {
  return (
    <motion.div
      drag 
      dragSnapToOrigin
      onDragEnd={(_, info) => onDragEnd(id, info)}
      onClick={onClick}
      whileDrag={{ scale: 1.14, zIndex: 50, rotate: id === 'uv' ? -4 : 4 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`flex-1 max-w-32 h-[4.25rem] md:flex-none md:w-32 md:h-32 md:max-w-none rounded-2xl md:rounded-3xl flex flex-col items-center justify-center md:gap-1 cursor-grab active:cursor-grabbing touch-none shadow-md bg-gradient-to-br ${color} border-2 md:border-[3px] border-white hover:shadow-xl transition-all select-none`}
    >
      <span className={`material-symbols-outlined ${textColor} text-3xl md:text-5xl pointer-events-none`}>{icon}</span>
      <div className="text-center px-1 pointer-events-none">
        <div className={`text-[13px] md:text-sm font-extrabold ${textColor} leading-tight`}>{label}</div>
        <div className={`hidden md:block text-[10px] font-bold ${textColor} opacity-80`}>{desc}</div>
      </div>
      <div className="hidden md:block text-[9px] font-extrabold text-black/50 uppercase tracking-tighter bg-black/5 px-2.5 py-0.5 rounded-full mt-0.5">
        Seret / Klik
      </div>
    </motion.div>
  );
}

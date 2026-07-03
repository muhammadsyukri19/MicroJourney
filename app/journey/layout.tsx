'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useJourneyStore } from '@/lib/journeyStore';
import BottomNav from '@/components/BottomNav';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

const STAGES = [
  { id: 1, label: 'Scanner AI',         path: '/journey/tahap-1' },
  { id: 2, label: 'Pelapukan',           path: '/journey/tahap-2' },
  { id: 3, label: 'Kontaminasi Pangan',  path: '/journey/tahap-3' },
  { id: 4, label: 'Organ Pencernaan',    path: '/journey/tahap-4' },
  { id: 5, label: 'Papan Bukti',        path: '/journey/tahap-5' },
  { id: 6, label: 'Komitmen',            path: '/journey/tahap-6' },
];

export default function JourneyLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { studentName, completedStages } = useJourneyStore();
  const [hoveredStage, setHoveredStage] = useState<number | null>(null);
  
  const isDashboard = pathname === '/journey';
  const currentId = isDashboard ? 0 : (STAGES.find(s => pathname.startsWith(s.path))?.id ?? 1);

  return (
    <div className="min-h-screen bg-[#f7f9fb] flex flex-col font-[family-name:var(--font-inter)] relative">
      {/* Top Map Navigation - Adventure Theme */}
      <header className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
        {/* Latar Belakang Gradient Gelap di atas agar garis nyala terlihat */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#083b54]/60 to-transparent pointer-events-none mix-blend-multiply" />
        
        <div className="relative max-w-5xl mx-auto px-4 h-28 flex items-center justify-between pointer-events-auto">
          
          {/* Back Button - Papan Kayu Bulat */}
          <button
            onClick={() => router.push(isDashboard ? '/' : '/journey')}
            className="relative flex items-center justify-center w-12 h-12 rounded-full border-2 border-[#8e4912] shadow-[0_5px_10px_rgba(0,0,0,0.3)] hover:scale-105 active:scale-95 transition-all z-20"
            style={{
              background: 'linear-gradient(to bottom, #f0a345, #d27b22)',
              boxShadow: 'inset 0 3px 0 rgba(255,255,255,0.3), inset 0 -3px 0 rgba(0,0,0,0.2), 0 5px 10px rgba(0,0,0,0.3)'
            }}
          >
            <span className="material-symbols-outlined text-2xl text-[#3b2313] font-bold">
              {isDashboard ? 'home' : 'map'}
            </span>
          </button>

          {/* Game Map Path - Glowing Trail */}
          <div className="flex-1 flex justify-center items-center relative mx-4 sm:mx-8 h-full">
            {/* Garis Jejak Menyala (Glowing Trail) */}
            <div 
              className="absolute top-1/2 left-0 right-0 h-0 border-t-[4px] border-dashed z-0 opacity-80"
              style={{
                borderColor: '#6bff8f',
                boxShadow: '0 0 10px #6bff8f, 0 0 20px #6bff8f',
                transform: 'translateY(-50%)',
                animation: 'trailPulse 2s infinite alternate'
              }}
            />
            
            <div className="flex justify-between items-center w-full max-w-2xl relative z-10">
              {STAGES.map((s, index) => {
                const done = completedStages.includes(s.id) || (currentId > 0 && s.id < currentId);
                const active = s.id === currentId;
                const isHovered = hoveredStage === s.id;
                
                // Memberikan variasi vertikal agar jejak tidak lurus membosankan
                const offsetY = index % 2 === 0 ? -10 : 10;
                
                return (
                  <div 
                    key={s.id} 
                    className="relative flex flex-col items-center justify-center"
                    style={{ transform: `translateY(${offsetY}px)` }}
                    onMouseEnter={() => setHoveredStage(s.id)}
                    onMouseLeave={() => setHoveredStage(null)}
                  >
                    {/* Level Node (Bentuk Organik / Pulau) */}
                    <motion.div
                      onClick={() => {
                         if (done || active) router.push(s.path);
                      }}
                      className={`relative flex items-center justify-center z-10 transition-colors shadow-sm cursor-pointer ${
                        active ? 'w-14 h-14 bg-[#6bff8f] text-[#083b54] shadow-[0_0_20px_#6bff8f]' : 
                        done ? 'w-12 h-12 bg-[#006e2f] text-white shadow-md' : 
                        'w-10 h-10 bg-[#083b54]/80 text-[#6bff8f]/50 border-2 border-[#006591] cursor-not-allowed backdrop-blur-sm'
                      }`}
                      style={{
                        // Bentuk blob tidak teratur
                        borderRadius: active 
                          ? '40% 60% 70% 30% / 40% 50% 60% 50%'
                          : done ? '50% 50% 40% 60% / 60% 40% 50% 50%'
                          : '50%'
                      }}
                      animate={active ? { 
                        y: [0, -8, 0],
                        borderRadius: ['40% 60% 70% 30% / 40% 50% 60% 50%', '60% 40% 50% 50% / 50% 60% 40% 60%', '40% 60% 70% 30% / 40% 50% 60% 50%']
                      } : { y: 0 }}
                      transition={active ? { duration: 3, repeat: Infinity, ease: 'easeInOut' } : {}}
                      whileHover={(!active && done) ? { scale: 1.15 } : {}}
                      whileTap={(!active && done) ? { scale: 0.9 } : {}}
                    >
                      {done && !active ? (
                        <span className="material-symbols-outlined text-[24px] font-bold">check</span>
                      ) : (
                        <span className="font-extrabold font-[family-name:var(--font-outfit)] text-lg">{s.id}</span>
                      )}

                      {/* Ripple effect for active node */}
                      {active && (
                        <motion.div
                          className="absolute inset-0 border-2 border-[#6bff8f]"
                          style={{ borderRadius: 'inherit' }}
                          animate={{ scale: [1, 1.8], opacity: [0.8, 0] }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                        />
                      )}
                    </motion.div>

                    {/* Balon Kata Papan Kayu */}
                    <AnimatePresence>
                      {(isHovered || active) && (
                        <motion.div 
                          initial={{ opacity: 0, y: 15, scale: 0.8 }}
                          animate={{ opacity: 1, y: 35, scale: 1 }}
                          exit={{ opacity: 0, y: 15, scale: 0.8 }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                          className="absolute top-full whitespace-nowrap text-[12px] font-extrabold px-4 py-2 rounded-lg shadow-lg pointer-events-none z-50 font-[family-name:var(--font-outfit)] text-[#3b2313] mt-2"
                          style={{
                            background: 'linear-gradient(to bottom, #f0a345, #d27b22)',
                            border: '1px solid #8e4912',
                            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), 0 5px 10px rgba(0,0,0,0.3)'
                          }}
                        >
                          <span className="relative z-10">{s.label}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </header>

      {/* Spacer for floating header */}
      <div className="h-28" />

      {/* Content */}
      <main className="flex-grow">{children}</main>

      {/* Mobile bottom nav */}
      <BottomNav />
      
      {/* Global Style for pulsing trail */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes trailPulse {
          0% { box-shadow: 0 0 5px #6bff8f, 0 0 10px #6bff8f; }
          100% { box-shadow: 0 0 15px #6bff8f, 0 0 30px #6bff8f; }
        }
      `}} />
    </div>
  );
}

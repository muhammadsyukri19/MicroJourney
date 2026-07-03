'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useJourneyStore } from '@/lib/journeyStore';

const STAGES = [
  { id: 1, title: 'Scanner AI',         icon: 'qr_code_scanner', path: '/journey/tahap-1', desc: 'Pindai plastik nyata untuk mengetahui jenis dan potensinya menjadi mikroplastik.' },
  { id: 2, title: 'Proses Pelapukan',   icon: 'wb_sunny',        path: '/journey/tahap-2', desc: 'Simulasi interaktif melihat botol utuh hancur karena UV dan ombak laut.' },
  { id: 3, title: 'Kontaminasi Pangan', icon: 'set_meal',        path: '/journey/tahap-3', desc: 'Scan makanan sehari-hari untuk mendeteksi kandungan partikel asing.' },
  { id: 4, title: 'Organ Pencernaan',   icon: 'pulmonology',     path: '/journey/tahap-4', desc: 'Jelajahi anatomi tubuh untuk melihat titik penumpukan mikroplastik.' },
  { id: 5, title: 'Papan Bukti',        icon: 'hub',             path: '/journey/tahap-5', desc: 'Susun benang merah kasus polusi plastik seperti seorang detektif.' },
  { id: 6, title: 'Sumpah Komitmen',    icon: 'contract',        path: '/journey/tahap-6', desc: 'Ikrar penjaga samudra dan sertifikat resmi pelindung bumi.' },
];

export default function JourneyDashboard() {
  const router = useRouter();
  const { studentName, completedStages } = useJourneyStore();

  return (
    <div className="max-w-[1000px] mx-auto px-5 pb-16 font-[family-name:var(--font-inter)]">
      {/* Welcome Section */}
      <div className="bg-gradient-to-br from-[#006591] to-[#004c6e] rounded-[32px] p-8 sm:p-10 text-white mb-10 shadow-lg relative overflow-hidden flex flex-col md:flex-row items-center gap-8">
        <div className="absolute inset-0 bg-[url('/hero-bg.png')] opacity-10 bg-cover bg-center pointer-events-none mix-blend-overlay" />
        
        {/* Text Content */}
        <div className="relative z-10 flex-1 text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-extrabold font-[family-name:var(--font-outfit)] mb-3">
            Peta Ekspedisi Mikroplastik
          </h1>
          <p className="text-[#c9e6ff] text-base md:text-lg mb-8 leading-relaxed">
            Selamat datang, <strong className="text-white font-extrabold">{studentName || 'Penjelajah'}</strong>! 
            Di sini kamu akan melalui 6 tahapan misi rahasia untuk mengungkap bahaya plastik bagi bumi kita.
          </p>
          
          <button 
            onClick={() => router.push('/journey/tahap-1')}
            className="bg-[#6bff8f] hover:bg-[#4be672] text-[#004a1f] px-8 py-3.5 rounded-full font-extrabold text-lg transition-transform active:scale-95 shadow-md font-[family-name:var(--font-outfit)] inline-flex items-center gap-2"
          >
            <span className="material-symbols-outlined">explore</span>
            Mulai Misi Pertama
          </button>
        </div>

        {/* Video Embed */}
        <div className="relative z-10 w-full md:w-[400px] flex-shrink-0">
          <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border-4 border-white/10">
            <iframe 
              width="100%" 
              height="100%" 
              src="https://www.youtube.com/embed/mdu1XEjHNYo" 
              title="Apa Itu Mikroplastik?" 
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen
            ></iframe>
          </div>
          <p className="text-center text-[#c9e6ff] text-xs mt-3 font-semibold tracking-wide">
            Tonton video ini sebelum memulai misi!
          </p>
        </div>
      </div>

      {/* Grid 6 Tahap */}
      <h2 className="text-2xl font-extrabold font-[family-name:var(--font-outfit)] text-[#083b54] mb-6 text-center">
        Daftar Tahapan Misi
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {STAGES.map((stage) => {
          const isCompleted = completedStages.includes(stage.id);
          const isNext = completedStages.length + 1 === stage.id;
          const isLocked = !isCompleted && !isNext && stage.id !== 1;
          
          return (
            <div 
              key={stage.id}
              onClick={() => {
                if (!isLocked) router.push(stage.path);
              }}
              className={`relative rounded-[24px] p-6 border-2 transition-all ${
                isLocked 
                  ? 'bg-white border-[#eceef0] opacity-60 cursor-not-allowed' 
                  : 'bg-white border-[#e4f1f9] hover:border-[#006591] cursor-pointer hover:-translate-y-1 hover:shadow-md'
              }`}
            >
              {/* Badge Status */}
              <div className="absolute top-5 right-5">
                {isCompleted ? (
                   <div className="bg-[#e1f5ee] text-[#006e2f] px-3 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1 font-[family-name:var(--font-outfit)]">
                     <span className="material-symbols-outlined text-[14px]">check_circle</span>
                     SELESAI
                   </div>
                ) : isLocked ? (
                   <div className="bg-[#eceef0] text-[#6e7881] px-3 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1 font-[family-name:var(--font-outfit)]">
                     <span className="material-symbols-outlined text-[14px]">lock</span>
                     TERKUNCI
                   </div>
                ) : (
                   <div className="bg-[#006591] text-white px-3 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1 font-[family-name:var(--font-outfit)] shadow-sm">
                     <span className="material-symbols-outlined text-[14px]">play_arrow</span>
                     SIAP DIMULAI
                   </div>
                )}
              </div>

              {/* Icon & Title */}
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${isCompleted ? 'bg-[#e1f5ee] text-[#006e2f]' : isLocked ? 'bg-[#f7f9fb] text-[#6e7881]' : 'bg-[#e4f1f9] text-[#006591]'}`}>
                <span className="material-symbols-outlined text-3xl">{stage.icon}</span>
              </div>
              
              <div className="text-[11px] font-bold text-[#006591] mb-1 font-[family-name:var(--font-outfit)] tracking-widest uppercase">
                Tahap {stage.id}
              </div>
              <h3 className={`text-xl font-bold font-[family-name:var(--font-outfit)] mb-2 ${isLocked ? 'text-[#3e4850]' : 'text-[#083b54]'}`}>
                {stage.title}
              </h3>
              <p className="text-sm text-[#3e4850] leading-relaxed">
                {stage.desc}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

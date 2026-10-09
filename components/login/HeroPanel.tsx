// ORGANISM: HeroPanel
// Panel kiri pada halaman login (Desktop only) berisi logo besar dan deskripsi app.
import Image from 'next/image';

export default function HeroPanel() {
  return (
    <div
      className="hidden lg:flex flex-col items-center justify-center flex-1 relative overflow-hidden px-12"
      style={{ background: 'linear-gradient(145deg, #e8f8f0 0%, #d0eef9 55%, #c2e5f5 100%)' }}
    >
      {/* Organic blobs */}
      <div
        className="absolute -top-32 -left-32 w-[480px] h-[480px] opacity-40 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #6bff8f44 0%, transparent 70%)',
          borderRadius: '60% 40% 70% 30% / 40% 60% 40% 60%',
        }}
      />
      <div
        className="absolute bottom-0 right-0 w-[380px] h-[380px] opacity-30 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #006591 0%, transparent 70%)',
          borderRadius: '40% 60% 30% 70% / 60% 40% 60% 40%',
          transform: 'translate(30%, 30%)',
        }}
      />
      <div
        className="absolute top-1/2 -right-24 w-[200px] h-[200px] opacity-20 pointer-events-none"
        style={{
          background: '#006e2f',
          borderRadius: '55% 45% 60% 40% / 50% 55% 45% 50%',
        }}
      />

      {/* Wave lines */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.07] pointer-events-none"
        viewBox="0 0 600 700"
        fill="none"
      >
        <path d="M-50 200 Q150 160 300 200 T650 200" stroke="#006591" strokeWidth="2" fill="none" />
        <path d="M-50 240 Q150 200 300 240 T650 240" stroke="#006591" strokeWidth="1.5" fill="none" />
        <path d="M-50 280 Q150 240 300 280 T650 280" stroke="#006591" strokeWidth="1" fill="none" />
        <path d="M-50 400 Q150 360 300 400 T650 400" stroke="#006e2f" strokeWidth="2" fill="none" />
        <path d="M-50 440 Q150 400 300 440 T650 440" stroke="#006e2f" strokeWidth="1.5" fill="none" />
      </svg>

      {/* Main content */}
      <div className="relative z-10 text-center max-w-sm">
        <Image
          src="/logo/no-bg.webp"
          alt="MicroJourney Logo"
          width={224}
          height={224}
          style={{ width: 'auto', height: 'auto' }}
          className="mx-auto mb-6 drop-shadow-[0_16px_32px_rgba(0,101,145,0.25)]"
          priority
        />
        <h1
          className="font-extrabold text-4xl leading-tight mb-3"
          style={{ fontFamily: 'var(--font-outfit)', color: '#083b54' }}
        >
          Micro<span style={{ color: '#006591' }}>Journey</span>{' '}
          <span style={{ color: '#006e2f' }}>AR</span>
        </h1>
        <p className="text-[#4a7a8a] text-base leading-relaxed mb-8">
          Petualangan sains interaktif untuk memahami dampak{' '}
          <span className="font-semibold text-[#006591]">mikroplastik</span>{' '}
          bagi kehidupan kita.
        </p>

        <div className="flex flex-wrap gap-2 justify-center">
          {['🔬 AR Scanner', '🌊 Virtual Lab', '📊 E-LKPD'].map((tag) => (
            <span
              key={tag}
              className="px-3 py-1.5 text-xs font-bold rounded-full"
              style={{
                background: 'rgba(0,101,145,0.1)',
                color: '#006591',
                border: '1px solid rgba(0,101,145,0.2)',
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <p className="absolute bottom-5 text-[#7aa8b8] text-xs">
        IPA Kelas VIII · Kurikulum Merdeka
      </p>
    </div>
  );
}

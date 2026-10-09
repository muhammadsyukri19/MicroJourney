'use client';

export default function MateriBgPattern() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Subtle SVG Grid Pattern */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.04]" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="materi-grid-pattern" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#006591" strokeWidth="1" />
            <circle cx="32" cy="32" r="1.5" fill="#006591" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#materi-grid-pattern)" />
      </svg>

      {/* Radial Gradient Ambient Blobs */}
      <div className="absolute -top-20 -right-20 w-[500px] h-[500px] bg-gradient-to-br from-[#006591]/15 to-[#6bff8f]/10 rounded-full blur-3xl" />
      <div className="absolute top-1/3 -left-32 w-[450px] h-[450px] bg-gradient-to-tr from-[#f0a345]/10 to-[#006e2f]/10 rounded-full blur-3xl" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-gradient-to-tl from-[#ba1a1a]/8 to-[#006591]/10 rounded-full blur-3xl" />

      {/* Organic Floating Wave Particles */}
      <div className="absolute inset-0 opacity-20">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white border border-[#006591]/20 shadow-sm"
            style={{
              top: `${15 + i * 14}%`,
              left: `${8 + (i * 17) % 80}%`,
              width: `${12 + (i % 3) * 8}px`,
              height: `${12 + (i % 3) * 8}px`,
              animation: `floatBounceMateri ${6 + i * 2}s ease-in-out infinite alternate`,
            }}
          />
        ))}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes floatBounceMateri {
          0% { transform: translateY(0px) rotate(0deg); }
          100% { transform: translateY(-18px) rotate(12deg); }
        }
      `}} />
    </div>
  );
}

"use client";

/**
 * Mika — maskot pemandu MicroJourney AR.
 * Anak penjelajah cilik yang membimbing siswa di tiap sintaks Discovery Learning.
 *
 * Contoh pakai:
 *   <MikaMascot message="Ayo pindai plastik di sekitarmu!" />
 *   <MikaMascot size={120} flip />
 */

type MikaMascotProps = {
  /** Teks bubble panduan di samping Mika. Kosongkan untuk hanya menampilkan gambar. */
  message?: string;
  /** Lebar gambar Mika dalam px. Default 120. */
  size?: number;
  /** Hadapkan Mika ke kiri (default menghadap kanan). */
  flip?: boolean;
  /** Posisi bubble relatif terhadap Mika. Default 'right'. */
  bubbleSide?: "right" | "top";
  /** Animasi masuk (pop) saat pertama muncul. */
  pop?: boolean;
  className?: string;
};

export default function MikaMascot({ message, size = 120, flip = false, bubbleSide = "right", pop = false, className = "" }: MikaMascotProps) {
  const img = (
    <img
      src="/mika.webp"
      alt="Mika, maskot pemandu MicroJourney AR"
      width={size}
      height={Math.round(size * (1485 / 680))}
      className={`mika-float select-none pointer-events-none ${flip ? "scale-x-[-1]" : ""}`}
      style={{ width: size, height: "auto" }}
      draggable={false}
    />
  );

  if (!message) {
    return <div className={`${pop ? "mika-pop" : ""} ${className}`}>{img}</div>;
  }

  if (bubbleSide === "top") {
    return (
      <div className={`flex flex-col items-center ${pop ? "mika-pop" : ""} ${className}`}>
        <div className="relative bg-white border border-[#d8e8f0] rounded-2xl px-4 py-3 shadow-md mb-2 max-w-[260px]">
          <p className="text-[#3e4850] text-sm leading-relaxed">{message}</p>
        </div>
        {img}
      </div>
    );
  }

  return (
    <div className={`flex items-end gap-2 ${pop ? "mika-pop" : ""} ${className}`}>
      {img}
      <div className="mika-bubble relative bg-white border border-[#d8e8f0] rounded-2xl px-4 py-3 shadow-md mb-4 max-w-[260px]">
        <p className="text-[#3e4850] text-sm leading-relaxed">{message}</p>
      </div>
    </div>
  );
}

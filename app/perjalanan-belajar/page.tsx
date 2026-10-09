"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import { stages } from "@/lib/stagesData";
import { useJourneyStore } from "@/lib/journeyStore";

const STAGE_ICONS: Record<number, string> = {
  1: "qr_code_scanner",
  2: "wb_sunny",
  3: "set_meal",
  4: "pulmonology",
  5: "assignment",
  6: "eco",
};

// ── DESKTOP: titik di jejak background landscape (map-bg.png) ──
const TRAIL = [
  { x: 5.4, y: 61.2 },
  { x: 23.2, y: 58.6 },
  { x: 39.8, y: 61.7 },
  { x: 56.2, y: 48.8 },
  { x: 72.5, y: 50.6 },
  { x: 90.4, y: 54.3 },
];
const LABEL_POS: ("above" | "below")[] = ["below", "above", "below", "below", "above", "above"];
const PATH_D =
  "M92 572.501C92 572.501 109.32 583.344 118.5 592.501C125.776 599.758 127.623 605.845 135 613.001C143.017 620.777 148.057 624.913 158 630.001C170.608 636.452 179.068 636.956 193 639.501C208.043 642.248 216.714 643.405 232 643.001C254.7 642.4 267.373 638.424 289 631.501C307.827 625.474 318.878 622.2 335.5 611.501C349.355 602.582 355.339 595.119 367.5 584.001C385.231 567.79 391.105 553.968 411 540.501C426.26 530.171 435.952 525.625 453.5 520.001C475.274 513.022 488.636 511.861 511.5 512.001C533.398 512.134 547.378 510.28 567 520.001C578.863 525.877 584.811 530.97 594 540.501C604.45 551.339 603.823 562.997 615.5 572.501C622.752 578.403 627.799 580.577 636.5 584.001C651.047 589.726 660.372 590.099 676 590.501C694.523 590.976 705.925 591.196 723 584.001C736.827 578.174 744.847 573.488 754.5 562.001C763.827 550.901 765.811 542.219 770.5 528.501C774.775 515.995 772.91 507.697 778 495.501C783.59 482.106 787.901 474.416 798.5 464.501C808.723 454.937 816.376 451.374 829.5 446.501C844.878 440.79 854.596 440.116 871 440.001C888.176 439.88 898.32 440.736 914.5 446.501C928.167 451.37 937.696 453.368 947 464.501C953.385 472.141 954.749 478.09 958 487.501C961.202 496.769 961.167 502.476 963.5 512.001C964.987 518.073 965.11 521.724 967.5 527.501C969.741 532.917 971.756 535.619 975 540.501C978.545 545.835 980.346 549.1 985 553.501C989.486 557.743 992.688 559.353 998 562.501C1005.59 566.999 1010.22 568.946 1018.5 572.001C1041.59 580.518 1056.39 580.081 1081 580.001C1104.23 579.925 1117.98 579.888 1140 572.501C1155.07 567.446 1165.41 565.887 1176.5 554.501C1184.68 546.103 1188.92 539.735 1193.5 528.501C1198.3 516.726 1195.05 508.413 1199.5 496.501C1201.45 491.262 1201.61 488.314 1204 483.501C1209.83 471.748 1216.55 466.728 1227.5 459.501C1240.74 450.757 1250.41 449.478 1266 446.501C1279.27 443.966 1286.99 444.135 1300.5 444.001C1316.15 443.845 1325.19 443.272 1340.5 446.501C1355.13 449.584 1363.25 452.575 1376.5 459.501C1387.35 465.172 1393.12 469.14 1402.5 477.001C1413.73 486.407 1415.89 496.262 1428 504.501C1435.22 509.413 1439.87 511.306 1448 514.501C1456.51 517.847 1461.67 518.626 1470.5 521.001C1482.53 524.235 1489.14 526.99 1501.5 528.501C1514.49 530.088 1535 528.501 1535 528.501";

// ── MOBILE: titik di jejak background potret (map-bg-mobile.webp, viewBox 941x1672) ──
const TRAIL_M = [
  { x: 29.3, y: 76.2 },
  { x: 50.7, y: 67.8 },
  { x: 61.1, y: 58.3 },
  { x: 47.5, y: 46.8 },
  { x: 40.2, y: 35.4 },
  { x: 55.4, y: 23.9 },
];
const LABEL_SIDE_M: ("left" | "right")[] = ["right", "right", "left", "right", "right", "left"];
const PATH_D_M =
  "M282.5 1266.5C282.5 1266.5 296.997 1238.17 311.5 1224.5C320.766 1215.76 327.069 1212.03 338 1205.5C349.544 1198.6 356.857 1196.28 369 1190.5C387.852 1181.53 398.235 1176.05 417.5 1168C454.532 1152.52 477.793 1150.55 515 1135.5C529.998 1129.43 538.631 1126.44 553 1119C566.77 1111.87 574.692 1107.93 587 1098.5C596.436 1091.27 602.318 1087.47 609.5 1078C615.781 1069.72 618.117 1064.14 622 1054.5C628.265 1038.94 634.689 1028.86 631 1012.5C624.731 984.697 594.554 986.621 569 974C556.77 967.96 549.6 965.226 537 960C499.181 944.315 475.194 942.614 438 925.5C420.229 917.323 409.118 914.28 393.5 902.5C386.211 897.003 381.002 894.637 376 887C371.567 880.232 370.594 875.432 369 867.5C366.845 856.78 365.562 849.88 369 839.5C372.549 828.786 378.343 824.301 386.5 816.5C395.345 808.041 401.687 804.734 412.5 799C425.765 791.966 434.348 790.516 448.5 785.5C486.171 772.147 508.218 767.485 546.5 756C553.167 754 565.544 745.967 575.5 738.5C587.5 729.5 591.167 720.667 592.5 717C595.169 709.66 595.896 704.034 592.5 697C588.379 688.463 580.458 688.281 572 684C563.944 679.923 559.045 678.415 550.5 675.5C530.996 668.846 519.174 668.203 499 664C473.319 658.65 458.678 656.869 433 651.5C420.479 648.882 413.294 648.036 401 644.5C389.248 641.12 381.757 640.658 371.5 634C364.427 629.409 359.479 626.935 355.5 619.5C351.849 612.679 349.541 607.336 352 600C354.282 593.193 359.364 591.447 365 587C370.915 582.333 374.796 580.439 381.5 577C398.041 568.514 408.997 567.64 427 563C457.713 555.085 476.045 555.907 507 549C525.673 544.833 537.197 545.165 554.5 537C564.009 532.512 573.47 532.712 577.5 523C580.119 516.688 580.178 511.787 577.5 505.5C574.404 498.232 568.834 496.463 562 492.5C555.16 488.533 550.565 487.802 543 485.5C533.801 482.701 528.399 482.03 519 480C498.224 475.514 486.352 474.119 465.5 470C460.616 469.035 457.438 469.756 453 467.5C449.656 465.8 447.393 464.738 445.5 461.5C442.84 456.948 443.325 452.802 445.5 448C448.094 442.272 453.044 441.626 458.5 438.5C472.596 430.425 483.024 431.949 499 429C512.578 426.493 520.604 427.344 534 424C542.148 421.966 549.285 424.083 554.5 417.5C557 414.345 558.5 408 558.5 408";

export default function PerjalananBelajarPage() {
  const { completedStages } = useJourneyStore();

  const completedCount = completedStages.length;
  const progressPercent = Math.round((completedCount / stages.length) * 100);

  const nextStageId = completedCount === 0 ? 1 : completedCount >= stages.length ? stages.length : Math.max(...completedStages) + 1;

  function getStatus(stageId: number) {
    if (completedStages.includes(stageId)) return "completed";
    if (stageId === nextStageId) return "current";
    return "locked";
  }

  const mikaMessage =
    completedCount === 0
      ? "Ayo mulai dari Misi 1! Aku temani sepanjang perjalananmu."
      : completedCount >= stages.length
        ? "Hebat! Semua misi selesai. Kamu Penjaga Samudra sejati!"
        : `Kerja bagus! ${completedCount} misi selesai. Lanjut yuk!`;

  const progressLen = (completedCount / stages.length) * 1000;

  return (
    <div className="relative text-[#191c1e] min-h-screen flex flex-col">
      <Navbar />

      <style>{`
        @keyframes ringPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(0,101,145,0.5); }
          50%       { box-shadow: 0 0 0 10px rgba(0,101,145,0); }
        }
        .ring-pulse { animation: ringPulse 1.8s ease-in-out infinite; }
        @keyframes trailMarch { to { stroke-dashoffset: -1000; } }
        .trail-march { animation: trailMarch 11s linear infinite; }
      `}</style>

      <main className="flex-grow">
        {/* ══════════════════════════════════════
            DESKTOP (≥ lg) — fit 1 layar, cover-crop
        ══════════════════════════════════════ */}
        <section className="hidden lg:block relative w-full overflow-hidden select-none h-[100vh] -mt-[112px] bg-[#bfe6f5]">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ aspectRatio: "1672 / 941", minWidth: "100%", minHeight: "100%" }}>
            <img src="/map-bg.png" alt="" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />

            <svg viewBox="0 0 1672 941" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
              <path d={PATH_D} pathLength={1000} fill="none" stroke="#caffe1" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" opacity={0.4} />
              {completedCount > 0 && <path d={PATH_D} pathLength={1000} fill="none" stroke="#1fce7c" strokeWidth={9} strokeLinecap="round" strokeDasharray={`${progressLen} 1000`} style={{ filter: "drop-shadow(0 0 5px #6bff8f)" }} />}
              <path className="trail-march" d={PATH_D} pathLength={1000} fill="none" stroke="#ffffff" strokeWidth={5} strokeLinecap="round" strokeDasharray="3 17" opacity={0.9} />
            </svg>

            {stages.map((stage, idx) => {
              const status = getStatus(stage.id);
              const p = TRAIL[idx];
              const isCurrent = status === "current";
              const clickable = status !== "locked";
              const pos = LABEL_POS[idx];
              const labelWrap = pos === "above" ? "absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 flex flex-col items-center" : "absolute top-full left-1/2 -translate-x-1/2 mt-2.5 flex flex-col items-center";
              const circleColor = status === "completed" ? "bg-[#006e2f] border-white text-white" : isCurrent ? "bg-[#006591] border-white text-white ring-pulse" : "bg-white/75 border-white/80 text-[#7c93a0] backdrop-blur-sm";

              const Marker = (
                <div className="absolute z-20" style={{ left: `${p.x}%`, top: `${p.y}%`, transform: "translate(-50%, -50%)" }}>
                  <div className="relative flex items-center justify-center">
                    <span className={`flex items-center justify-center rounded-full border-4 shadow-lg font-extrabold transition-transform hover:scale-110 ${circleColor}`} style={{ width: 54, height: 54, fontSize: 20 }}>
                      {status === "completed" ? (
                        <span className="material-symbols-outlined" style={{ fontSize: 26, fontVariationSettings: "'FILL' 1" }}>
                          check
                        </span>
                      ) : status === "locked" ? (
                        <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
                          lock
                        </span>
                      ) : (
                        stage.id
                      )}
                    </span>
                    <div className={labelWrap}>
                      {isCurrent ? (
                        <div className="bg-[#006591] text-white rounded-2xl shadow-xl border-2 border-white px-3.5 py-2.5 w-52 text-center" style={{ animation: "float 4s ease-in-out infinite" }}>
                          <p className="text-[9px] font-bold text-[#93c5fd] uppercase tracking-wider">
                            Tahap {stage.id} · {stage.subtitle}
                          </p>
                          <h3 className="text-[14px] font-bold leading-tight mb-2">{stage.title}</h3>
                          <Link href={`/journey/tahap-${stage.id}`} className="inline-flex items-center gap-1 bg-white text-[#006591] font-bold text-[12px] px-3.5 py-1.5 rounded-lg hover:bg-[#c9e6ff] transition-colors active:scale-95">
                            <span className="material-symbols-outlined text-sm">play_arrow</span> Mulai Misi
                          </Link>
                        </div>
                      ) : (
                        <div className={`rounded-xl shadow-md border px-3 py-1.5 w-36 text-center ${status === "completed" ? "bg-white/90 backdrop-blur-sm border-white/70" : "bg-white/60 backdrop-blur-sm border-white/50"}`}>
                          <p className={`text-[8px] font-bold uppercase tracking-wider ${status === "completed" ? "text-[#006e2f]/70" : "text-[#7c93a0]"}`}>{stage.subtitle}</p>
                          <p className={`text-[12px] font-bold leading-tight ${status === "completed" ? "text-[#191c1e]" : "text-[#5a6b75]"}`}>{stage.title}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
              return clickable && !isCurrent ? (
                <Link key={stage.id} href={`/journey/tahap-${stage.id}`}>
                  {Marker}
                </Link>
              ) : (
                <div key={stage.id}>{Marker}</div>
              );
            })}
          </div>

          {/* Header */}
          <div className="absolute inset-x-0 top-0 z-30 flex flex-col items-center text-center px-5 pt-[170px]">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/85 backdrop-blur-sm text-[#0a7d52] text-xs font-bold shadow-sm mb-3">
              <span className="material-symbols-outlined text-base">map</span> Peta Petualangan
            </span>
            <h1 className="text-[34px] xl:text-[40px] font-extrabold font-[family-name:var(--font-outfit)] text-[#083b54] tracking-tight leading-tight" style={{ textShadow: "0 2px 14px rgba(255,255,255,0.7)" }}>
              Ekspedisi Mikroplastik
            </h1>
            <p className="text-[15px] text-[#0c4a66] font-medium mt-1.5 max-w-md leading-relaxed" style={{ textShadow: "0 1px 8px rgba(255,255,255,0.85)" }}>
              Ikuti jejak perjalanan plastik dari tangan kita hingga kembali ke meja makan.
            </p>
          </div>

          <img src="/mika.webp" alt="Mika" draggable={false} className="absolute z-20 pointer-events-none" style={{ right: "3%", bottom: "0%", height: "40%", animation: "float 4s ease-in-out infinite" }} />

          {/* Progress + pesan Mika (bawah) */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2">
            <div className="w-[300px] bg-white/85 backdrop-blur-sm rounded-2xl p-3 shadow-md">
              <div className="flex justify-between text-[11px] text-[#0c4a66] font-bold mb-1.5">
                <span>
                  {completedCount} / {stages.length} Misi Selesai
                </span>
                <span>{progressPercent}%</span>
              </div>
              <div className="h-2 bg-[#d6e6ee] rounded-full overflow-hidden">
                <div className="h-full bg-[#006e2f] rounded-full transition-all duration-700" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
            <div className="bg-white/85 backdrop-blur-sm rounded-full px-5 py-2 shadow-md text-[13px] font-semibold text-[#0c4a66] whitespace-nowrap">{mikaMessage}</div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            MOBILE (< lg) — jejak vertikal di background potret
        ══════════════════════════════════════ */}
        <section className="lg:hidden relative w-full overflow-hidden select-none h-[100dvh] -mt-14 md:-mt-[112px] bg-[#bfe6f5]">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ aspectRatio: "941 / 1672", minWidth: "100%", minHeight: "100%" }}>
            <img src="/map-bg-mobile.webp" alt="" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />

            <svg viewBox="0 0 941 1672" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
              <path d={PATH_D_M} pathLength={1000} fill="none" stroke="#caffe1" strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" opacity={0.35} />
              {completedCount > 0 && <path d={PATH_D_M} pathLength={1000} fill="none" stroke="#1fce7c" strokeWidth={12} strokeLinecap="round" strokeDasharray={`${progressLen} 1000`} style={{ filter: "drop-shadow(0 0 5px #6bff8f)" }} />}
              <path className="trail-march" d={PATH_D_M} pathLength={1000} fill="none" stroke="#ffffff" strokeWidth={6} strokeLinecap="round" strokeDasharray="3 17" opacity={0.9} />
            </svg>

            {stages.map((stage, idx) => {
              const status = getStatus(stage.id);
              const p = TRAIL_M[idx];
              const isCurrent = status === "current";
              const clickable = status !== "locked";
              const side = LABEL_SIDE_M[idx];
              const labelWrap = side === "left" ? "absolute right-full top-1/2 -translate-y-1/2 mr-2 flex justify-end" : "absolute left-full top-1/2 -translate-y-1/2 ml-2 flex justify-start";
              const circleColor = status === "completed" ? "bg-[#006e2f] border-white text-white" : isCurrent ? "bg-[#006591] border-white text-white ring-pulse" : "bg-white/75 border-white/80 text-[#7c93a0] backdrop-blur-sm";

              const Marker = (
                <div className="absolute z-20" style={{ left: `${p.x}%`, top: `${p.y}%`, transform: "translate(-50%, -50%)" }}>
                  <div className="relative flex items-center justify-center">
                    <span className={`flex items-center justify-center rounded-full border-[3px] shadow-lg font-extrabold ${circleColor}`} style={{ width: 42, height: 42, fontSize: 16 }}>
                      {status === "completed" ? (
                        <span className="material-symbols-outlined" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>
                          check
                        </span>
                      ) : status === "locked" ? (
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                          lock
                        </span>
                      ) : (
                        stage.id
                      )}
                    </span>
                    <div className={labelWrap}>
                      {isCurrent ? (
                        <div className={`bg-[#006591] text-white rounded-2xl shadow-xl border-2 border-white px-3 py-2 w-40 ${side === "left" ? "text-right" : ""}`} style={{ animation: "float 4s ease-in-out infinite" }}>
                          <p className="text-[8px] font-bold text-[#93c5fd] uppercase tracking-wider">
                            Tahap {stage.id} · {stage.subtitle}
                          </p>
                          <h3 className="text-[12px] font-bold leading-tight mb-1.5">{stage.title}</h3>
                          <Link href={`/journey/tahap-${stage.id}`} className="inline-flex items-center gap-1 bg-white text-[#006591] font-bold text-[11px] px-3 py-1 rounded-lg active:scale-95">
                            <span className="material-symbols-outlined text-xs">play_arrow</span> Mulai
                          </Link>
                        </div>
                      ) : (
                        <div
                          className={`rounded-lg shadow-md border px-2.5 py-1 w-28 ${side === "left" ? "text-right" : ""} ${status === "completed" ? "bg-white/90 backdrop-blur-sm border-white/70" : "bg-white/60 backdrop-blur-sm border-white/50"
                            }`}
                        >
                          <p className={`text-[11px] font-bold leading-tight ${status === "completed" ? "text-[#191c1e]" : "text-[#5a6b75]"}`}>{stage.title}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
              return clickable && !isCurrent ? (
                <Link key={stage.id} href={`/journey/tahap-${stage.id}`}>
                  {Marker}
                </Link>
              ) : (
                <div key={stage.id}>{Marker}</div>
              );
            })}
          </div>

          {/* Header mobile */}
          <div className="absolute inset-x-0 top-0 z-30 flex flex-col items-center text-center px-4 pt-[64px] md:pt-[112px]">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/85 backdrop-blur-sm text-[#0a7d52] text-[10px] font-bold shadow-sm mb-1.5">
              <span className="material-symbols-outlined text-sm">map</span> Peta Petualangan
            </span>
            <h1 className="text-[22px] font-extrabold font-[family-name:var(--font-outfit)] text-[#083b54] tracking-tight leading-tight" style={{ textShadow: "0 2px 12px rgba(255,255,255,0.8)" }}>
              Ekspedisi Mikroplastik
            </h1>
          </div>

          {/* Progress (mobile) — dipindah ke bawah, di atas bottom-nav */}
          <div className="absolute inset-x-0 z-30 flex justify-center px-4" style={{ bottom: "calc(env(safe-area-inset-bottom) + 90px)" }}>
            <div className="w-full max-w-[340px] bg-white/90 backdrop-blur-sm rounded-2xl px-4 py-2.5 shadow-lg border border-white/70">
              <div className="flex justify-between text-[12px] text-[#0c4a66] font-bold mb-1.5">
                <span>
                  {completedCount}/{stages.length} Misi
                </span>
                <span>{progressPercent}%</span>
              </div>
              <div className="h-2 bg-[#d6e6ee] rounded-full overflow-hidden">
                <div className="h-full bg-[#006e2f] rounded-full transition-all duration-700" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

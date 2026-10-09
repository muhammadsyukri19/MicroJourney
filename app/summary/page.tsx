// PAGE: /summary (Standalone Route Mandiri)
// Halaman Pengalaman Pembelajaran Pasca-Ekspedisi: Visual Storytelling, Rangkuman 6 Tahap, Upload PR Cloudinary, & Sertifikat Duta.
'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useJourneyStore } from '@/lib/journeyStore';
import { useAuthStore } from '@/lib/authStore';
import SummaryKpiCard from '@/components/molecules/SummaryKpiCard';
import DriveInputCard from '@/components/molecules/DriveInputCard';
import FeedbackFormCard from '@/components/molecules/FeedbackFormCard';
import PageContainer from '@/components/atoms/PageContainer';
import MikaMascot from '@/components/MikaMascot';

const ORGAN_LABEL_MAP: Record<string, string> = {
  mouth: 'Mulut',
  stomach: 'Lambung',
  smallIntestine: 'Usus Halus',
  largeIntestine: 'Usus Besar',
  blood: 'Darah',
};

function parseOrganLabel(raw: string): string {
  if (!raw) return 'Usus Halus';
  const r = raw.toLowerCase();
  if (r.includes('usus halus') || r.includes('small') || r.includes('intestinum')) return 'Usus Halus';
  if (r.includes('usus besar') || r.includes('large') || r.includes('kolon')) return 'Usus Besar';
  if (r.includes('lambung') || r.includes('stomach') || r.includes('gaster')) return 'Lambung';
  if (r.includes('darah') || r.includes('blood') || r.includes('sirkulasi')) return 'Darah';
  if (r.includes('mulut') || r.includes('mouth')) return 'Mulut';
  return ORGAN_LABEL_MAP[raw] ?? (raw.length > 20 ? raw.slice(0, 18) + '…' : raw);
}

const JOURNEY_STORY_STEPS = [
  {
    id: 1,
    title: 'Tahap 1: AR Scanner Plastik',
    icon: 'qr_code_scanner',
    tag: 'Deteksi Polimer',
    color: '#006591',
    desc: 'Identifikasi kode jenis plastik sintetis (PET, LDPE, HDPE, PP) di lingkungan sekitar.',
  },
  {
    id: 2,
    title: 'Tahap 2: Proses Pelapukan UV',
    icon: 'wb_sunny',
    tag: 'Abiotik & Ombak',
    color: '#f0a345',
    desc: 'Simulasi radiasi sinar matahari dan hempasan ombak laut yang memecah plastik menjadi fragmen mikroplastik.',
  },
  {
    id: 3,
    title: 'Tahap 3: Kontaminasi Pangan',
    icon: 'set_meal',
    tag: 'Biomagnifikasi BRIN',
    color: '#ba1a1a',
    desc: 'Analisis kontaminasi partikel mikroplastik pada sampel garam rakyat dan seafood lokal.',
  },
  {
    id: 4,
    title: 'Tahap 4: Organ Pencernaan',
    icon: 'coronavirus',
    tag: 'Bioakumulasi Bio',
    color: '#9c27b0',
    desc: 'Investigasi dampak fisik & kimia partikel plastik terhadap saluran pencernaan manusia.',
  },
  {
    id: 5,
    title: 'Tahap 5: Papan Bukti Detektif',
    icon: 'assignment',
    tag: 'Sintesis HOTS',
    color: '#006e2f',
    desc: 'Menghubungkan rantai sebab-akibat pencemaran dari aktivitas manusia hingga dampak biologis.',
  },
  {
    id: 6,
    title: 'Tahap 6: Sumpah & Aksi Duta',
    icon: 'verified',
    tag: 'Komitmen Nyata',
    color: '#6bff8f',
    desc: 'Penandatanganan janji ekologi & penyerahan bukti aksi lingkungan.',
  },
];

export default function StandaloneSummaryPage() {
  const router = useRouter();
  const { currentUser } = useAuthStore();
  const {
    studentName,
    studentClass,
    sessionId,
    totalParticles,
    mostDangerousOrgan,
    selectedFoods,
    quizCorrect,
    quizWrong,
    lkpdAnswers,
    setLkpdAnswer,
    reset,
  } = useJourneyStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'story' | 'assignment' | 'feedback'>('overview');
  const [selectedStoryStep, setSelectedStoryStep] = useState<number>(1);

  const [driveLink, setDriveLink] = useState(lkpdAnswers.driveLink || '');
  const [sosmedLink, setSosmedLink] = useState(lkpdAnswers.sosmedLink || '');
  const [actionNote, setActionNote] = useState(lkpdAnswers.actionNote || '');
  const [rating, setRating] = useState(lkpdAnswers.rating || 5);
  const [feedback, setFeedback] = useState(lkpdAnswers.feedback || '');

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [certGenerated, setCertGenerated] = useState(false);

  const totalQuiz = (quizCorrect || 0) + (quizWrong || 0);

  // Generate Sertifikat Digital PDF
  async function generateCertificatePDF() {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF('landscape', 'mm', 'a4');

    // Frame Utama
    doc.setDrawColor(0, 101, 145);
    doc.setLineWidth(3);
    doc.rect(8, 8, 281, 194);

    doc.setDrawColor(240, 163, 69);
    doc.setLineWidth(1);
    doc.rect(12, 12, 273, 186);

    // Header Background
    doc.setFillColor(8, 59, 84);
    doc.rect(13, 13, 271, 35, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('MICROJOURNEY AR — EKSPEDISI SAINS IPA', 148.5, 28, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 255, 143);
    doc.text('SERTIFIKAT KELULUSAN DUTA BIJAK PLASTIK 2026', 148.5, 38, { align: 'center' });

    // Main Content
    doc.setTextColor(8, 59, 84);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text('Sertifikat ini secara resmi dianugerahkan kepada:', 148.5, 65, { align: 'center' });

    doc.setFontSize(26);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 101, 145);
    doc.text((studentName || 'Siswa IPA').toUpperCase(), 148.5, 82, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 110, 47);
    doc.text(`Kelas: ${studentClass || 'VIII'} · SMP Kurikulum Merdeka`, 148.5, 92, { align: 'center' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 70, 80);
    const bodyText = `Telah berhasil menuntaskan 6 Tahap Ekspedisi Investigasi Pencemaran Mikroplastik & Anatomi Bioakumulasi, serta mengucapkan Sumpah Komitmen Ekologi demi kelestarian ekosistem laut Indonesia.`;
    const lines = doc.splitTextToSize(bodyText, 220);
    doc.text(lines, 148.5, 108, { align: 'center' });

    // Box Statistik
    doc.setFillColor(245, 248, 250);
    doc.setDrawColor(200, 215, 225);
    doc.roundedRect(40, 125, 217, 30, 4, 4, 'FD');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(186, 26, 26);
    doc.text(`Partikel Dideteksi: ${totalParticles.toLocaleString('id-ID')} Partikel`, 60, 142);

    doc.setTextColor(0, 101, 145);
    doc.text(`Organ Kritis: ${parseOrganLabel(mostDangerousOrgan)}`, 148.5, 142, { align: 'center' });

    doc.setTextColor(0, 110, 47);
    doc.text(`Akurasi Kuis: ${quizCorrect} / ${totalQuiz || 5} Benar`, 220, 142);

    // Footer Signatures
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 110, 120);
    doc.text(`Diterbitkan pada: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, 45, 180);
    doc.text(`Kode Verifikasi: MJ-AR-${(sessionId || 'DEV').slice(0, 8).toUpperCase()}`, 45, 186);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(8, 59, 84);
    doc.text('Tim Pengembang MicroJourney AR', 220, 180, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text('IPA SMP Kurikulum Merdeka', 220, 186, { align: 'center' });

    const filename = `Sertifikat-Duta-Lingkungan-${(studentName || 'Siswa').replace(/\s+/g, '_')}.pdf`;

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

    setCertGenerated(true);
  }

  // Submit Final LKPD + PR Drive + Feedback to MongoDB API
  async function handleSubmitAll() {
    setSubmitting(true);
    setLkpdAnswer('driveLink', driveLink);
    setLkpdAnswer('sosmedLink', sosmedLink);
    setLkpdAnswer('actionNote', actionNote);
    setLkpdAnswer('rating', rating);
    setLkpdAnswer('feedback', feedback);

    try {
      const payload = {
        studentName: studentName || 'Anonim',
        studentClass: studentClass || '-',
        sessionId: sessionId || `session-${Date.now()}`,
        lkpd1: lkpdAnswers.lkpd1 || '',
        lkpd2: lkpdAnswers.lkpd2 || '',
        lkpd3q1: lkpdAnswers.lkpd3q1 || '',
        lkpd3q2: lkpdAnswers.lkpd3q2 || '',
        lkpd4: lkpdAnswers.lkpd4 || '',
        commitment: lkpdAnswers.commitment || '',
        totalParticles: totalParticles || 0,
        mostDangerousOrgan: mostDangerousOrgan || '',
        selectedFoods: selectedFoods.map((f) => f.name),
        assessmentEligible: true,
        quizCorrect: quizCorrect || 0,
        quizWrong: quizWrong || 0,
        driveLink: driveLink.trim(),
        sosmedLink: sosmedLink.trim(),
        actionNote: actionNote.trim(),
        rating,
        feedback: feedback.trim(),
      };

      await fetch('/api/lkpd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      setSubmitting(false);
      setSubmitted(true);
    } catch (err) {
      console.error('Submit error:', err);
      setSubmitting(false);
      setSubmitted(true);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#083b54] via-[#004c6e] to-[#006591] text-slate-100 font-[family-name:var(--font-inter)] relative overflow-x-hidden selection:bg-[#6bff8f] selection:text-[#083b54]">
      {/* ── Multi-layer Visual Background & Sidebar.webp Overlay ── */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {/* Sidebar.webp Layer 1: Translucent Right Decorative Texture */}
        <div className="absolute top-0 right-0 w-full md:w-1/2 h-full opacity-15 md:opacity-25 mix-blend-overlay">
          <Image
            src="/sidebar.webp"
            alt="MicroJourney Texture"
            fill
            priority
            className="object-cover object-right pointer-events-none"
          />
        </div>

        {/* Sidebar.webp Layer 2: Left Subtle Faded Pattern */}
        <div className="absolute bottom-0 left-0 w-96 h-96 opacity-10 mix-blend-color-dodge -rotate-12 pointer-events-none">
          <Image
            src="/sidebar.webp"
            alt="MicroJourney Pattern"
            fill
            className="object-contain"
          />
        </div>

        {/* Ambient Glowing Blobs */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-10 left-1/4 w-96 h-96 rounded-full bg-[#6bff8f]/20 blur-3xl"
        />
        <motion.div
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-20 right-1/4 w-96 h-96 rounded-full bg-[#f0a345]/20 blur-3xl"
        />
        <div className="absolute top-1/2 right-10 w-72 h-72 rounded-full bg-[#006591]/30 blur-2xl" />

        {/* Sea Bubbles Floating Effect */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={`bubble-${i}`}
            className="absolute rounded-full bg-white/10 border border-white/20"
            style={{
              left: `${10 + i * 12}%`,
              bottom: '-20px',
              width: 10 + (i % 3) * 8,
              height: 10 + (i % 3) * 8,
            }}
            animate={{ y: -800, x: [0, (i % 2 === 0 ? 30 : -30), 0] }}
            transition={{
              duration: 10 + i * 2,
              repeat: Infinity,
              ease: 'linear',
              delay: i * 1.5,
            }}
          />
        ))}
      </div>

      {/* ── Top Header Navigation ── */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#083b54]/80 border-b border-white/10 shadow-lg">
        <PageContainer py="py-3" maxWidth="wide">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push('/journey/tahap-6')}
                title="Kembali ke Tahap 6: Komitmen"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <span className="material-symbols-outlined text-base">arrow_back</span>
                <span>Tahap 6</span>
              </button>
              <button
                onClick={() => router.push('/journey')}
                title="Kembali ke Peta Ekspedisi"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <span className="material-symbols-outlined text-base">map</span>
                <span className="hidden sm:inline">Peta</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#6bff8f] text-[#083b54] font-extrabold flex items-center justify-center text-sm shadow-md">
                🎓
              </div>
              <div className="text-left">
                <h3 className="font-extrabold text-white text-xs sm:text-sm leading-tight font-[family-name:var(--font-outfit)]">
                  {studentName || 'Siswa Duta'}
                </h3>
                <p className="text-[10px] text-[#6bff8f] font-semibold">
                  Kelas {studentClass || 'VIII'} · Duta Bijak Plastik 2026
                </p>
              </div>
            </div>

            <button
              onClick={generateCertificatePDF}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold text-[#3b2313] transition-all hover:scale-105 active:scale-95 shadow-md border border-[#8e4912]"
              style={{
                background: 'linear-gradient(to bottom, #f0a345, #d27b22)',
                fontFamily: 'var(--font-outfit)',
              }}
            >
              <span className="material-symbols-outlined text-base">workspace_premium</span>
              <span className="hidden sm:inline">{certGenerated ? 'Unduh PDF' : 'Cetak Sertifikat'}</span>
            </button>
          </div>
        </PageContainer>
      </header>

      {/* ── Main Content Container ── */}
      <main className="relative z-10">
        <PageContainer py="py-8" maxWidth="wide" className="space-y-8">
          
          {/* ── HERO BANNER: Mascot & Title ── */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative rounded-3xl p-6 sm:p-10 backdrop-blur-xl bg-gradient-to-r from-[#083b54]/90 via-[#006591]/80 to-[#083b54]/90 border-2 border-white/20 shadow-2xl overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6"
          >
            {/* Background Accent Lines */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(107,255,143,0.15),transparent_50%)] pointer-events-none" />

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left z-10">
              <MikaMascot size={100} bubbleSide="right" pop message="Selamat! Kamu resmi menjadi Duta Bijak Plastik 2026!" />
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#6bff8f]/20 text-[#6bff8f] text-xs font-extrabold mb-3 border border-[#6bff8f]/30">
                  <span className="material-symbols-outlined text-base">verified</span>
                  <span>Ekspedisi Sains IPA SMP · Terverifikasi Tuntas</span>
                </div>
                <h1
                  className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-3 tracking-tight"
                  style={{ fontFamily: 'var(--font-outfit)' }}
                >
                  Rangkuman Ekspedisi & PR Digital
                </h1>
                <p className="text-xs sm:text-sm text-blue-100 max-w-2xl leading-relaxed">
                  Selamat <strong className="text-[#6bff8f]">{studentName || 'Siswa Duta'}</strong>! Kamu telah memecahkan teka-teki bahaya mikroplastik dari sumber pelapukan, kontaminasi pangan, hingga organ manusia.
                </p>
              </div>
            </div>

            <motion.button
              onClick={generateCertificatePDF}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-5 rounded-2xl font-extrabold text-base text-[#3b2313] flex items-center gap-3 shadow-xl shrink-0 cursor-pointer border-2 border-[#8e4912] z-10"
              style={{
                background: 'linear-gradient(to bottom, #f0a345, #d27b22)',
                boxShadow: 'inset 0 3px 0 rgba(255,255,255,0.3), 0 10px 20px rgba(0,0,0,0.4)',
                fontFamily: 'var(--font-outfit)',
              }}
            >
              <span className="material-symbols-outlined text-2xl">workspace_premium</span>
              <span>{certGenerated ? 'Unduh Ulang Sertifikat' : 'Cetak Sertifikat Duta Ekologi'}</span>
            </motion.button>
          </motion.div>

          {/* ── EDUCATIONAL JOURNEY CHAIN (Interactive Visual Storytelling Timeline) ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-5 sm:p-7 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-white/15 pb-4 mb-6">
              <div>
                <h2
                  className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2"
                  style={{ fontFamily: 'var(--font-outfit)' }}
                >
                  <span className="material-symbols-outlined text-[#6bff8f]">route</span>
                  <span>Rantai Perjalanan Mikroplastik (6 Tahap)</span>
                </h2>
                <p className="text-xs text-blue-200">
                  Ketuk salah satu tahap untuk melihat kilas balik investigasimu.
                </p>
              </div>
              <span className="text-xs font-bold text-[#6bff8f] bg-[#6bff8f]/10 px-3 py-1 rounded-full border border-[#6bff8f]/30">
                Alur Sains IPA
              </span>
            </div>

            {/* Story Timeline Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {JOURNEY_STORY_STEPS.map((step) => {
                const isActive = selectedStoryStep === step.id;
                return (
                  <button
                    key={step.id}
                    onClick={() => setSelectedStoryStep(step.id)}
                    className={`p-3.5 rounded-2xl border transition-all text-left flex flex-col justify-between h-32 cursor-pointer relative overflow-hidden ${
                      isActive
                        ? 'bg-gradient-to-br from-[#006591] to-[#083b54] border-[#6bff8f] ring-2 ring-[#6bff8f]/40 shadow-lg scale-105'
                        : 'bg-white/10 hover:bg-white/20 border-white/15 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span
                        className="material-symbols-outlined text-2xl p-1.5 rounded-xl bg-white/10 text-white"
                        style={{ color: step.color }}
                      >
                        {step.icon}
                      </span>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-black/20 text-[#6bff8f]">
                        #{step.id}
                      </span>
                    </div>

                    <div>
                      <p className="text-xs font-extrabold text-white leading-tight font-[family-name:var(--font-outfit)]">
                        {step.title.split(':')[1] || step.title}
                      </p>
                      <p className="text-[10px] text-blue-200 opacity-80 mt-0.5">{step.tag}</p>
                    </div>

                    {isActive && (
                      <motion.div
                        layoutId="activeStoryMarker"
                        className="absolute bottom-0 left-0 right-0 h-1 bg-[#6bff8f]"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected Story Step Detail Panel */}
            <AnimatePresence mode="wait">
              {selectedStoryStep && (
                <motion.div
                  key={selectedStoryStep}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-5 p-5 rounded-2xl bg-[#083b54]/90 border border-white/20 shadow-inner flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#006591] text-white flex items-center justify-center shrink-0 shadow-md">
                      <span className="material-symbols-outlined text-2xl">
                        {JOURNEY_STORY_STEPS[selectedStoryStep - 1].icon}
                      </span>
                    </div>
                    <div>
                      <h4
                        className="font-extrabold text-base text-white mb-1"
                        style={{ fontFamily: 'var(--font-outfit)' }}
                      >
                        {JOURNEY_STORY_STEPS[selectedStoryStep - 1].title}
                      </h4>
                      <p className="text-xs text-blue-100 max-w-2xl leading-relaxed">
                        {JOURNEY_STORY_STEPS[selectedStoryStep - 1].desc}
                      </p>
                    </div>
                  </div>

                  <div className="px-4 py-2.5 rounded-xl bg-white/10 border border-white/15 text-xs text-right shrink-0">
                    <span className="text-[#6bff8f] font-bold block mb-0.5">Status Evaluasi:</span>
                    <span className="text-white font-semibold">Tercatat di Jurnal LKPD ✓</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ── INTERACTIVE TAB NAVIGATION HEADER ── */}
          <div className="flex items-center justify-center gap-2 bg-white/10 backdrop-blur-xl p-2 rounded-2xl border border-white/20 max-w-2xl mx-auto shadow-lg">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 py-3 px-4 rounded-xl font-extrabold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-gradient-to-r from-[#006591] to-[#004c6e] text-white shadow-md border border-white/20'
                  : 'text-slate-300 hover:bg-white/10'
              }`}
            >
              <span className="material-symbols-outlined text-lg">analytics</span>
              <span>Hasil & LKPD</span>
            </button>
            <button
              onClick={() => setActiveTab('assignment')}
              className={`flex-1 py-3 px-4 rounded-xl font-extrabold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'assignment'
                  ? 'bg-gradient-to-r from-[#006591] to-[#004c6e] text-white shadow-md border border-white/20'
                  : 'text-slate-300 hover:bg-white/10'
              }`}
            >
              <span className="material-symbols-outlined text-lg">cloud_upload</span>
              <span>Dokumentasi Aksi / PR</span>
            </button>
            <button
              onClick={() => setActiveTab('feedback')}
              className={`flex-1 py-3 px-4 rounded-xl font-extrabold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'feedback'
                  ? 'bg-gradient-to-r from-[#006591] to-[#004c6e] text-white shadow-md border border-white/20'
                  : 'text-slate-300 hover:bg-white/10'
              }`}
            >
              <span className="material-symbols-outlined text-lg">star</span>
              <span>Umpan Balik</span>
            </button>
          </div>

          {/* ── DYNAMIC TAB CONTENT ── */}
          <AnimatePresence mode="wait">
            {/* TAB 1: OVERVIEW & LKPD RESULTS */}
            {activeTab === 'overview' && (
              <motion.div
                key="overview-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                {/* KPI Cards Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <SummaryKpiCard
                    label="Partikel Dideteksi"
                    value={totalParticles.toLocaleString('id-ID')}
                    subtitle="Tingkat kontaminasi sampel"
                    icon="warning"
                    accentColor="#ba1a1a"
                    badge="Partikel"
                  />

                  <SummaryKpiCard
                    label="Organ Paling Kritis"
                    value={parseOrganLabel(mostDangerousOrgan)}
                    subtitle="Hasil analisis anatomi"
                    icon="coronavirus"
                    accentColor="#d27b22"
                  />

                  <SummaryKpiCard
                    label="Akurasi Kuis"
                    value={`${quizCorrect} / ${totalQuiz || 5}`}
                    subtitle="Jawaban pilihan ganda benar"
                    icon="fact_check"
                    accentColor="#006e2f"
                    badge="Benar"
                  />

                  <SummaryKpiCard
                    label="Status Ekspedisi"
                    value="TUNTAS ✓"
                    subtitle="6 Tahap Terlampaui"
                    icon="task_alt"
                    accentColor="#006591"
                  />
                </div>

                {/* Glassmorphic Resume LKPD Panel */}
                <div className="backdrop-blur-xl bg-white/95 rounded-3xl p-6 sm:p-8 text-[#083b54] shadow-2xl border-2 border-white/50 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <h3
                      className="text-xl font-extrabold flex items-center gap-2 text-[#083b54]"
                      style={{ fontFamily: 'var(--font-outfit)' }}
                    >
                      <span className="material-symbols-outlined text-[#006591] text-2xl">assignment</span>
                      <span>Rangkuman Jawaban LKPD 1 — LKPD 4 & Komitmen</span>
                    </h3>
                    <span className="text-xs font-bold text-[#006e2f] bg-[#e6f4ea] px-3 py-1 rounded-full border border-[#006e2f]/20">
                      Tersimpan di Sistem
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 rounded-2xl bg-[#f0f8ff] border border-[#006591]/20 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-[#006591] text-sm">LKPD 1 — Pelapukan Plastik</span>
                        <span className="text-[10px] bg-[#006591]/10 text-[#006591] font-bold px-2 py-0.5 rounded">Tahap 2</span>
                      </div>
                      <p className="text-[#3e4850] italic leading-relaxed">{lkpdAnswers.lkpd1 || '(Belum diisi)'}</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#f0f8ff] border border-[#006591]/20 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-[#006591] text-sm">LKPD 2 — Kontaminasi Pangan</span>
                        <span className="text-[10px] bg-[#006591]/10 text-[#006591] font-bold px-2 py-0.5 rounded">Tahap 3</span>
                      </div>
                      <p className="text-[#3e4850] italic leading-relaxed">{lkpdAnswers.lkpd2 || '(Belum diisi)'}</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#f0f8ff] border border-[#006591]/20 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-[#006591] text-sm">LKPD 3 — Bioakumulasi Organ</span>
                        <span className="text-[10px] bg-[#006591]/10 text-[#006591] font-bold px-2 py-0.5 rounded">Tahap 4</span>
                      </div>
                      <p className="text-[#3e4850] italic leading-relaxed">{lkpdAnswers.lkpd3q1 || lkpdAnswers.lkpd3q2 || '(Belum diisi)'}</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#f0f8ff] border border-[#006591]/20 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-[#006591] text-sm">LKPD 4 — Case Summary HOTS</span>
                        <span className="text-[10px] bg-[#006591]/10 text-[#006591] font-bold px-2 py-0.5 rounded">Tahap 5</span>
                      </div>
                      <p className="text-[#3e4850] italic leading-relaxed">{lkpdAnswers.lkpd4 || '(Belum diisi)'}</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#e6f4ea] border border-[#006e2f]/30 space-y-1.5 md:col-span-2">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-[#006e2f] text-sm flex items-center gap-1">
                          <span className="material-symbols-outlined text-base">park</span>
                          <span>Janji Komitmen Ekologi Duta Lingkungan</span>
                        </span>
                        <span className="text-[10px] bg-[#006e2f]/10 text-[#006e2f] font-bold px-2 py-0.5 rounded">Tahap 6</span>
                      </div>
                      <p className="text-[#083b54] font-semibold leading-relaxed whitespace-pre-line">{lkpdAnswers.commitment || '(Belum ditandatangani)'}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 2: UPLOAD CLOUDINARY & PR DIGITAL */}
            {activeTab === 'assignment' && (
              <motion.div
                key="assignment-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <DriveInputCard
                  driveLink={driveLink}
                  onDriveLinkChange={setDriveLink}
                  sosmedLink={sosmedLink}
                  onSosmedLinkChange={setSosmedLink}
                  actionNote={actionNote}
                  onActionNoteChange={setActionNote}
                />
              </motion.div>
            )}

            {/* TAB 3: RATING & UMPAN BALIK */}
            {activeTab === 'feedback' && (
              <motion.div
                key="feedback-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <FeedbackFormCard
                  rating={rating}
                  onRatingChange={setRating}
                  feedback={feedback}
                  onFeedbackChange={setFeedback}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── FINAL SUBMIT / SUCCESS SCREEN ── */}
          <div className="pt-4">
            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="backdrop-blur-xl bg-gradient-to-br from-[#e6f4ea] to-[#d0f0db] border-2 border-[#006e2f] rounded-3xl p-8 text-center space-y-4 shadow-2xl text-[#083b54]"
              >
                <div className="w-16 h-16 rounded-full bg-[#006e2f] text-white flex items-center justify-center mx-auto shadow-lg">
                  <span className="material-symbols-outlined text-4xl">verified_user</span>
                </div>
                <h3
                  className="text-2xl font-extrabold text-[#006e2f]"
                  style={{ fontFamily: 'var(--font-outfit)' }}
                >
                  Seluruh Berkas Bukti Aksi & Data Terkirim!
                </h3>
                <p className="text-xs sm:text-sm text-[#083b54] max-w-lg mx-auto leading-relaxed">
                  Jawaban LKPD, berkas dokumentasi aksi, tautan media sosial, serta umpan balikmu telah tersimpan dengan aman di server database guru.
                </p>
                <div className="pt-3 flex flex-wrap justify-center gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      reset();
                      router.push('/');
                    }}
                    className="bg-[#006591] hover:bg-[#083b54] text-white font-extrabold px-8 py-3.5 rounded-2xl text-xs sm:text-sm transition-all cursor-pointer shadow-lg active:scale-95"
                  >
                    Kembali ke Beranda Utama
                  </button>
                  <button
                    type="button"
                    onClick={generateCertificatePDF}
                    className="bg-[#006e2f] hover:bg-[#004f20] text-white font-extrabold px-8 py-3.5 rounded-2xl text-xs sm:text-sm transition-all cursor-pointer shadow-lg active:scale-95 flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-lg">workspace_premium</span>
                    <span>Cetak Sertifikat Duta Ekologi</span>
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.button
                type="button"
                onClick={handleSubmitAll}
                disabled={submitting}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-5 rounded-2xl font-extrabold text-base sm:text-lg flex items-center justify-center gap-3 transition-all duration-200 disabled:opacity-60 cursor-pointer shadow-2xl text-white border-2 border-[#004f20]"
                style={{
                  fontFamily: 'var(--font-outfit)',
                  background: 'linear-gradient(135deg, #009940 0%, #006e2f 100%)',
                  boxShadow: '0 10px 30px rgba(0,110,47,0.4)',
                }}
              >
                {submitting ? (
                  <>
                    <span className="material-symbols-outlined text-2xl animate-spin">progress_activity</span>
                    <span>Mengirimkan Berkas Aksi & Data Ekspedisi...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-2xl">send</span>
                    <span>Kirim Berkas Bukti Aksi & Simpan Rangkuman Akhir</span>
                  </>
                )}
              </motion.button>
            )}
          </div>
        </PageContainer>
      </main>
    </div>
  );
}

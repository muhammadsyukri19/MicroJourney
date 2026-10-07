// TEMPLATE: TeacherDashboardTemplate
// Page template untuk orchestrate organism & molecule di Dashboard Guru.
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppUser, useAuthStore } from '@/lib/authStore';

// Atomic Components
import StatCard from '@/components/atoms/StatCard';
import ClassBadge from '@/components/atoms/ClassBadge';
import StudentDetailDrawer, { Submission } from '@/components/molecules/StudentDetailDrawer';
import ClassManagement, { ClassItem } from '@/components/organisms/ClassManagement';
import ImportCsvModal from '@/components/organisms/ImportCsvModal';
import { downloadCsv } from '@/lib/utils/csv.utils';

// Helper parse organ label
const ORGAN_LABEL_MAP: Record<string, string> = {
  mouth: 'Mulut', stomach: 'Lambung', smallIntestine: 'Usus Halus', largeIntestine: 'Usus Besar', blood: 'Darah',
};
function parseOrganLabel(raw: string): string {
  if (!raw) return '-';
  const r = raw.toLowerCase();
  if (r.includes('usus halus') || r.includes('small') || r.includes('intestinum') || r.includes('villus') || r.includes('vili')) return 'Usus Halus';
  if (r.includes('usus besar') || r.includes('large') || r.includes('kolon')) return 'Usus Besar';
  if (r.includes('lambung') || r.includes('stomach') || r.includes('gaster') || r.includes('hcl')) return 'Lambung';
  if (r.includes('darah') || r.includes('blood') || r.includes('sirkulasi') || r.includes('jantung')) return 'Darah';
  if (r.includes('mulut') || r.includes('mouth') || r.includes('saliva')) return 'Mulut';
  return ORGAN_LABEL_MAP[raw] ?? (raw.length > 20 ? raw.slice(0, 18) + '…' : raw);
}

// Marker AR Data
const AR_MARKERS = [
  { code: '01', name: 'PETE / PET', desc: 'Polyethylene Terephthalate (Botol Minuman, Wadah Makanan)', hazard: 'Sedang (Antimoni Trioksida)', color: '#006591' },
  { code: '02', name: 'HDPE', desc: 'High-Density Polyethylene (Botol Susu, Shampo, Deterjen)', hazard: 'Rendah (Paling Stabil)', color: '#006e2f' },
  { code: '03', name: 'PVC', desc: 'Polyvinyl Chloride (Pipa Air, Kabel, Jas Hujan)', hazard: 'Sangat Tinggi (Phthalates & Lead)', color: '#ba1a1a' },
  { code: '04', name: 'LDPE', desc: 'Low-Density Polyethylene (Kantong Plastik, Plastic Wrap)', hazard: 'Sedang (Mengurai Cepat)', color: '#d27b22' },
  { code: '05', name: 'PP', desc: 'Polypropylene (Wadah Makanan Panas, Sedotan, Tutup Botol)', hazard: 'Rendah (Tahan Panas)', color: '#083b54' },
  { code: '06', name: 'PS', desc: 'Polystyrene (Styrofoam, Gelas Kopi Sekali Pakai)', hazard: 'Tinggi (Stirena Beracun)', color: '#e65100' },
];

export default function TeacherDashboardTemplate() {
  const router = useRouter();
  const { currentUser, users, logout, registerStudent, deleteStudent } = useAuthStore();

  // Submissions & Loading
  const [data, setData] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  // Tabs & Navigation: 'rekap' | 'manajemen' | 'bahan-ajar' | 'pengaturan'
  const [activeTab, setActiveTab] = useState<'rekap' | 'manajemen' | 'bahan-ajar' | 'pengaturan'>('rekap');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Class Management State
  const [classList, setClassList] = useState<ClassItem[]>([
    { id: 'c-1', name: 'VIII-A', academicYear: '2026/2027' },
    { id: 'c-2', name: 'VIII-B', academicYear: '2026/2027' },
    { id: 'c-3', name: 'VIII-C', academicYear: '2026/2027' },
  ]);
  const [selectedClassName, setSelectedClassName] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Settings State
  const [stageLocks, setStageLocks] = useState<Record<number, boolean>>({
    1: true, 2: true, 3: true, 4: true, 5: true, 6: true
  });
  const [announcement, setAnnouncement] = useState('Selamat datang di media pembelajaran MicroJourney AR IPA Kelas VIII. Selesaikan Tahap 1 hingga Tahap 6 sesuai petunjuk.');
  const [announcementSaved, setAnnouncementSaved] = useState(false);

  useEffect(() => {
    fetchSubmissions();
    fetchSettings();
    fetchStudents();

    // Auto-refresh polling every 6 seconds for real-time submission & student updates from FE
    const interval = setInterval(() => {
      fetchSubmissions();
      fetchStudents();
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!currentUser) {
      router.replace('/login');
      return;
    }
    if (currentUser.role === 'student') router.replace('/');
  }, [currentUser, router]);

  if (!currentUser || currentUser.role === 'student') return null;

  const adminUser = currentUser;

  function fetchSubmissions() {
    fetch('/api/lkpd')
      .then(r => r.json())
      .then(d => {
        if (d.ok && d.data) setData(d.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  function fetchSettings() {
    fetch('/api/settings')
      .then(r => r.json())
      .then(res => {
        if (res.ok && res.data) {
          if (res.data.classList) setClassList(res.data.classList);
          if (res.data.stageLocks) setStageLocks(res.data.stageLocks);
          if (res.data.announcement) setAnnouncement(res.data.announcement);
        }
      })
      .catch(() => {});
  }

  function fetchStudents() {
    fetch('/api/users/students')
      .then(r => r.json())
      .then(res => {
        if (res.ok && Array.isArray(res.data)) {
          // Merge API students into authStore
          res.data.forEach((st: AppUser) => {
            useAuthStore.getState().registerStudent({
              name: st.name,
              email: st.email,
              password: st.password || `${st.email.split('@')[0]}123`,
              className: st.className || '-',
              createdBy: adminUser.email,
            });
          });
        }
      })
      .catch(() => {});
  }

  function saveSettingsToDb(updatedConfig: { classList?: ClassItem[]; stageLocks?: Record<number, boolean>; announcement?: string }) {
    const payload = {
      classList: updatedConfig.classList ?? classList,
      stageLocks: updatedConfig.stageLocks ?? stageLocks,
      announcement: updatedConfig.announcement ?? announcement,
    };
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(err => console.error('Failed to sync settings to DB:', err));
  }

  // Handle Class Creation
  function handleCreateClass(className: string, academicYear: string) {
    const newClass: ClassItem = {
      id: `class-${Date.now()}`,
      name: className,
      academicYear: academicYear || '2026/2027',
    };
    const nextList = [...classList, newClass];
    setClassList(nextList);
    localStorage.setItem('mj_class_list', JSON.stringify(nextList));
    saveSettingsToDb({ classList: nextList });
  }

  function handleDeleteClass(classId: string) {
    const nextList = classList.filter(c => c.id !== classId);
    setClassList(nextList);
    localStorage.setItem('mj_class_list', JSON.stringify(nextList));
    if (selectedClassName && !nextList.some(c => c.name.toLowerCase() === selectedClassName.toLowerCase())) {
      setSelectedClassName('');
    }
    saveSettingsToDb({ classList: nextList });
  }

  function handleRegisterStudentDb(studentData: { name: string; email: string; password: string; className: string }) {
    registerStudent({ ...studentData, createdBy: adminUser.email });
    fetch('/api/users/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...studentData, createdBy: adminUser.email }),
    })
      .then(() => fetchStudents())
      .catch(() => {});
  }

  function handleDeleteStudentDb(studentId: string) {
    const targetStudent = users.find(u => u.id === studentId);
    deleteStudent(studentId);
    if (targetStudent) {
      fetch(`/api/users/students?email=${encodeURIComponent(targetStudent.email)}`, { method: 'DELETE' })
        .then(() => fetchStudents())
        .catch(() => {});
    }
  }

  // Filter Submissions based on selected class & search query
  const filteredSubmissions = data.filter(d => {
    const matchClass = selectedClassName
      ? d.studentClass.toLowerCase() === selectedClassName.toLowerCase()
      : true;
    const matchSearch = searchQuery.trim()
      ? d.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || d.studentClass.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchClass && matchSearch;
  });

  const registeredStudents = users.filter((u): u is AppUser => u.role === 'student');

  // Calculate Submissions per class map
  const completedSubmissionsMap: Record<string, number> = {};
  data.forEach(d => {
    if (d.studentClass) {
      const c = d.studentClass.toUpperCase();
      completedSubmissionsMap[c] = (completedSubmissionsMap[c] || 0) + 1;
    }
  });

  // Calculate analytics for selected view
  const avgParticles = filteredSubmissions.length
    ? Math.round(filteredSubmissions.reduce((s, d) => s + d.totalParticles, 0) / filteredSubmissions.length)
    : 0;

  const organCounts: Record<string, number> = {};
  filteredSubmissions.forEach(d => {
    if (d.mostDangerousOrgan) {
      const label = parseOrganLabel(d.mostDangerousOrgan);
      organCounts[label] = (organCounts[label] || 0) + 1;
    }
  });
  const topOrgan = Object.entries(organCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';

  const totalQuizQuestions = filteredSubmissions.length * 5;
  const totalCorrectQuiz = filteredSubmissions.reduce((s, d) => s + (d.quizCorrect || 0), 0);
  const quizAccuracyPct = totalQuizQuestions > 0 ? Math.round((totalCorrectQuiz / totalQuizQuestions) * 100) : 0;

  function handleExportSubmissionsCsv() {
    if (filteredSubmissions.length === 0) return;
    const headers = ['Nama Siswa', 'Kelas', 'Total Partikel', 'Organ Kritis', 'Kuis Benar', 'Kuis Salah', 'Link PR Drive', 'Link Sosmed', 'Rating Siswa', 'Catatan Aksi', 'Waktu Submit', 'Sumpah Komitmen'];
    const rows = filteredSubmissions.map(d => [
      `"${d.studentName.replace(/"/g, '""')}"`,
      `"${d.studentClass}"`,
      d.totalParticles,
      `"${parseOrganLabel(d.mostDangerousOrgan)}"`,
      d.quizCorrect || 0,
      d.quizWrong || 0,
      `"${(d.driveLink || '').replace(/"/g, '""')}"`,
      `"${(d.sosmedLink || '').replace(/"/g, '""')}"`,
      d.rating || 5,
      `"${(d.actionNote || '').replace(/"/g, '""')}"`,
      `"${new Date(d.createdAt).toLocaleString('id-ID')}"`,
      `"${(d.commitment || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCsv(csvContent, `Rekap_Nilai_MicroJourney_${selectedClassName || 'Semua_Kelas'}_${new Date().toISOString().slice(0, 10)}.csv`);
  }

  function handleToggleStage(stageId: number) {
    const updated = { ...stageLocks, [stageId]: !stageLocks[stageId] };
    setStageLocks(updated);
    localStorage.setItem('mj_stage_locks', JSON.stringify(updated));
    saveSettingsToDb({ stageLocks: updated });
  }

  function handleSaveAnnouncement() {
    localStorage.setItem('mj_class_announcement', announcement);
    saveSettingsToDb({ announcement });
    setAnnouncementSaved(true);
    setTimeout(() => setAnnouncementSaved(false), 2000);
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#111827] flex flex-col lg:flex-row font-[family-name:var(--font-inter)] selection:bg-[#006591]/20">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="font-[family-name:var(--font-outfit)] font-extrabold text-lg tracking-tight text-[#083b54]">
            MicroJourney <span className="text-[#006591]">AR</span>
          </span>
          <span className="text-[10px] bg-emerald-50 text-[#006e2f] border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
            GURU
          </span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-slate-600 hover:text-[#006591] p-1 cursor-pointer">
          <span className="material-symbols-outlined">{mobileMenuOpen ? 'close' : 'menu'}</span>
        </button>
      </div>

      {/* SIDEBAR NAVIGATION (COMPACT, SEMI-BLUE TINTED, VISUAL ACCENT) */}
      <aside
        className={`${mobileMenuOpen ? 'flex' : 'hidden'} lg:flex w-full lg:w-56 border-b lg:border-b-0 lg:border-r border-[#d0e3f0] flex-col z-20 shrink-0 absolute lg:relative top-[56px] lg:top-0 h-[calc(100vh-56px)] lg:h-auto overflow-hidden shadow-xs`}
        style={{ background: 'linear-gradient(180deg, #edf6fc 0%, #e3f1f9 45%, #ebf5fc 100%)' }}
      >
        <div
          className="absolute -top-20 -left-20 w-64 h-64 opacity-70 pointer-events-none rounded-full"
          style={{ background: 'radial-gradient(circle, #bde3f7 0%, #9cd5f5 45%, transparent 75%)' }}
        />
        <div
          className="absolute bottom-6 -right-16 w-56 h-56 opacity-50 pointer-events-none rounded-full"
          style={{ background: 'radial-gradient(circle, #7ee8ad 0%, transparent 75%)' }}
        />

        <svg
          className="absolute inset-0 w-full h-full opacity-[0.08] pointer-events-none"
          viewBox="0 0 240 800"
          fill="none"
        >
          <path d="M-20 120 Q100 80 200 120 T400 120" stroke="#006591" strokeWidth="2" fill="none" />
          <path d="M-20 150 Q100 110 200 150 T400 150" stroke="#006591" strokeWidth="1.2" fill="none" />
          <path d="M-20 450 Q100 410 200 450 T400 450" stroke="#006e2f" strokeWidth="2" fill="none" />
          <path d="M-20 480 Q100 440 200 480 T400 480" stroke="#006e2f" strokeWidth="1.2" fill="none" />
        </svg>

        <div className="p-4 pb-3.5 hidden lg:block border-b border-[#d2e4f0] relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-white/90 p-1 shadow-2xs border border-[#c4e0f0] flex items-center justify-center shrink-0">
                <img src="/logo/no-bg.webp" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="font-[family-name:var(--font-outfit)] font-extrabold text-base leading-none tracking-tight text-[#083b54]">
                  MicroJourney <span className="text-[#006591]">AR</span>
                </h1>
              </div>
            </div>
            <Link
              href="/"
              title="Ke Beranda Utama"
              className="text-[#006591] hover:text-[#083b54] bg-white/80 hover:bg-white p-1.5 rounded-lg border border-[#c4e0f0] transition-all shadow-2xs shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_outward</span>
            </Link>
          </div>
        </div>

        <nav className="flex-1 px-2.5 py-2.5 flex flex-col gap-1.5 relative z-10">
          <p className="text-[9px] font-extrabold text-[#7098ab] uppercase tracking-widest px-2.5 py-1">
            MENU EDUKATOR
          </p>

          <button
            onClick={() => { setActiveTab('rekap'); setSelectedSubmission(null); setMobileMenuOpen(false); }}
            className={`flex items-center gap-3 px-3 py-2.5 transition-all text-xs font-bold cursor-pointer ${activeTab === 'rekap'
                ? 'bg-white text-[#006591] border-l-[4px] border-[#006591] rounded-r-xl shadow-xs'
                : 'text-slate-600 hover:bg-white/60 hover:text-slate-900 border-l-[4px] border-transparent rounded-xl'
              }`}
          >
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${activeTab === 'rekap' ? 'bg-[#006591] text-white' : 'bg-white/80 text-slate-500 border border-[#d2e4f0]'}`}>
              <span className="material-symbols-outlined text-[15px]">analytics</span>
            </div>
            <span className="truncate">Data Penilaian</span>
          </button>

          <button
            onClick={() => { setActiveTab('manajemen'); setSelectedSubmission(null); setMobileMenuOpen(false); }}
            className={`flex items-center gap-3 px-3 py-2.5 transition-all text-xs font-bold cursor-pointer ${activeTab === 'manajemen'
                ? 'bg-white text-[#006591] border-l-[4px] border-[#006591] rounded-r-xl shadow-xs'
                : 'text-slate-600 hover:bg-white/60 hover:text-slate-900 border-l-[4px] border-transparent rounded-xl'
              }`}
          >
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${activeTab === 'manajemen' ? 'bg-[#006591] text-white' : 'bg-white/80 text-slate-500 border border-[#d2e4f0]'}`}>
              <span className="material-symbols-outlined text-[15px]">school</span>
            </div>
            <span className="truncate">Kelola Kelas</span>
          </button>

          <button
            onClick={() => { setActiveTab('bahan-ajar'); setSelectedSubmission(null); setMobileMenuOpen(false); }}
            className={`flex items-center gap-3 px-3 py-2.5 transition-all text-xs font-bold cursor-pointer ${activeTab === 'bahan-ajar'
                ? 'bg-white text-[#006591] border-l-[4px] border-[#006591] rounded-r-xl shadow-xs'
                : 'text-slate-600 hover:bg-white/60 hover:text-slate-900 border-l-[4px] border-transparent rounded-xl'
              }`}
          >
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${activeTab === 'bahan-ajar' ? 'bg-[#006591] text-white' : 'bg-white/80 text-slate-500 border border-[#d2e4f0]'}`}>
              <span className="material-symbols-outlined text-[15px]">qr_code_scanner</span>
            </div>
            <span className="truncate">Bahan Ajar AR</span>
          </button>

          <button
            onClick={() => { setActiveTab('pengaturan'); setSelectedSubmission(null); setMobileMenuOpen(false); }}
            className={`flex items-center gap-3 px-3 py-2.5 transition-all text-xs font-bold cursor-pointer ${activeTab === 'pengaturan'
                ? 'bg-white text-[#006591] border-l-[4px] border-[#006591] rounded-r-xl shadow-xs'
                : 'text-slate-600 hover:bg-white/60 hover:text-slate-900 border-l-[4px] border-transparent rounded-xl'
              }`}
          >
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${activeTab === 'pengaturan' ? 'bg-[#006591] text-white' : 'bg-white/80 text-slate-500 border border-[#d2e4f0]'}`}>
              <span className="material-symbols-outlined text-[15px]">tune</span>
            </div>
            <span className="truncate">Kontrol Tahap</span>
          </button>

          {adminUser.role === 'superadmin' && (
            <Link href="/superadmin"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-xs font-bold text-slate-600 hover:bg-white/60 hover:text-slate-900 mt-1">
              <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-[15px]">shield</span>
              </div>
              <span className="truncate">Akses Admin</span>
            </Link>
          )}

          <Link href="/" className="lg:hidden flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-xs font-bold text-slate-600 hover:bg-white/60 hover:text-slate-900 mt-1">
            <div className="w-6 h-6 rounded-lg bg-white/80 text-slate-500 flex items-center justify-center">
              <span className="material-symbols-outlined text-[15px]">home</span>
            </div>
            <span className="truncate">Kembali Beranda</span>
          </Link>
        </nav>

        <div className="p-3 m-2.5 bg-white/90 rounded-xl border border-[#cbe1ef] flex flex-col gap-2.5 relative z-10 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#006591] text-white flex items-center justify-center font-extrabold text-xs shadow-2xs shrink-0">
              {adminUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-bold text-[#083b54] truncate">{adminUser.name}</p>
              <p className="text-[10px] text-[#006591] font-semibold truncate">{adminUser.school || 'Guru IPA Kelas VIII'}</p>
            </div>
          </div>

          <button
            onClick={() => { logout(); router.push('/'); }}
            className="w-full py-2 bg-[#f0f7fc] hover:bg-red-50 border border-[#d2e4f0] hover:border-red-200 text-[#083b54] hover:text-red-600 font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-[15px]">logout</span>
            <span>Keluar Sesi</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 lg:h-screen overflow-y-auto relative flex flex-col">
        {/* Sticky Header */}
        <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 lg:px-6 py-3.5 flex justify-between items-center sticky top-0 z-10 shadow-2xs">
          <div>
            <h2
              className="font-extrabold text-lg md:text-xl text-[#083b54]"
              style={{ fontFamily: 'var(--font-outfit)' }}
            >
              {activeTab === 'rekap' && (selectedClassName ? `Analisis & Rangkuman Kelas ${selectedClassName}` : 'Analisis & Rangkuman Seluruh Kelas')}
              {activeTab === 'manajemen' && 'Manajemen Kelompok Kelas & Siswa'}
              {activeTab === 'bahan-ajar' && 'Pusat Bahan Ajar & Hub Marker AR Fisik'}
              {activeTab === 'pengaturan' && 'Kontrol Akses Tahap & Pengumuman'}
            </h2>
            <p className="text-xs text-slate-500 hidden md:block">
              IPA Kelas VIII • Pengamatan Pencemaran Mikroplastik & Anatomi Bioakumulasi
            </p>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'rekap' && (
              <>
                <button
                  onClick={handleExportSubmissionsCsv}
                  disabled={filteredSubmissions.length === 0}
                  className="text-xs font-extrabold text-white bg-[#006e2f] hover:bg-[#005524] px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  Export Nilai (CSV/Excel)
                </button>
                <button
                  onClick={fetchSubmissions}
                  className="text-xs text-[#006591] hover:text-[#004c6e] font-bold bg-[#006591]/10 hover:bg-[#006591]/20 px-3 py-2 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin' : ''}`}>sync</span>
                  Refresh
                </button>
              </>
            )}
          </div>
        </header>

        <div className="px-4 lg:px-6 py-5 w-full flex-1 flex flex-col space-y-5">
          {/* TAB 1: REKAP & ANALISIS PENILAIAN PER KELAS */}
          {activeTab === 'rekap' && (
            <div className="flex-1 flex flex-col animate-in fade-in duration-300 space-y-6">
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
                <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">
                    Pilih Kelas:
                  </span>
                  <ClassBadge
                    classNameLabel="Semua Kelas"
                    studentCount={data.length}
                    isActive={selectedClassName === ''}
                    onClick={() => setSelectedClassName('')}
                  />
                  {classList.map(c => {
                    const count = data.filter(d => d.studentClass.toLowerCase() === c.name.toLowerCase()).length;
                    return (
                      <ClassBadge
                        key={c.id}
                        classNameLabel={`Kelas ${c.name}`}
                        studentCount={count}
                        isActive={selectedClassName.toLowerCase() === c.name.toLowerCase()}
                        onClick={() => setSelectedClassName(c.name)}
                      />
                    );
                  })}
                </div>

                <div className="relative w-full md:w-72">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                    search
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Cari nama siswa..."
                    className="w-full pl-9 pr-3 py-1.5 bg-[#FAFAFA] border border-slate-200 rounded-xl text-xs outline-none focus:border-[#006591] transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Tuntas LKPD"
                  value={filteredSubmissions.length}
                  subtitle={selectedClassName ? `Total dikirim dari Kelas ${selectedClassName}` : 'Total dikirim seluruh kelas'}
                  icon="assignment_turned_in"
                  accentColor="#006591"
                  badgeText={`${filteredSubmissions.length} Siswa`}
                />

                <StatCard
                  title="Rata-rata Partikel"
                  value={avgParticles.toLocaleString('id-ID')}
                  subtitle="Tingkat kontaminasi sampel"
                  icon="warning"
                  accentColor="#ba1a1a"
                  badgeText="Partikel/Siswa"
                />

                <StatCard
                  title="Organ Kritis Terbanyak"
                  value={topOrgan}
                  subtitle={topOrgan !== '-' ? `${organCounts[topOrgan]} siswa paling terdampak` : 'Belum ada data'}
                  icon="coronavirus"
                  accentColor="#d27b22"
                />

                <StatCard
                  title="Akurasi Kuis Kelas"
                  value={`${quizAccuracyPct}%`}
                  subtitle={`Jawaban benar dari total ${totalQuizQuestions} soal`}
                  icon="fact_check"
                  accentColor="#006e2f"
                  badgeText="Ketuntasan"
                />
              </div>

              <div className="flex gap-6 relative flex-1 min-h-[460px]">
                <div className={`flex-1 transition-all duration-300 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col overflow-hidden ${selectedSubmission ? 'lg:mr-[430px]' : ''}`}>
                  {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2 p-12">
                      <span className="material-symbols-outlined animate-spin text-3xl text-[#006591]">progress_activity</span>
                      <p className="text-xs font-medium">Memuat data laboratorium dari server...</p>
                    </div>
                  ) : filteredSubmissions.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-xs p-12 text-center">
                      <span className="material-symbols-outlined text-4xl mb-2 text-slate-300">folder_open</span>
                      <p className="font-bold text-slate-600">Belum ada data pengerjaan {selectedClassName ? `Kelas ${selectedClassName}` : ''}</p>
                      <p className="text-slate-400 mt-1">Siswa belum mengirimkan lembar E-LKPD dari Tahap 6.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto flex-1">
                      <table className="w-full text-xs text-left whitespace-nowrap min-w-[650px]">
                        <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                          <tr>
                            <th className="px-5 py-3.5">Nama Siswa</th>
                            <th className="px-5 py-3.5">Kelas</th>
                            <th className="px-5 py-3.5">Total Partikel</th>
                            <th className="px-5 py-3.5">Organ Kritis</th>
                            <th className="px-5 py-3.5">Hasil Kuis</th>
                            <th className="px-5 py-3.5">Waktu Submit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredSubmissions.map(row => (
                            <tr
                              key={row._id}
                              className={`cursor-pointer transition-colors ${selectedSubmission?._id === row._id ? 'bg-[#006591]/10 font-semibold' : 'hover:bg-slate-50'}`}
                              onClick={() => setSelectedSubmission(row)}
                            >
                              <td className="px-5 py-4 font-bold text-slate-800 flex items-center gap-2.5">
                                <span className="w-7 h-7 rounded-xl bg-[#006591]/10 text-[#006591] flex items-center justify-center font-extrabold text-[11px]">
                                  {row.studentName.charAt(0).toUpperCase()}
                                </span>
                                {row.studentName}
                              </td>
                              <td className="px-5 py-4">
                                <span className="bg-slate-100 text-slate-700 font-semibold px-2.5 py-1 rounded-md border border-slate-200">
                                  {row.studentClass}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-red-600 font-bold">
                                {row.totalParticles.toLocaleString('id-ID')} Partikel
                              </td>
                              <td className="px-5 py-4">
                                <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-medium">
                                  {parseOrganLabel(row.mostDangerousOrgan)}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <span className="text-emerald-700 font-bold">✓ {row.quizCorrect || 0}</span> / <span className="text-red-500 font-bold">✗ {row.quizWrong || 0}</span>
                              </td>
                              <td className="px-5 py-4 text-slate-400">
                                {new Date(row.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <StudentDetailDrawer
                  submission={selectedSubmission}
                  onClose={() => setSelectedSubmission(null)}
                  parseOrganLabel={parseOrganLabel}
                />
              </div>
            </div>
          )}

          {/* TAB 2: MANAJEMEN KELOMPOK KELAS & AKUN SISWA */}
          {activeTab === 'manajemen' && (
            <ClassManagement
              classList={classList}
              onCreateClass={handleCreateClass}
              onDeleteClass={handleDeleteClass}
              students={registeredStudents}
              onRegisterStudent={handleRegisterStudentDb}
              onDeleteStudent={handleDeleteStudentDb}
              onOpenImportModal={() => setShowImportModal(true)}
              selectedClassName={selectedClassName}
              onSelectClass={(cls) => {
                setSelectedClassName(cls);
                setActiveTab('rekap');
              }}
              completedSubmissions={completedSubmissionsMap}
            />
          )}

          {/* TAB 3: BAHAN AJAR & HUB MARKER AR FISIK */}
          {activeTab === 'bahan-ajar' && (
            <div className="animate-in fade-in duration-300 space-y-6">
              <div className="bg-gradient-to-r from-[#083b54] to-[#006591] rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-300 text-xs font-bold mb-3 border border-white/20">
                    <span className="material-symbols-outlined text-[16px]">view_in_ar</span>
                    Modul AR & Kartu Fisik Praktikum Kelas
                  </div>
                  <h3 className="font-extrabold text-2xl font-[family-name:var(--font-outfit)] mb-2">
                    Kartu Marker AR Kode Plastik Daur Ulang
                  </h3>
                  <p className="text-xs text-blue-100 max-w-xl leading-relaxed">
                    Cetak kartu marker berikut untuk dibagikan kepada kelompok siswa saat praktikum Tahap 1. Siswa dapat mengarahkan kamera HP ke kartu fisik ini untuk simulasi 3D.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => alert('Berkas PDF Printable Marker AR siap dicetak untuk 6 sampel plastik!')}
                  className="bg-[#006e2f] hover:bg-[#005524] text-white font-extrabold px-5 py-3 rounded-xl text-xs flex items-center gap-2 transition-transform active:scale-95 shadow-md shrink-0 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">print</span>
                  Cetak Semua Marker (PDF)
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {AR_MARKERS.map(m => (
                  <div key={m.code} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-2xl font-black text-white px-3.5 py-1 rounded-xl shadow-xs" style={{ background: m.color }}>
                          {m.code}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border border-slate-200 px-2 py-0.5 rounded-full">
                          Kode Daur Ulang
                        </span>
                      </div>
                      <h4 className="font-extrabold text-base text-[#083b54] mb-1 font-[family-name:var(--font-outfit)]">{m.name}</h4>
                      <p className="text-xs text-slate-600 leading-relaxed mb-3">{m.desc}</p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-lg border border-red-100">
                        Bahaya: {m.hazard}
                      </span>
                      <button type="button" onClick={() => alert(`Mengunduh Marker AR ${m.name}...`)} className="text-xs font-bold text-[#006591] hover:underline flex items-center gap-1 cursor-pointer">
                        Unduh <span className="material-symbols-outlined text-[16px]">download</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: KONTROL TAHAP & PENGATURAN */}
          {activeTab === 'pengaturan' && (
            <div className="animate-in fade-in duration-300 space-y-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-base text-[#083b54]">Kontrol Akses Tahap Perjalanan Siswa</h3>
                    <p className="text-xs text-slate-500">Buka atau kunci akses tahap perjalanan sesuai waktu pertemuan di kelas.</p>
                  </div>
                  <span className="text-xs font-bold text-[#006591] bg-[#006591]/10 px-3 py-1 rounded-full">
                    6 Tahap Terbuka
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                  {[
                    { id: 1, name: 'Tahap 1: AR Scanner Kode Plastik', desc: 'Identifikasi kode daur ulang plastik' },
                    { id: 2, name: 'Tahap 2: Simulasi Pelapukan UV', desc: 'Virtual lab pelapukan ombak & sinar UV' },
                    { id: 3, name: 'Tahap 3: Kontaminasi Pangan Laut', desc: 'Scanner partikel pada 5 jenis makanan' },
                    { id: 4, name: 'Tahap 4: Organ Pencernaan Manusia', desc: 'Anatomi visual bioakumulasi organ' },
                    { id: 5, name: 'Tahap 5: E-LKPD Interaktif HOTS', desc: 'Kuis & lembar evaluasi analisis' },
                    { id: 6, name: 'Tahap 6: Sumpah Komitmen Lingkungan', desc: 'Deklarasi komitmen & submit data' },
                  ].map(s => (
                    <div key={s.id} className="p-4 bg-[#FAFAFA] border border-slate-200 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-800">{s.name}</p>
                        <p className="text-slate-400 text-[11px] mt-0.5">{s.desc}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleStage(s.id)}
                        className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors cursor-pointer ${stageLocks[s.id]
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-red-100 text-red-700 border border-red-200'
                          }`}
                      >
                        {stageLocks[s.id] ? 'Terbuka' : 'Terkunci'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                <h3 className="font-bold text-base text-[#083b54] mb-1">Pengumuman & Instruksi Pembelajaran</h3>
                <p className="text-xs text-slate-500 mb-4">Pesan ini akan dikirimkan dan tampil di header ekspedisi siswa.</p>

                <textarea
                  rows={3}
                  value={announcement}
                  onChange={e => setAnnouncement(e.target.value)}
                  className="w-full p-3.5 bg-[#FAFAFA] border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-[#006591] transition-colors mb-3"
                  placeholder="Ketikkan instruksi kelas di sini..."
                />

                <div className="flex items-center justify-between">
                  {announcementSaved ? (
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      Pengumuman berhasil dipublikasikan!
                    </span>
                  ) : <span />}

                  <button
                    type="button"
                    onClick={handleSaveAnnouncement}
                    className="bg-[#006591] hover:bg-[#004c6e] text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-colors shadow-2xs cursor-pointer"
                  >
                    Simpan & Publikasikan Pesan
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {showImportModal && (
        <ImportCsvModal
          onClose={() => setShowImportModal(false)}
          createdBy={adminUser.email}
        />
      )}
    </div>
  );
}

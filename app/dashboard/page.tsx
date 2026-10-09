'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppUser, useAuthStore } from '@/lib/authStore';
import ImportCsvModal from '@/components/dashboard/ImportCsvModal';

interface Submission {
  _id: string;
  createdAt: string;
  studentName: string;
  studentClass: string;
  totalParticles: number;
  mostDangerousOrgan: string;
  lkpd1: string;
  lkpd2: string;
  lkpd3q1: string;
  lkpd3q2: string;
  lkpd4: string;
  commitment: string;
  selectedFoods: string[];
  quizCorrect: number;
  quizWrong: number;
}

// Extract short organ label
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

export default function Dashboard() {
  const router = useRouter();
  const { currentUser, users, logout, registerStudent, deleteStudent, fetchUsers } = useAuthStore();
  const [data, setData] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Submission | null>(null);
  const [filterClass, setFilterClass] = useState('');
  const [studentForm, setStudentForm] = useState({ name: '', email: '', password: '', className: '' });
  const [studentMessage, setStudentMessage] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [activeTab, setActiveTab] = useState<'rekap' | 'manajemen'>('rekap');

  useEffect(() => {
    fetch('/api/lkpd')
      .then(r => r.json())
      .then(d => { setData(d.data || []); setLoading(false); })
      .catch(() => setLoading(false));

    fetchUsers('student');
  }, [fetchUsers]);

  useEffect(() => {
    if (!currentUser) {
      router.replace('/login');
      return;
    }
    if (currentUser.role === 'student') router.replace('/');
  }, [currentUser, router]);

  if (!currentUser || currentUser.role === 'student') return null;

  const adminUser = currentUser;
  const classes = [...new Set(data.map(d => d.studentClass))].sort();
  const filtered = filterClass ? data.filter(d => d.studentClass === filterClass) : data;
  const avgParticles = filtered.length ? Math.round(filtered.reduce((s, d) => s + d.totalParticles, 0) / filtered.length) : 0;
  
  const organCounts: Record<string, number> = {};
  filtered.forEach(d => {
    if (d.mostDangerousOrgan) {
      const label = parseOrganLabel(d.mostDangerousOrgan);
      organCounts[label] = (organCounts[label] || 0) + 1;
    }
  });
  const topOrgan = Object.entries(organCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
  const registeredStudents = users.filter((user): user is AppUser => user.role === 'student');

  function refreshSubmissions() {
    setLoading(true);
    fetch('/api/lkpd').then(r => r.json()).then(d => { setData(d.data || []); setLoading(false); }).catch(() => setLoading(false));
    fetchUsers('student');
  }

  async function handleRegisterStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!studentForm.name.trim() || !studentForm.email.trim() || !studentForm.password || !studentForm.className.trim()) {
      setStudentMessage('Semua kolom wajib diisi.');
      return;
    }
    const res = await registerStudent({ ...studentForm, createdBy: adminUser.email });
    if (res.success && res.user) {
      setStudentMessage(`Berhasil mendaftarkan ${res.user.name} ke database.`);
      setStudentForm({ name: '', email: '', password: '', className: '' });
    } else {
      setStudentMessage(res.error || 'Gagal mendaftarkan siswa.');
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#111827] flex font-[family-name:var(--font-inter)] selection:bg-[#006591]/20">
      
      {/* MINIMALIST SIDEBAR WITH SUBTLE BLUE */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col z-20 shrink-0">
        <div className="p-6 pb-4">
          <div className="flex items-center justify-between mb-8">
            <h1 className="font-[family-name:var(--font-outfit)] font-semibold text-lg tracking-tight text-[#006591]">
              MicroJourney
            </h1>
            <Link href="/" className="text-slate-400 hover:text-[#006591] transition-colors">
              <span className="material-symbols-outlined text-[20px]">arrow_outward</span>
            </Link>
          </div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Menu Utama</p>
        </div>

        <nav className="flex-1 px-3 flex flex-col gap-1">
          <button 
            onClick={() => { setActiveTab('rekap'); setSelected(null); }} 
            className={`flex items-center gap-3 px-3 py-2.5 transition-colors text-sm ${activeTab === 'rekap' ? 'bg-[#006591]/5 text-[#006591] font-medium border-l-[3px] border-[#006591] rounded-r-lg' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 border-l-[3px] border-transparent rounded-lg'}`}
          >
            <span className="material-symbols-outlined text-[18px]">table_rows</span>
            Data Penilaian
          </button>
          
          <button 
            onClick={() => { setActiveTab('manajemen'); setSelected(null); }} 
            className={`flex items-center gap-3 px-3 py-2.5 transition-colors text-sm ${activeTab === 'manajemen' ? 'bg-[#006591]/5 text-[#006591] font-medium border-l-[3px] border-[#006591] rounded-r-lg' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 border-l-[3px] border-transparent rounded-lg'}`}
          >
            <span className="material-symbols-outlined text-[18px]">people</span>
            Kelola Siswa
          </button>

          {adminUser.role === 'superadmin' && (
            <Link href="/superadmin"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-900 mt-2 ml-1">
              <span className="material-symbols-outlined text-[18px]">shield</span>
              Akses Admin
            </Link>
          )}
        </nav>

        <div className="p-4 m-3 bg-[#006591]/[0.03] rounded-xl border border-[#006591]/10 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white border border-[#006591]/20 flex items-center justify-center text-[#006591]">
              <span className="material-symbols-outlined text-[16px]">person</span>
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-medium text-slate-800 truncate">{adminUser.name}</p>
              <p className="text-[10px] text-[#006591] font-medium uppercase tracking-wider">{adminUser.role}</p>
            </div>
          </div>
          <button onClick={() => { logout(); router.push('/'); }} 
            className="w-full py-2 bg-white border border-slate-200 hover:border-red-200 hover:bg-red-50 hover:text-red-600 rounded-lg text-xs font-medium text-slate-600 transition-colors flex items-center justify-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">logout</span> Keluar
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 h-screen overflow-y-auto relative flex flex-col">
        
        {/* Simple Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-5 flex justify-between items-center sticky top-0 z-10">
          <h2 className="font-[family-name:var(--font-outfit)] font-medium text-xl text-slate-800">
             {activeTab === 'rekap' ? 'Data Penilaian Siswa' : 'Manajemen Akun Siswa'}
          </h2>
          {activeTab === 'rekap' && (
            <button onClick={refreshSubmissions} className="text-sm text-[#006591] hover:text-[#004c6e] font-medium flex items-center gap-1.5 transition-colors bg-[#006591]/5 hover:bg-[#006591]/10 px-3 py-1.5 rounded-md">
              <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>sync</span> 
              Segarkan
            </button>
          )}
        </header>

        <div className="p-8 max-w-[1200px] w-full mx-auto flex-1 flex flex-col">
          
          {/* TAB: REKAP PENILAIAN */}
          {activeTab === 'rekap' && (
            <div className="flex-1 flex flex-col animate-in fade-in duration-300">
              
              {/* Minimal Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-xl p-5 border border-[#006591]/10 shadow-[0_2px_8px_rgba(0,101,145,0.04)] flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-400"></div>
                  <p className="text-sm text-slate-500 mb-2 pl-2">Total Submit</p>
                  <p className="text-3xl font-[family-name:var(--font-outfit)] font-medium text-slate-800 pl-2">{filtered.length}</p>
                </div>
                <div className="bg-white rounded-xl p-5 border border-[#006591]/10 shadow-[0_2px_8px_rgba(0,101,145,0.04)] flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-red-400"></div>
                  <p className="text-sm text-slate-500 mb-2 pl-2">Rata-rata Partikel</p>
                  <p className="text-3xl font-[family-name:var(--font-outfit)] font-medium text-slate-800 pl-2">{avgParticles.toLocaleString('id-ID')}</p>
                </div>
                <div className="bg-white rounded-xl p-5 border border-[#006591]/10 shadow-[0_2px_8px_rgba(0,101,145,0.04)] flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-orange-400"></div>
                  <p className="text-sm text-slate-500 mb-2 pl-2">Organ Kritis</p>
                  <p className="text-xl font-[family-name:var(--font-outfit)] font-medium text-slate-800 truncate pl-2">{topOrgan}</p>
                  <p className="text-xs text-slate-400 mt-1 pl-2">{topOrgan !== '-' ? `${organCounts[topOrgan]} siswa` : '-'}</p>
                </div>
                <div className="bg-white rounded-xl p-5 border border-[#006591]/10 shadow-[0_2px_8px_rgba(0,101,145,0.04)] flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
                  <p className="text-sm text-slate-500 mb-2 pl-2">Siswa Terdaftar</p>
                  <p className="text-3xl font-[family-name:var(--font-outfit)] font-medium text-slate-800 pl-2">{registeredStudents.length}</p>
                </div>
              </div>

              {/* Class Filter */}
              <div className="flex items-center gap-2 mb-6">
                <span className="text-sm text-slate-500 mr-2">Filter Kelas:</span>
                <button onClick={() => setFilterClass('')}
                  className={`px-4 py-1.5 rounded-full text-sm transition-colors border ${!filterClass ? 'bg-[#006591] text-white border-[#006591]' : 'bg-white border-slate-200 text-slate-600 hover:border-[#006591]/50 hover:text-[#006591]'}`}>
                  Semua
                </button>
                {classes.map(c => (
                  <button key={c} onClick={() => setFilterClass(c)}
                    className={`px-4 py-1.5 rounded-full text-sm transition-colors border ${filterClass === c ? 'bg-[#006591] text-white border-[#006591]' : 'bg-white border-slate-200 text-slate-600 hover:border-[#006591]/50 hover:text-[#006591]'}`}>
                    {c}
                  </button>
                ))}
              </div>

              {/* Layout for Table and Detail Panel */}
              <div className="flex gap-6 relative flex-1 min-h-[500px] overflow-hidden">
                
                {/* Main Table */}
                <div className={`flex-1 transition-all duration-500 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden ${selected ? 'mr-[400px]' : ''}`}>
                  {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2">
                       <span className="material-symbols-outlined animate-spin text-2xl text-[#006591]">sync</span>
                       Loading data...
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                      Belum ada data penilaian tersedia.
                    </div>
                  ) : (
                    <div className="overflow-x-auto flex-1">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-[#FAFAFA] border-b border-slate-200 text-slate-500">
                          <tr>
                            <th className="px-6 py-4 font-medium">Nama Siswa</th>
                            <th className="px-6 py-4 font-medium">Kelas</th>
                            <th className="px-6 py-4 font-medium">Partikel</th>
                            <th className="px-6 py-4 font-medium">Waktu Submit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filtered.map(row => (
                            <tr key={row._id}
                              className={`cursor-pointer transition-colors ${selected?._id === row._id ? 'bg-[#006591]/5' : 'hover:bg-slate-50/70'}`}
                              onClick={() => setSelected(row)}>
                              <td className="px-6 py-4 font-medium text-slate-800">{row.studentName}</td>
                              <td className="px-6 py-4">
                                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md border border-slate-200/60">{row.studentClass}</span>
                              </td>
                              <td className="px-6 py-4 text-slate-600">{row.totalParticles.toLocaleString('id-ID')}</td>
                              <td className="px-6 py-4 text-slate-400 text-xs">
                                {new Date(row.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Minimal Sliding Panel with Subtle Blue */}
                <div className={`
                  absolute right-0 top-0 bottom-0 w-[380px] 
                  bg-white border border-[#006591]/20 rounded-xl shadow-xl 
                  flex flex-col transform transition-transform duration-500 ease-in-out z-10
                  ${selected ? 'translate-x-0' : 'translate-x-[110%]'}
                `}>
                  {selected && (
                    <>
                      <div className="p-6 border-b border-[#006591]/10 flex justify-between items-start bg-[#006591]/[0.02] rounded-t-xl">
                        <div>
                          <h3 className="font-medium text-lg text-[#006591]">{selected.studentName}</h3>
                          <p className="text-sm text-slate-500 mt-1">{selected.studentClass}</p>
                        </div>
                        <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-800 transition-colors">
                          <span className="material-symbols-outlined">close</span>
                        </button>
                      </div>

                      <div className="p-6 overflow-y-auto flex-1 space-y-6">
                        <div className="flex gap-4">
                          <div className="flex-1 bg-red-50/50 border border-red-100 rounded-lg p-3">
                            <p className="text-[10px] uppercase tracking-wider text-red-400 mb-1">Total Partikel</p>
                            <p className="text-lg font-medium text-red-600">{selected.totalParticles.toLocaleString('id-ID')}</p>
                          </div>
                          <div className="flex-1 bg-orange-50/50 border border-orange-100 rounded-lg p-3">
                            <p className="text-[10px] uppercase tracking-wider text-orange-400 mb-1">Organ Kritis</p>
                            <p className="text-base font-medium text-orange-600 truncate" title={parseOrganLabel(selected.mostDangerousOrgan)}>
                              {parseOrganLabel(selected.mostDangerousOrgan)}
                            </p>
                          </div>
                        </div>

                        <div className="bg-[#006591]/5 border border-[#006591]/10 rounded-lg p-3 flex justify-between items-center">
                          <p className="text-xs font-medium text-[#006591]">Kuis Pilihan Ganda</p>
                          <div className="flex gap-3 text-xs">
                            <span className="text-green-600 font-bold flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">check_circle</span> {selected.quizCorrect || 0} Benar</span>
                            <span className="text-red-500 font-bold flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">cancel</span> {selected.quizWrong || 0} Salah</span>
                          </div>
                        </div>
                        
                        <hr className="border-slate-100" />

                        <div className="space-y-4">
                          {[
                            { l: 'Investigasi Tahap 1', t: selected.lkpd1 },
                            { l: 'Analisis Pelapukan', t: selected.lkpd2 },
                            { l: 'Dampak Rantai Makanan', t: selected.lkpd3q1 },
                            { l: 'Refleksi Konsumsi', t: selected.lkpd3q2 },
                            { l: 'Analisis Anatomi', t: selected.lkpd4 },
                            { l: 'Sumpah Komitmen', t: selected.commitment },
                          ].map((item, i) => (
                            <div key={i}>
                              <p className="text-[11px] font-medium text-[#006591]/70 mb-1.5 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#006591]/40"></span>
                                {item.l}
                              </p>
                              <p className="text-sm text-slate-700 leading-relaxed bg-[#FAFAFA] border border-slate-100 rounded-lg p-3">
                                {item.t || <span className="text-slate-400 italic">Belum diisi</span>}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* TAB: MANAJEMEN SISWA */}
          {activeTab === 'manajemen' && (
            <div className="animate-in fade-in duration-300 grid grid-cols-1 md:grid-cols-[350px_1fr] gap-8">
              
              {/* Minimal Forms */}
              <div className="space-y-6">
                <div className="bg-white border border-[#006591]/10 rounded-xl p-6 shadow-sm">
                  <h3 className="font-medium text-lg text-[#006591] mb-1">Pendaftaran Manual</h3>
                  <p className="text-xs text-slate-500 mb-5">Tambahkan siswa satu per satu.</p>
                  
                  <form onSubmit={handleRegisterStudent} className="space-y-4">
                    <input value={studentForm.name} onChange={e => setStudentForm(s => ({ ...s, name: e.target.value }))}
                      className="w-full bg-[#FAFAFA] border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#006591] focus:ring-1 focus:ring-[#006591] transition-colors" placeholder="Nama Lengkap" />
                    <input value={studentForm.className} onChange={e => setStudentForm(s => ({ ...s, className: e.target.value }))}
                      className="w-full bg-[#FAFAFA] border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#006591] focus:ring-1 focus:ring-[#006591] transition-colors" placeholder="Kelas (Cth: VIII-A)" />
                    <input value={studentForm.email} onChange={e => setStudentForm(s => ({ ...s, email: e.target.value }))} type="email"
                      className="w-full bg-[#FAFAFA] border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#006591] focus:ring-1 focus:ring-[#006591] transition-colors" placeholder="Email (opsional: dummy@mail.com)" />
                    <input value={studentForm.password} onChange={e => setStudentForm(s => ({ ...s, password: e.target.value }))} type="text"
                      className="w-full bg-[#FAFAFA] border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#006591] focus:ring-1 focus:ring-[#006591] transition-colors" placeholder="Password Login" />

                    {studentMessage && <p className="text-xs text-[#006591] bg-[#006591]/10 p-2 rounded-md">{studentMessage}</p>}

                    <button type="submit" className="w-full bg-[#006591] hover:bg-[#004c6e] text-white font-medium py-2.5 rounded-lg text-sm transition-colors shadow-sm">
                      Simpan Akun
                    </button>
                  </form>
                </div>

                <div className="bg-[#006591]/[0.03] border border-[#006591]/20 rounded-xl p-6 shadow-sm">
                  <h3 className="font-medium text-lg text-[#006591] mb-2">Import Data Massal</h3>
                  <p className="text-slate-500 text-xs mb-4 leading-relaxed">Punya daftar nama banyak? Gunakan file CSV untuk mendaftarkan satu kelas sekaligus secara otomatis.</p>
                  <button onClick={() => setShowImport(true)}
                    className="w-full bg-white border border-[#006591]/30 hover:border-[#006591] hover:text-[#006591] text-slate-700 font-medium py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors">
                    <span className="material-symbols-outlined text-[18px]">upload_file</span>
                    Upload CSV
                  </button>
                </div>
              </div>

              {/* Minimal Table */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden h-full">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-medium text-slate-800">Daftar Akun Siswa</h3>
                  <span className="text-xs font-medium text-[#006591] bg-[#006591]/10 px-2.5 py-1 rounded-full">{registeredStudents.length} Akun</span>
                </div>
                
                {registeredStudents.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                    Belum ada siswa terdaftar.
                  </div>
                ) : (
                  <div className="overflow-x-auto flex-1">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-[#FAFAFA] border-b border-slate-200 text-slate-500">
                        <tr>
                          <th className="px-6 py-4 font-medium">Nama</th>
                          <th className="px-6 py-4 font-medium">Kelas</th>
                          <th className="px-6 py-4 font-medium">Email</th>
                          <th className="px-6 py-4 font-medium">Password</th>
                          <th className="px-6 py-4"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {registeredStudents.map(student => (
                          <tr key={student.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-6 py-4 font-medium text-slate-800">{student.name}</td>
                            <td className="px-6 py-4 text-slate-500">{student.className || '-'}</td>
                            <td className="px-6 py-4 text-[#006591]/80">{student.email}</td>
                            <td className="px-6 py-4 font-mono text-slate-400 text-xs">{student.password}</td>
                            <td className="px-6 py-4 text-right">
                              <button onClick={() => deleteStudent(student.id)} 
                                className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </main>

      {/* Import CSV Modal */}
      {showImport && (
        <ImportCsvModal
          onClose={() => setShowImport(false)}
          createdBy={adminUser.email}
        />
      )}
    </div>
  );
}

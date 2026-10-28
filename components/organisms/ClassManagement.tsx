// ORGANISM: ClassManagement
// Organism kelola kelas guru: Buat Kelas Baru, Daftar Kelas Realtime, dan Pendaftaran Siswa per Kelas.
'use client';

import React, { useState } from 'react';
import ClassCard from '@/components/molecules/ClassCard';
import type { AppUser } from '@/lib/authStore';
import type { Submission } from '@/components/molecules/StudentDetailDrawer';

export interface ClassItem {
  id: string;
  name: string;
  academicYear: string;
}

interface ClassManagementProps {
  classList: ClassItem[];
  onCreateClass: (className: string, academicYear: string) => void;
  onDeleteClass: (classId: string) => void;
  students: AppUser[];
  submissions?: Submission[];
  onRegisterStudent: (data: { name: string; email: string; password: string; className: string }) => void;
  onDeleteStudent: (studentId: string) => void;
  onOpenImportModal: () => void;
  selectedClassName: string;
  onSelectClass: (className: string) => void;
  onViewRekap?: (className: string) => void;
  completedSubmissions: Record<string, number>;
}

export default function ClassManagement({
  classList,
  onCreateClass,
  onDeleteClass,
  students,
  submissions = [],
  onRegisterStudent,
  onDeleteStudent,
  onOpenImportModal,
  selectedClassName,
  onSelectClass,
  onViewRekap,
  completedSubmissions,
}: ClassManagementProps) {
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newAcademicYear, setNewAcademicYear] = useState('2026/2027');

  // Student form state
  const [studentForm, setStudentForm] = useState({
    name: '',
    email: '',
    password: '',
    className: selectedClassName || (classList[0]?.name ?? 'VIII-7 (SMPN 3 Banda Aceh)'),
  });
  const [studentMessage, setStudentMessage] = useState('');

  function handleCreateClassSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newClassName.trim()) return;
    onCreateClass(newClassName.trim(), newAcademicYear.trim());
    setNewClassName('');
    setShowAddClassModal(false);
  }

  function handleStudentFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    const targetClass = studentForm.className || selectedClassName || classList[0]?.name || 'VIII-A';
    if (!studentForm.name.trim() || !studentForm.email.trim() || !studentForm.password || !targetClass) {
      setStudentMessage('Semua kolom wajib diisi.');
      return;
    }
    onRegisterStudent({ ...studentForm, className: targetClass });
    setStudentMessage(`Berhasil mendaftarkan ${studentForm.name} ke Kelas ${targetClass}.`);
    setStudentForm({ name: '', email: '', password: '', className: targetClass });
  }

  const filteredStudents = selectedClassName
    ? students.filter(s => (s.className || '').trim().toLowerCase() === selectedClassName.trim().toLowerCase())
    : students;

  // Total completed across all students
  const totalCompletedCount = submissions.length;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h3
              className="text-xl font-extrabold text-[#083b54]"
              style={{ fontFamily: 'var(--font-outfit)' }}
            >
              Manajemen Kelompok Kelas & Siswa Realtime
            </h3>
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
              LIVE MONGODB
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Kelola kelompok rombel, kredensial akun siswa, dan pantau penyelesaian LKPD secara terpusat.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedClassName && (
            <button
              onClick={() => onSelectClass('')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">clear_all</span>
              Tampilkan Semua ({students.length})
            </button>
          )}
          <button
            onClick={() => setShowAddClassModal(true)}
            className="bg-[#006591] hover:bg-[#004c6e] text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all shadow-sm shrink-0 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add_box</span>
            + Buat Rombel Baru
          </button>
        </div>
      </div>

      {/* Grid Daftar Kelas Realtime */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-sm text-slate-700 uppercase tracking-wider">
              Kelompok Kelas Aktif ({classList.length})
            </h4>
            <span className="text-[11px] text-slate-400 font-medium">
              (Total {students.length} Siswa Terdaftar • {totalCompletedCount} Selesai)
            </span>
          </div>
          <span className="text-xs font-semibold text-[#006591] hidden sm:inline">
            Klik card untuk memfilter daftar siswa di bawah
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {classList.map((c) => {
            const classStudents = students.filter(s => (s.className || '').trim().toLowerCase() === c.name.trim().toLowerCase());
            const completedCount = completedSubmissions[c.name] ?? completedSubmissions[c.name.trim()] ?? completedSubmissions[c.name.toLowerCase()] ?? 0;
            const actualStudentCount = Math.max(classStudents.length, completedCount);
            const isSelected = selectedClassName.trim().toLowerCase() === c.name.trim().toLowerCase();

            return (
              <ClassCard
                key={c.id}
                name={c.name}
                academicYear={c.academicYear}
                studentCount={actualStudentCount}
                completedCount={completedCount}
                isSelected={isSelected}
                onSelect={() => {
                  onSelectClass(isSelected ? '' : c.name);
                }}
                onDelete={() => onDeleteClass(c.id)}
              />
            );
          })}
        </div>
      </div>

      {/* Pendaftaran & Tabel Siswa per Kelas */}
      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        
        {/* Form Tambah Siswa */}
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <h4 className="font-bold text-base text-[#083b54] mb-1">
              Tambah Siswa Baru
            </h4>
            <p className="text-xs text-slate-500 mb-4">
              Daftarkan kredensial siswa langsung ke database.
            </p>

            <form onSubmit={handleStudentFormSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-600 block mb-1">Pilih Kelas Rombel *</label>
                <select
                  value={studentForm.className || selectedClassName || classList[0]?.name || ''}
                  onChange={e => setStudentForm(s => ({ ...s, className: e.target.value }))}
                  className="w-full bg-[#FAFAFA] border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none focus:border-[#006591] font-semibold"
                >
                  {classList.map(c => (
                    <option key={c.id} value={c.name}>Kelas {c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Nama Lengkap Siswa *</label>
                <input
                  type="text"
                  required
                  value={studentForm.name}
                  onChange={e => setStudentForm(s => ({ ...s, name: e.target.value }))}
                  placeholder="misal: Rahmat Hidayat"
                  className="w-full bg-[#FAFAFA] border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none focus:border-[#006591]"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Alamat Email Login *</label>
                <input
                  type="email"
                  required
                  value={studentForm.email}
                  onChange={e => setStudentForm(s => ({ ...s, email: e.target.value }))}
                  placeholder="siswa@smp.belajar.id"
                  className="w-full bg-[#FAFAFA] border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none focus:border-[#006591]"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Password Login *</label>
                <input
                  type="text"
                  required
                  value={studentForm.password}
                  onChange={e => setStudentForm(s => ({ ...s, password: e.target.value }))}
                  placeholder="Password akun siswa"
                  className="w-full bg-[#FAFAFA] border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none focus:border-[#006591]"
                />
              </div>

              {studentMessage && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-2.5 rounded-xl font-medium text-xs flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  {studentMessage}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-[#006591] hover:bg-[#004c6e] text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-2xs cursor-pointer"
              >
                + Simpan Akun Siswa
              </button>
            </form>
          </div>

          <div className="bg-[#006591]/5 border border-[#006591]/20 rounded-2xl p-5 shadow-xs">
            <h4 className="font-bold text-base text-[#006591] mb-1">Import Massal via CSV</h4>
            <p className="text-slate-600 text-xs mb-4 leading-relaxed">
              Upload berkas Excel/CSV untuk mendaftarkan banyak siswa sekaligus secara otomatis.
            </p>
            <button
              onClick={onOpenImportModal}
              className="w-full bg-white border border-[#006591]/30 hover:border-[#006591] text-[#006591] font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors shadow-2xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">upload_file</span>
              Upload File CSV Siswa
            </button>
          </div>
        </div>

        {/* Tabel Siswa Terdaftar */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-[#FAFAFA]">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-base text-[#083b54]">
                  {selectedClassName ? `Daftar Siswa Kelas ${selectedClassName}` : 'Semua Akun Siswa Terdaftar'}
                </h4>
                {selectedClassName && (
                  <button
                    onClick={() => onSelectClass('')}
                    className="text-[11px] text-[#006591] hover:underline font-semibold"
                  >
                    (Reset Filter)
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Total {filteredStudents.length} siswa terhubung ke database</p>
            </div>
            
            <div className="flex items-center gap-2">
              {selectedClassName && onViewRekap && (
                <button
                  onClick={() => onViewRekap(selectedClassName)}
                  className="text-xs font-bold text-white bg-[#006e2f] hover:bg-[#005524] px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-2xs cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">analytics</span>
                  Buka Rekap Penilaian
                </button>
              )}
              <span className="text-xs font-bold text-[#006e2f] bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                {filteredStudents.length} Siswa Aktif
              </span>
            </div>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-xs p-12 text-center">
              <span className="material-symbols-outlined text-4xl mb-2 text-slate-300">group_off</span>
              <p className="font-bold text-slate-600">Belum ada siswa di kelas ini</p>
              <p className="text-slate-400 mt-1">Gunakan formulir di samping atau upload file CSV untuk mendaftarkan siswa.</p>
            </div>
          ) : (
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-xs text-left whitespace-nowrap min-w-[650px]">
                <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Nama Siswa</th>
                    <th className="px-5 py-3.5">Kelas</th>
                    <th className="px-5 py-3.5">Status E-LKPD</th>
                    <th className="px-5 py-3.5">Pretest & Posttest</th>
                    <th className="px-5 py-3.5">Kredensial Login</th>
                    <th className="px-5 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((student) => {
                    // Match with real submissions in MongoDB
                    const studentSub = submissions.find(sub =>
                      (sub.studentAccountEmail && student.email && sub.studentAccountEmail.toLowerCase() === student.email.toLowerCase()) ||
                      (sub.studentName && student.name && sub.studentName.trim().toLowerCase() === student.name.trim().toLowerCase())
                    );

                    return (
                      <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-[#006591]/10 text-[#006591] font-extrabold text-[11px] flex items-center justify-center shrink-0">
                              {student.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-bold text-slate-800">{student.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-slate-600">
                          <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                            {student.className || '-'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          {studentSub ? (
                            <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[11px]">
                              <span className="material-symbols-outlined text-[14px]">check_circle</span>
                              Tuntas ({studentSub.totalParticles?.toLocaleString('id-ID') || 0} Partikel)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-400 bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-full text-[11px]">
                              <span className="material-symbols-outlined text-[14px]">schedule</span>
                              Belum Submit LKPD
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          {studentSub && (studentSub.preTestScore !== null || studentSub.postTestScore !== null) ? (
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <span className="bg-slate-100 text-slate-700 font-bold px-1.5 py-0.5 rounded border border-slate-200">
                                Pre: {studentSub.preTestScore ?? '-'}
                              </span>
                              <span className="text-slate-300">→</span>
                              <span className="bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded border border-emerald-200">
                                Post: {studentSub.postTestScore ?? '-'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">-</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex flex-col text-[11px]">
                            <span className="text-[#006591] font-medium">{student.email}</span>
                            <span className="font-mono text-slate-400 text-[10px]">pass: {student.password || '-'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => onDeleteStudent(student.id)}
                            title="Hapus Akun Siswa"
                            className="text-slate-400 hover:text-red-600 transition-colors p-1 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Buat Kelas Baru */}
      {showAddClassModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-200">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-lg text-[#083b54]">Buat Kelompok Kelas Baru</h3>
              <button
                onClick={() => setShowAddClassModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateClassSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-600 block mb-1">Nama Rombel / Kelas *</label>
                <input
                  type="text"
                  required
                  value={newClassName}
                  onChange={e => setNewClassName(e.target.value)}
                  placeholder="misal: VIII-7 (SMPN 3 Banda Aceh)"
                  className="w-full bg-[#FAFAFA] border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 outline-none focus:border-[#006591] font-semibold text-sm"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Tahun Ajaran *</label>
                <input
                  type="text"
                  required
                  value={newAcademicYear}
                  onChange={e => setNewAcademicYear(e.target.value)}
                  placeholder="misal: 2026/2027"
                  className="w-full bg-[#FAFAFA] border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 outline-none focus:border-[#006591]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddClassModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#006591] hover:bg-[#004c6e] text-white font-bold shadow-xs cursor-pointer"
                >
                  Simpan Rombel Kelas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

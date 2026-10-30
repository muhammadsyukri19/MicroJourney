'use client';

import { useState, useEffect } from 'react';
import { AppUser, useAuthStore } from '@/lib/authStore';
import type { SchoolItem } from '@/app/api/schools/route';

interface TeacherAccountManagementProps {
  onRefreshStats?: () => void;
}

interface TeacherFormData {
  name: string;
  email: string;
  password: string;
  school: string;
  phoneNumber?: string;
}

const EMPTY_FORM: TeacherFormData = {
  name: '',
  email: '',
  password: '',
  school: '',
  phoneNumber: '',
};

export default function TeacherAccountManagement({ onRefreshStats }: TeacherAccountManagementProps) {
  const { users, registerTeacher, updateTeacher, deleteTeacher, fetchUsers } = useAuthStore();
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedSchoolFilter, setSelectedSchoolFilter] = useState('all');

  // Modal State
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<AppUser | null>(null);
  const [formData, setFormData] = useState<TeacherFormData>(EMPTY_FORM);
  const [showPass, setShowPass] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<AppUser | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers('teacher');
    fetchSchools();
  }, [fetchUsers]);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }

  async function fetchSchools() {
    try {
      const res = await fetch('/api/schools');
      const data = await res.json();
      if (data.ok && Array.isArray(data.data)) {
        setSchools(data.data);
      }
    } catch {}
  }

  function handleOpenAdd() {
    setFormData({
      ...EMPTY_FORM,
      school: schools.length > 0 ? schools[0].name : '',
    });
    setSelectedTeacher(null);
    setShowPass(false);
    setModalMode('add');
  }

  function handleOpenEdit(teacher: AppUser) {
    setSelectedTeacher(teacher);
    setFormData({
      name: teacher.name,
      email: teacher.email,
      password: teacher.password || '',
      school: teacher.school || '',
      phoneNumber: teacher.phoneNumber || '',
    });
    setShowPass(false);
    setModalMode('edit');
  }

  function generateRandomPassword() {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let res = '';
    for (let i = 0; i < 8; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password: res }));
    setShowPass(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim()) {
      showToast('Semua kolom wajib diisi.');
      return;
    }
    if (formData.password.length < 6) {
      showToast('Kata sandi minimal 6 karakter.');
      return;
    }

    setSubmitting(true);
    try {
      if (modalMode === 'add') {
        const res = await registerTeacher(formData);
        if (res.success) {
          showToast('Akun guru baru berhasil didaftarkan.');
          setModalMode(null);
          fetchUsers('teacher');
          if (onRefreshStats) onRefreshStats();
        } else {
          showToast(res.message || 'Gagal mendaftarkan guru.');
        }
      } else if (modalMode === 'edit' && selectedTeacher) {
        const res = await updateTeacher(selectedTeacher.id, formData);
        if (res.success) {
          showToast('Data akun guru berhasil diperbarui.');
          setModalMode(null);
          fetchUsers('teacher');
          if (onRefreshStats) onRefreshStats();
        } else {
          showToast(res.message || 'Gagal memperbarui data.');
        }
      }
    } catch (err) {
      console.error(err);
      showToast('Terjadi kesalahan koneksi.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    try {
      await deleteTeacher(confirmDelete.id);
      showToast(`Akun guru ${confirmDelete.name} berhasil dihapus.`);
      setConfirmDelete(null);
      fetchUsers('teacher');
      if (onRefreshStats) onRefreshStats();
    } catch {
      showToast('Gagal menghapus akun.');
    }
  }

  const teacherUsers = users.filter(u => u.role === 'teacher');
  const studentUsers = users.filter(u => u.role === 'student');

  const filteredTeachers = teacherUsers.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase()) ||
      (t.school || '').toLowerCase().includes(search.toLowerCase());

    const matchSchool = selectedSchoolFilter === 'all' || (t.school || '').toLowerCase() === selectedSchoolFilter.toLowerCase();

    return matchSearch && matchSchool;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#083b54] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/20 animate-slide-in">
          <span className="material-symbols-outlined text-[#6bff8f]">verified</span>
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#006e2f] via-[#00512a] to-[#083b54] rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-[#6bff8f] text-xs font-bold mb-2">
              <span className="material-symbols-outlined text-[16px]">manage_accounts</span>
              <span>Manajemen Akun Edukator</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-extrabold font-[family-name:var(--font-outfit)]">
              Kelola Akun Guru Lintas Sekolah
            </h2>
            <p className="text-white/80 text-xs md:text-sm mt-1 max-w-xl">
              Daftarkan guru IPA baru, distribusikan akses kelas, reset kredensial akun guru, dan pantau pengisian nilai siswa.
            </p>
          </div>
          <button
            onClick={handleOpenAdd}
            className="self-start md:self-center px-5 py-3 bg-[#6bff8f] hover:bg-[#52e876] text-[#083b54] font-extrabold text-xs rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 active:scale-95 cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            <span>Tambah Akun Guru Baru</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-[#bec8d2] rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#006e2f] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">assignment_ind</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase">Total Guru Aktif</p>
            <p className="text-xl font-extrabold text-[#006e2f]">{teacherUsers.length}</p>
          </div>
        </div>
        <div className="bg-white border border-[#bec8d2] rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#006591]/10 text-[#006591] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">school</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase">Siswa Terhubung</p>
            <p className="text-xl font-extrabold text-[#006591]">{studentUsers.length}</p>
          </div>
        </div>
        <div className="bg-white border border-[#bec8d2] rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">domain</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase">Sekolah Terafiliasi</p>
            <p className="text-xl font-extrabold text-purple-700">
              {new Set(teacherUsers.map(t => t.school).filter(Boolean)).size || schools.length}
            </p>
          </div>
        </div>
        <div className="bg-white border border-[#bec8d2] rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#d27b22] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">vpn_key</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase">Autentikasi</p>
            <p className="text-xs font-bold text-slate-700">Multi-Role Terproteksi</p>
          </div>
        </div>
      </div>

      {/* Toolbar & Filter */}
      <div className="bg-white border border-[#bec8d2] rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama guru, email, atau sekolah..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#006e2f] focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={selectedSchoolFilter}
            onChange={e => setSelectedSchoolFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none focus:border-[#006e2f] max-w-[200px] truncate"
          >
            <option value="all">Semua Asal Sekolah</option>
            {schools.map(s => (
              <option key={s.id} value={s.name}>{s.name}</option>
            ))}
          </select>

          <button
            onClick={() => fetchUsers('teacher')}
            title="Refresh Guru"
            className="p-2 text-slate-500 hover:text-[#006e2f] hover:bg-slate-100 rounded-xl transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
          </button>
        </div>
      </div>

      {/* Teachers Table */}
      <div className="bg-white border border-[#bec8d2] rounded-2xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-[1.5fr_1.5fr_1fr_1fr_auto] gap-4 px-5 py-3.5 bg-slate-50 border-b border-[#bec8d2] text-xs font-[family-name:var(--font-mono)] text-slate-500 uppercase tracking-wider font-bold">
          <span>Identitas Guru</span>
          <span>Sekolah / Instansi</span>
          <span>Email Akun</span>
          <span>Kredensial</span>
          <span className="text-right">Tindakan</span>
        </div>

        {filteredTeachers.length === 0 ? (
          <div className="p-12 text-center">
            <span className="material-symbols-outlined text-5xl text-slate-300">group</span>
            <p className="text-sm font-bold text-slate-600 mt-2">Tidak ada akun guru yang ditemukan.</p>
            <p className="text-xs text-slate-400 mt-1">Gunakan tombol &quot;Tambah Akun Guru Baru&quot; untuk mendaftarkan akun baru.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTeachers.map(teacher => {
              const studentsManaged = studentUsers.filter(s => s.createdBy?.toLowerCase() === teacher.email.toLowerCase()).length;

              return (
                <div
                  key={teacher.id}
                  className="grid grid-cols-[1.5fr_1.5fr_1fr_1fr_auto] gap-4 items-center px-5 py-4 hover:bg-slate-50/80 transition-colors"
                >
                  {/* Name & ID */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#006e2f]/10 to-[#006e2f]/20 text-[#006e2f] flex items-center justify-center font-extrabold text-xs shrink-0 border border-[#006e2f]/20">
                      {teacher.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-extrabold text-sm text-[#083b54] truncate font-[family-name:var(--font-outfit)]">
                        {teacher.name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono truncate">
                        ID: {teacher.id}
                      </p>
                    </div>
                  </div>

                  {/* School & Phone */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[15px] text-[#006591] shrink-0">domain</span>
                      <p className="text-xs font-semibold text-slate-700 truncate">
                        {teacher.school || 'SMP Belum Ditentukan'}
                      </p>
                    </div>
                    {teacher.phoneNumber && (
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        WA: {teacher.phoneNumber}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="min-w-0">
                    <p className="text-xs text-slate-700 truncate font-mono">
                      {teacher.email}
                    </p>
                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full bg-emerald-50 text-[#006e2f] text-[10px] font-bold">
                      {studentsManaged} Siswa Aktif
                    </span>
                  </div>

                  {/* Password & Security */}
                  <div className="min-w-0 font-mono text-xs text-slate-500">
                    {'•'.repeat(Math.min((teacher.password || '••••••••').length, 8))}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEdit(teacher)}
                      title="Edit Guru"
                      className="p-2 text-[#006591] hover:bg-[#006591]/10 rounded-lg transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[17px]">edit</span>
                    </button>
                    <button
                      onClick={() => setConfirmDelete(teacher)}
                      title="Hapus Akun"
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[17px]">delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modal Add / Edit Guru ── */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setModalMode(null)} />
          <div className="relative bg-white border border-[#bec8d2] rounded-3xl p-6 md:p-7 w-full max-w-md shadow-2xl z-10">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#006e2f] text-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">
                    {modalMode === 'add' ? 'person_add' : 'edit'}
                  </span>
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-[#083b54] font-[family-name:var(--font-outfit)]">
                    {modalMode === 'add' ? 'Daftarkan Akun Guru Baru' : 'Edit Data Akun Guru'}
                  </h3>
                  <p className="text-xs text-slate-400">Kredensial pendidik MicroJourney</p>
                </div>
              </div>
              <button onClick={() => setModalMode(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap & Gelar *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="misal: Siti Rahma, S.Pd., M.Si."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#006e2f]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Sekolah Penugasan *</label>
                <select
                  value={formData.school}
                  onChange={e => setFormData({ ...formData, school: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#006e2f]"
                >
                  <option value="">Pilih Asal Sekolah</option>
                  {schools.map(s => (
                    <option key={s.id} value={s.name}>{s.name} ({s.city})</option>
                  ))}
                  <option value="SMP Lainnya / Dinas Pendidikan">SMP Lainnya / Dinas Pendidikan</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Alamat Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="guru@sekolah.sch.id"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:border-[#006e2f]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Kata Sandi (Password) *</label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-[11px] text-[#006e2f] hover:underline font-bold flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[13px]">autorenew</span>
                    <span>Acak Sandi</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Minimal 6 karakter"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:border-[#006e2f]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showPass ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">No. WhatsApp / HP</label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                  placeholder="misal: 081234567890"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:border-[#006e2f]"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-[#006e2f] hover:bg-[#00512a] text-white rounded-xl text-xs font-extrabold shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-1.5"
                >
                  {submitting && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
                  <span>{modalMode === 'add' ? 'Daftarkan Guru' : 'Perbarui Akun'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Delete Confirmation ── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-white border border-[#bec8d2] rounded-2xl p-6 w-full max-w-sm shadow-2xl z-10 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-2xl">person_remove</span>
            </div>
            <h3 className="font-extrabold text-base text-slate-800 font-[family-name:var(--font-outfit)]">
              Hapus Akun Guru?
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-5">
              Apakah Anda yakin ingin menghapus akun guru <strong>{confirmDelete.name}</strong> ({confirmDelete.email})?
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md"
              >
                Hapus Akun
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

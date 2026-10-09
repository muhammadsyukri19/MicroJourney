'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppUser, useAuthStore } from '@/lib/authStore';

type ModalMode = 'add' | 'edit' | null;

const EMPTY_FORM = { name: '', email: '', password: '' };

export default function SuperadminPage() {
  const router = useRouter();
  const { currentUser, users, registerTeacher, deleteTeacher, updateTeacher, fetchUsers } = useAuthStore();

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editTarget, setEditTarget] = useState<AppUser | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPass, setShowPass] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AppUser | null>(null);
  const [searchQ, setSearchQ] = useState('');

  // Guard: only superadmin
  useEffect(() => {
    if (currentUser === null) { router.push('/login'); return; }
    if (currentUser.role !== 'superadmin') { router.push('/dashboard'); return; }
    fetchUsers('teacher');
  }, [currentUser, router, fetchUsers]);

  const teachers = users.filter(u => u.role === 'teacher')
    .filter(u => u.name.toLowerCase().includes(searchQ.toLowerCase()) || u.email.toLowerCase().includes(searchQ.toLowerCase()));

  function openAdd() {
    setForm(EMPTY_FORM);
    setEditTarget(null);
    setShowPass(false);
    setFeedback(null);
    setModalMode('add');
  }

  function openEdit(teacher: AppUser) {
    setForm({ name: teacher.name, email: teacher.email, password: teacher.password || '' });
    setEditTarget(teacher);
    setShowPass(false);
    setFeedback(null);
    setModalMode('edit');
  }

  function closeModal() {
    setModalMode(null);
    setEditTarget(null);
    setFeedback(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setFeedback({ type: 'err', msg: 'Semua field wajib diisi.' });
      return;
    }
    if (form.password.length < 6) {
      setFeedback({ type: 'err', msg: 'Password minimal 6 karakter.' });
      return;
    }

    if (modalMode === 'add') {
      const result = await registerTeacher(form);
      if (!result.success) { setFeedback({ type: 'err', msg: result.message }); return; }
      setFeedback({ type: 'ok', msg: result.message });
      setTimeout(closeModal, 1200);
    } else if (modalMode === 'edit' && editTarget) {
      const result = await updateTeacher(editTarget.id, form);
      if (!result.success) { setFeedback({ type: 'err', msg: result.message }); return; }
      setFeedback({ type: 'ok', msg: result.message });
      setTimeout(closeModal, 1200);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    await deleteTeacher(confirmDelete.id);
    setConfirmDelete(null);
  }

  if (!currentUser || currentUser.role !== 'superadmin') return null;

  return (
    <div className="min-h-screen bg-[#f7f9fb] relative overflow-hidden">
      <div className="absolute inset-0 adventure-map opacity-20 pointer-events-none" />
      <div className="absolute top-0 right-0 w-80 h-80 bg-[#006591]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#bec8d2] shadow-[0_4px_12px_rgba(0,0,0,0.04)] h-16 flex items-center px-4 lg:px-6 gap-4">
        <Link href="/dashboard" className="text-[#006591] hover:text-[#004c6e] transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#006591] flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-base">admin_panel_settings</span>
          </div>
          <span className="font-[family-name:var(--font-outfit)] text-lg font-bold text-[#191c1e]">Super Admin</span>
        </div>
        <div className="ml-auto flex items-center gap-3 text-sm text-[#6e7881]">
          <span className="material-symbols-outlined text-base text-[#006591]">verified_user</span>
          {currentUser.name}
        </div>
      </header>

      <div className="relative z-10 w-full px-4 lg:px-6 py-8">

        {/* Page title */}
        <div className="mb-8">
          <h1 className="font-[family-name:var(--font-outfit)] text-3xl font-extrabold text-[#191c1e] mb-1">
            Manajemen Akun Guru
          </h1>
          <p className="text-[#6e7881] text-sm">Daftarkan, edit, atau hapus akun guru yang dapat mengakses dashboard penilaian.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-7">
          <div className="bg-white border border-[#bec8d2] rounded-2xl p-5 shadow-sm">
            <div className="font-[family-name:var(--font-mono)] text-3xl font-bold text-[#006591] mb-1">
              {users.filter(u => u.role === 'teacher').length}
            </div>
            <div className="text-[#6e7881] text-xs">Total Guru Terdaftar</div>
          </div>
          <div className="bg-white border border-[#bec8d2] rounded-2xl p-5 shadow-sm">
            <div className="font-[family-name:var(--font-mono)] text-3xl font-bold text-[#006e2f] mb-1">
              {users.filter(u => u.role === 'student').length}
            </div>
            <div className="text-[#6e7881] text-xs">Total Siswa Terdaftar</div>
          </div>
          <div className="bg-white border border-[#bec8d2] rounded-2xl p-5 shadow-sm col-span-2 sm:col-span-1">
            <div className="font-[family-name:var(--font-mono)] text-3xl font-bold text-[#785a00] mb-1">
              {users.filter(u => u.role === 'superadmin').length}
            </div>
            <div className="text-[#6e7881] text-xs">Super Admin</div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-grow">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#6e7881] text-lg">search</span>
            <input
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#bec8d2] rounded-xl focus:outline-none focus:border-[#006591] focus:ring-1 focus:ring-[#006591] text-sm text-[#191c1e] transition-colors"
              placeholder="Cari nama atau email guru..."
            />
          </div>
          <button onClick={openAdd}
            className="flex items-center gap-2 bg-[#006591] hover:bg-[#004c6e] text-white font-bold px-5 py-2.5 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-md shadow-[#006591]/20 text-sm whitespace-nowrap">
            <span className="material-symbols-outlined text-base">person_add</span>
            Tambah Akun Guru
          </button>
        </div>

        {/* Table */}
        <div className="bg-white border border-[#bec8d2] rounded-2xl shadow-sm overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 px-5 py-3 bg-[#f2f4f6] border-b border-[#bec8d2] text-xs font-[family-name:var(--font-mono)] text-[#6e7881] uppercase tracking-wider">
            <span>Nama Guru</span>
            <span>Email</span>
            <span>Password</span>
            <span>Aksi</span>
          </div>

          {teachers.length === 0 ? (
            <div className="text-center py-14">
              <span className="material-symbols-outlined text-5xl text-[#bec8d2] block mb-3">group</span>
              <p className="text-[#6e7881] text-sm">
                {searchQ ? 'Tidak ada guru yang cocok dengan pencarian.' : 'Belum ada akun guru. Klik "Tambah Akun Guru" untuk mendaftarkan.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#f2f4f6]">
              {teachers.map(teacher => (
                <div key={teacher.id}
                  className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 items-center px-5 py-4 hover:bg-[#f7f9fb] transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[#006591]/10 border border-[#006591]/20 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-[#006591] text-base">school</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[#191c1e] font-semibold text-sm truncate">{teacher.name}</p>
                      <p className="text-[#6e7881] text-xs font-[family-name:var(--font-mono)] truncate">{teacher.id}</p>
                    </div>
                  </div>
                  <p className="text-[#3e4850] text-sm truncate">{teacher.email}</p>
                  <p className="text-[#6e7881] text-sm font-[family-name:var(--font-mono)]">
                    {'•'.repeat(Math.min((teacher.password || '••••••••').length, 8))}
                  </p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(teacher)} title="Edit"
                      className="p-2 text-[#006591] hover:bg-[#c9e6ff]/40 rounded-lg transition-colors active:scale-95">
                      <span className="material-symbols-outlined text-base">edit</span>
                    </button>
                    <button onClick={() => setConfirmDelete(teacher)} title="Hapus"
                      className="p-2 text-[#ba1a1a] hover:bg-[#ffdad6] rounded-lg transition-colors active:scale-95">
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Demo credentials hint */}
        <div className="mt-5 bg-[#ffdf9a]/20 border border-[#c39400]/20 rounded-xl p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-[#785a00] mt-0.5 text-base">info</span>
          <p className="text-[#785a00] text-xs leading-relaxed">
            Akun guru yang dibuat di sini tersimpan di browser (Zustand persist). Guru dapat langsung login menggunakan email dan password yang kamu daftarkan.
          </p>
        </div>
      </div>

      {/* ── Add / Edit Modal ── */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-white border border-[#bec8d2] rounded-2xl p-7 w-full max-w-md shadow-xl z-10">

            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${modalMode === 'add' ? 'bg-[#006591]' : 'bg-[#c39400]'}`}>
                  <span className="material-symbols-outlined text-white text-lg">
                    {modalMode === 'add' ? 'person_add' : 'edit'}
                  </span>
                </div>
                <div>
                  <h2 className="font-[family-name:var(--font-outfit)] text-lg font-bold text-[#191c1e]">
                    {modalMode === 'add' ? 'Tambah Akun Guru' : 'Edit Akun Guru'}
                  </h2>
                  {editTarget && (
                    <p className="text-[#6e7881] text-xs font-[family-name:var(--font-mono)]">{editTarget.id}</p>
                  )}
                </div>
              </div>
              <button onClick={closeModal} className="p-1.5 text-[#6e7881] hover:bg-[#f2f4f6] rounded-lg transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[#6e7881] text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider block mb-1.5">
                  Nama Lengkap <span className="text-[#ba1a1a]">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-[#f7f9fb] border border-[#bec8d2] rounded-xl px-4 py-3 text-[#191c1e] focus:outline-none focus:border-[#006591] focus:ring-1 focus:ring-[#006591] transition-colors text-sm"
                  placeholder="Contoh: Ibu Sari Dewi, S.Pd."
                />
              </div>

              <div>
                <label className="text-[#6e7881] text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider block mb-1.5">
                  Email <span className="text-[#ba1a1a]">*</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full bg-[#f7f9fb] border border-[#bec8d2] rounded-xl px-4 py-3 text-[#191c1e] focus:outline-none focus:border-[#006591] focus:ring-1 focus:ring-[#006591] transition-colors text-sm"
                  placeholder="guru@sekolah.ac.id"
                />
              </div>

              <div>
                <label className="text-[#6e7881] text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider block mb-1.5">
                  Password <span className="text-[#ba1a1a]">*</span>
                  <span className="ml-2 text-[#bec8d2] normal-case">min. 6 karakter</span>
                </label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className="w-full bg-[#f7f9fb] border border-[#bec8d2] rounded-xl px-4 py-3 pr-11 text-[#191c1e] focus:outline-none focus:border-[#006591] focus:ring-1 focus:ring-[#006591] transition-colors text-sm"
                    placeholder="Buat password guru"
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6e7881] hover:text-[#191c1e] transition-colors">
                    <span className="material-symbols-outlined text-base">{showPass ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>

              {feedback && (
                <div className={`rounded-xl px-4 py-3 text-sm font-semibold border flex items-center gap-2 ${
                  feedback.type === 'ok'
                    ? 'bg-[#6bff8f]/20 border-[#006e2f]/30 text-[#006e2f]'
                    : 'bg-[#ffdad6] border-[#ba1a1a]/30 text-[#ba1a1a]'
                }`}>
                  <span className="material-symbols-outlined text-base">
                    {feedback.type === 'ok' ? 'check_circle' : 'error'}
                  </span>
                  {feedback.msg}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal}
                  className="flex-1 py-3 rounded-xl border-2 border-[#bec8d2] text-[#3e4850] font-bold text-sm hover:bg-[#f2f4f6] transition-colors active:scale-95">
                  Batal
                </button>
                <button type="submit"
                  className={`flex-1 py-3 rounded-xl text-white font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md flex items-center justify-center gap-2 ${
                    modalMode === 'add' ? 'bg-[#006591] hover:bg-[#004c6e] shadow-[#006591]/20' : 'bg-[#785a00] hover:bg-[#5c4400] shadow-[#785a00]/20'
                  }`}>
                  <span className="material-symbols-outlined text-base">
                    {modalMode === 'add' ? 'person_add' : 'save'}
                  </span>
                  {modalMode === 'add' ? 'Daftarkan Guru' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirm Delete Modal ── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-white border border-[#bec8d2] rounded-2xl p-7 w-full max-w-sm shadow-xl z-10 text-center">
            <div className="w-14 h-14 rounded-full bg-[#ffdad6] border-2 border-[#ba1a1a]/20 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-[#ba1a1a] text-2xl">delete</span>
            </div>
            <h2 className="font-[family-name:var(--font-outfit)] text-xl font-bold text-[#191c1e] mb-2">Hapus Akun Guru?</h2>
            <p className="text-[#3e4850] text-sm mb-1">
              Kamu akan menghapus akun:
            </p>
            <p className="font-bold text-[#191c1e] mb-1">{confirmDelete.name}</p>
            <p className="text-[#6e7881] text-xs font-[family-name:var(--font-mono)] mb-5">{confirmDelete.email}</p>
            <p className="text-[#ba1a1a] text-xs mb-6">Tindakan ini tidak dapat dibatalkan. Data siswa yang dibuat guru ini tetap tersimpan.</p>

            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-3 rounded-xl border-2 border-[#bec8d2] text-[#3e4850] font-bold text-sm hover:bg-[#f2f4f6] transition-colors active:scale-95">
                Batal
              </button>
              <button onClick={handleDelete}
                className="flex-1 py-3 rounded-xl bg-[#ba1a1a] hover:bg-[#93000a] text-white font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-[#ba1a1a]/20 flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-base">delete</span>
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

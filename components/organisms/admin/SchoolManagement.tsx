'use client';

import { useState, useEffect } from 'react';
import type { SchoolItem } from '@/app/api/schools/route';

interface SchoolManagementProps {
  onRefreshStats?: () => void;
}

const EMPTY_SCHOOL: Omit<SchoolItem, 'id'> = {
  npsn: '',
  name: '',
  jenjang: 'SMP',
  status: 'Negeri',
  akreditasi: 'A',
  city: 'Kota Banda Aceh',
  province: 'Aceh',
  address: '',
  principal: '',
  phone: '',
  isActive: true,
};

export default function SchoolManagement({ onRefreshStats }: SchoolManagementProps) {
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterJenjang, setFilterJenjang] = useState<string>('all');

  // Modal states
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [selectedSchool, setSelectedSchool] = useState<SchoolItem | null>(null);
  const [formData, setFormData] = useState<Omit<SchoolItem, 'id'>>(EMPTY_SCHOOL);
  const [confirmDelete, setConfirmDelete] = useState<SchoolItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSchools();
  }, []);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }

  async function fetchSchools() {
    setLoading(true);
    try {
      const res = await fetch('/api/schools');
      const data = await res.json();
      if (data.ok && Array.isArray(data.data)) {
        setSchools(data.data);
      }
    } catch (err) {
      console.warn('Failed to fetch schools, checking localStorage fallback:', err);
      const local = localStorage.getItem('mj_schools');
      if (local) {
        try {
          setSchools(JSON.parse(local));
        } catch {}
      }
    } finally {
      setLoading(false);
    }
  }

  function handleOpenAdd() {
    setFormData(EMPTY_SCHOOL);
    setSelectedSchool(null);
    setModalMode('add');
  }

  function handleOpenEdit(s: SchoolItem) {
    setSelectedSchool(s);
    setFormData({
      npsn: s.npsn,
      name: s.name,
      jenjang: s.jenjang,
      status: s.status,
      akreditasi: s.akreditasi,
      city: s.city,
      province: s.province,
      address: s.address,
      principal: s.principal,
      phone: s.phone,
      isActive: s.isActive,
    });
    setModalMode('edit');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name.trim() || !formData.npsn.trim()) {
      showToast('Nama sekolah dan NPSN wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = modalMode === 'edit' && selectedSchool
        ? { id: selectedSchool.id, ...formData }
        : { ...formData };

      const res = await fetch('/api/schools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.ok) {
        setSchools(data.data);
        localStorage.setItem('mj_schools', JSON.stringify(data.data));
        showToast(modalMode === 'edit' ? 'Data sekolah berhasil diperbarui.' : 'Sekolah baru berhasil didaftarkan.');
        setModalMode(null);
        if (onRefreshStats) onRefreshStats();
      } else {
        showToast(data.error || 'Gagal menyimpan data.');
      }
    } catch (err) {
      console.error(err);
      showToast('Terjadi kesalahan jaringan.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteSchool() {
    if (!confirmDelete) return;
    try {
      const res = await fetch(`/api/schools?id=${confirmDelete.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) {
        setSchools(data.data);
        localStorage.setItem('mj_schools', JSON.stringify(data.data));
        showToast(`Sekolah ${confirmDelete.name} berhasil dihapus.`);
        setConfirmDelete(null);
        if (onRefreshStats) onRefreshStats();
      } else {
        showToast(data.error || 'Gagal menghapus sekolah.');
      }
    } catch {
      showToast('Gagal terhubung ke server.');
    }
  }

  // Filtered Schools
  const filteredSchools = schools.filter(s => {
    const matchSearch = (s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.npsn.toLowerCase().includes(search.toLowerCase()) ||
      s.city.toLowerCase().includes(search.toLowerCase()) ||
      s.principal.toLowerCase().includes(search.toLowerCase()));

    const matchStatus = filterStatus === 'all' || s.status.toLowerCase() === filterStatus.toLowerCase();
    const matchJenjang = filterJenjang === 'all' || s.jenjang.toLowerCase() === filterJenjang.toLowerCase();

    return matchSearch && matchStatus && matchJenjang;
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

      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-[#006591] via-[#004c6e] to-[#083b54] rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-[#6bff8f] text-xs font-bold mb-2">
              <span className="material-symbols-outlined text-[16px]">domain</span>
              <span>Master Data Satuan Pendidikan</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-extrabold font-[family-name:var(--font-outfit)]">
              Manajemen Sekolah & Instansi Mitra
            </h2>
            <p className="text-white/80 text-xs md:text-sm mt-1 max-w-xl">
              Kelola entitas sekolah (SMP/MTs), data NPSN resmi, pimpinan instansi, dan izin penggunaan platform MicroJourney AR.
            </p>
          </div>
          <button
            onClick={handleOpenAdd}
            className="self-start md:self-center px-5 py-3 bg-[#6bff8f] hover:bg-[#52e876] text-[#083b54] font-extrabold text-xs rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 active:scale-95 cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">add_business</span>
            <span>Tambah Sekolah Baru</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-[#bec8d2] rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#006591]/10 text-[#006591] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">account_balance</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase">Total Sekolah</p>
            <p className="text-xl font-extrabold text-[#083b54]">{schools.length}</p>
          </div>
        </div>
        <div className="bg-white border border-[#bec8d2] rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#006e2f] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">verified</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase">Sekolah Negeri</p>
            <p className="text-xl font-extrabold text-[#006e2f]">{schools.filter(s => s.status === 'Negeri').length}</p>
          </div>
        </div>
        <div className="bg-white border border-[#bec8d2] rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#d27b22] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">military_tech</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase">Akreditasi A</p>
            <p className="text-xl font-extrabold text-[#d27b22]">{schools.filter(s => s.akreditasi === 'A').length}</p>
          </div>
        </div>
        <div className="bg-white border border-[#bec8d2] rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase">Status Aktif</p>
            <p className="text-xl font-extrabold text-purple-700">{schools.filter(s => s.isActive).length}</p>
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
            placeholder="Cari nama sekolah, NPSN, atau kota..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#006591] focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none focus:border-[#006591]"
          >
            <option value="all">Semua Status</option>
            <option value="Negeri">Negeri</option>
            <option value="Swasta">Swasta</option>
          </select>

          {/* Jenjang Filter */}
          <select
            value={filterJenjang}
            onChange={e => setFilterJenjang(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none focus:border-[#006591]"
          >
            <option value="all">Semua Jenjang</option>
            <option value="SMP">SMP</option>
            <option value="MTs">MTs</option>
            <option value="SMA/MA">SMA / MA</option>
          </select>

          <button
            onClick={fetchSchools}
            title="Refresh Data"
            className="p-2 text-slate-500 hover:text-[#006591] hover:bg-slate-100 rounded-xl transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
          </button>
        </div>
      </div>

      {/* Schools Cards Grid */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-[#bec8d2]">
          <span className="material-symbols-outlined text-4xl text-[#006591] animate-spin">progress_activity</span>
          <p className="text-xs text-slate-500 mt-2 font-medium">Memuat master data sekolah...</p>
        </div>
      ) : filteredSchools.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-[#bec8d2]">
          <span className="material-symbols-outlined text-5xl text-slate-300">account_balance</span>
          <p className="text-sm font-bold text-slate-600 mt-2">Tidak ada sekolah yang sesuai.</p>
          <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau filter yang dipilih.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSchools.map(school => (
            <div
              key={school.id}
              className="bg-white border border-[#bec8d2] hover:border-[#006591]/50 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
            >
              <div>
                {/* Header Card */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#006591]/10 to-[#004c6e]/20 text-[#006591] flex items-center justify-center font-extrabold text-sm border border-[#006591]/20 shrink-0">
                      <span className="material-symbols-outlined text-[22px]">domain</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-[#006591]/10 text-[#006591] font-bold text-[10px]">
                          {school.jenjang}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          school.status === 'Negeri' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                        }`}>
                          {school.status}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-bold text-[10px]">
                          Akreditasi {school.akreditasi}
                        </span>
                      </div>
                      <h3 className="font-extrabold text-base text-[#083b54] font-[family-name:var(--font-outfit)] mt-1">
                        {school.name}
                      </h3>
                    </div>
                  </div>

                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${school.isActive ? 'bg-[#006e2f]' : 'bg-slate-300'}`} title={school.isActive ? 'Sekolah Aktif' : 'Non-Aktif'} />
                </div>

                {/* Details Table */}
                <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50/70 p-3 rounded-xl border border-slate-100 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-mono text-[11px] w-20 shrink-0">NPSN:</span>
                    <span className="font-bold text-slate-800 font-mono">{school.npsn}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-[11px] w-20 shrink-0">Pimpinan:</span>
                    <span className="font-medium text-slate-800 truncate">{school.principal || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-[11px] w-20 shrink-0">Wilayah:</span>
                    <span className="text-slate-700 truncate">{school.city}, {school.province}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-slate-400 text-[11px] w-20 shrink-0">Alamat:</span>
                    <span className="text-slate-700 text-[11px] line-clamp-1">{school.address || '-'}</span>
                  </div>
                  {school.phone && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-[11px] w-20 shrink-0">Telepon:</span>
                      <span className="text-slate-700 font-mono text-[11px]">{school.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="text-[11px] text-slate-400 font-medium">
                  ID: <span className="font-mono">{school.id}</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEdit(school)}
                    className="p-1.5 text-[#006591] hover:bg-[#006591]/10 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => setConfirmDelete(school)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal Add / Edit Sekolah ── */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setModalMode(null)} />
          <div className="relative bg-white border border-[#bec8d2] rounded-3xl p-6 md:p-7 w-full max-w-lg shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#006591] text-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">
                    {modalMode === 'add' ? 'add_business' : 'edit'}
                  </span>
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-[#083b54] font-[family-name:var(--font-outfit)]">
                    {modalMode === 'add' ? 'Tambah Data Sekolah Baru' : 'Edit Data Sekolah'}
                  </h3>
                  <p className="text-xs text-slate-400">Master instansi mitra MicroJourney AR</p>
                </div>
              </div>
              <button
                onClick={() => setModalMode(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">NPSN Resmi *</label>
                  <input
                    type="text"
                    required
                    value={formData.npsn}
                    onChange={e => setFormData({ ...formData, npsn: e.target.value })}
                    placeholder="8 digit angka NPSN"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:border-[#006591]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Jenjang Pendidikan *</label>
                  <select
                    value={formData.jenjang}
                    onChange={e => setFormData({ ...formData, jenjang: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#006591]"
                  >
                    <option value="SMP">SMP</option>
                    <option value="MTs">MTs</option>
                    <option value="SMA/MA">SMA / MA</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap Sekolah *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="misal: SMP Negeri 1 Banda Aceh"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-[#006591]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status Kelembagaan</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#006591]"
                  >
                    <option value="Negeri">Negeri</option>
                    <option value="Swasta">Swasta</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Akreditasi BAN-S/M</label>
                  <select
                    value={formData.akreditasi}
                    onChange={e => setFormData({ ...formData, akreditasi: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#006591]"
                  >
                    <option value="A">Akreditasi A (Unggul)</option>
                    <option value="B">Akreditasi B (Baik)</option>
                    <option value="C">Akreditasi C (Cukup)</option>
                    <option value="Belum Terakreditasi">Belum Terakreditasi</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kota / Kabupaten *</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                    placeholder="misal: Kota Banda Aceh"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#006591]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Provinsi</label>
                  <input
                    type="text"
                    value={formData.province}
                    onChange={e => setFormData({ ...formData, province: e.target.value })}
                    placeholder="misal: Aceh"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#006591]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kepala Sekolah / Penanggung Jawab</label>
                <input
                  type="text"
                  value={formData.principal}
                  onChange={e => setFormData({ ...formData, principal: e.target.value })}
                  placeholder="Nama Lengkap & Gelar Kepala Sekolah"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#006591]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Alamat Lengkap</label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Alamat jalan, kelurahan, kecamatan"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#006591]"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-[#006591] hover:bg-[#004c6e] text-white rounded-xl text-xs font-extrabold shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer flex items-center gap-1.5"
                >
                  {submitting && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
                  <span>{modalMode === 'add' ? 'Simpan Sekolah' : 'Perbarui Data'}</span>
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
              <span className="material-symbols-outlined text-2xl">warning</span>
            </div>
            <h3 className="font-extrabold text-base text-slate-800 font-[family-name:var(--font-outfit)]">
              Hapus Satuan Pendidikan?
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-5">
              Apakah Anda yakin ingin menghapus data <strong>{confirmDelete.name}</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteSchool}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md"
              >
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

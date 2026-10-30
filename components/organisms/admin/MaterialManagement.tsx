'use client';

import { useState, useEffect } from 'react';
import type { CurriculumMaterial } from '@/app/api/materials/route';

interface MaterialManagementProps {
  onRefreshStats?: () => void;
}

const EMPTY_MATERIAL: Omit<CurriculumMaterial, 'id'> = {
  stageNumber: 1,
  title: '',
  subtitle: '',
  learningOutcome: '',
  scientificReference: '',
  summary: '',
  videoUrl: '',
  status: 'published',
  estimatedMinutes: 30,
};

export default function MaterialManagement({ onRefreshStats }: MaterialManagementProps) {
  const [materials, setMaterials] = useState<CurriculumMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Modal State
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<CurriculumMaterial | null>(null);
  const [formData, setFormData] = useState<Omit<CurriculumMaterial, 'id'>>(EMPTY_MATERIAL);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchMaterials();
  }, []);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }

  async function fetchMaterials() {
    setLoading(true);
    try {
      const res = await fetch('/api/materials');
      const data = await res.json();
      if (data.ok && Array.isArray(data.data)) {
        setMaterials(data.data);
      }
    } catch (err) {
      console.warn('Failed to fetch materials, checking fallback:', err);
      const local = localStorage.getItem('mj_materials');
      if (local) {
        try {
          setMaterials(JSON.parse(local));
        } catch {}
      }
    } finally {
      setLoading(false);
    }
  }

  function handleOpenAdd() {
    setFormData({
      ...EMPTY_MATERIAL,
      stageNumber: materials.length + 1,
    });
    setSelectedMaterial(null);
    setModalMode('add');
  }

  function handleOpenEdit(mat: CurriculumMaterial) {
    setSelectedMaterial(mat);
    setFormData({
      stageNumber: mat.stageNumber,
      title: mat.title,
      subtitle: mat.subtitle,
      learningOutcome: mat.learningOutcome,
      scientificReference: mat.scientificReference,
      summary: mat.summary,
      videoUrl: mat.videoUrl,
      status: mat.status,
      estimatedMinutes: mat.estimatedMinutes,
    });
    setModalMode('edit');
  }

  async function handleToggleStatus(mat: CurriculumMaterial) {
    const nextStatus: 'published' | 'draft' = mat.status === 'published' ? 'draft' : 'published';
    const updated = materials.map(m => m.id === mat.id ? { ...m, status: nextStatus } : m);
    setMaterials(updated);

    try {
      await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: mat.id, status: nextStatus }),
      });
      showToast(`Status modul "${mat.title}" diubah menjadi ${nextStatus}.`);
      if (onRefreshStats) onRefreshStats();
    } catch {
      showToast('Gagal mengubah status di server.');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.title.trim()) {
      showToast('Judul materi wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = modalMode === 'edit' && selectedMaterial
        ? { id: selectedMaterial.id, ...formData }
        : { ...formData };

      const res = await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.ok) {
        setMaterials(data.data);
        localStorage.setItem('mj_materials', JSON.stringify(data.data));
        showToast(modalMode === 'edit' ? 'Materi silabus berhasil diperbarui.' : 'Modul baru berhasil ditambahkan.');
        setModalMode(null);
        if (onRefreshStats) onRefreshStats();
      } else {
        showToast(data.error || 'Gagal menyimpan modul.');
      }
    } catch (err) {
      console.error(err);
      showToast('Terjadi kesalahan jaringan.');
    } finally {
      setSubmitting(false);
    }
  }

  const filteredMaterials = materials.filter(m => {
    const matchSearch = m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.subtitle.toLowerCase().includes(search.toLowerCase()) ||
      m.scientificReference.toLowerCase().includes(search.toLowerCase()) ||
      m.learningOutcome.toLowerCase().includes(search.toLowerCase());

    const matchStatus = filterStatus === 'all' || m.status === filterStatus;
    return matchSearch && matchStatus;
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
      <div className="bg-gradient-to-r from-[#7c3aed] via-[#5b21b6] to-[#083b54] rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-[#6bff8f] text-xs font-bold mb-2">
              <span className="material-symbols-outlined text-[16px]">menu_book</span>
              <span>Kurikulum Sains & Silabus IPA Fase D</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-extrabold font-[family-name:var(--font-outfit)]">
              Manajemen Materi Pembelajaran & Referensi Sains
            </h2>
            <p className="text-white/80 text-xs md:text-sm mt-1 max-w-xl">
              Kelola 6 modul inti MicroJourney AR, integrasi sumber ilmiah (Leslie et al. 2022, BRIN 2023), embed video praktikum, dan capaian pembelajaran siswa.
            </p>
          </div>
          <button
            onClick={handleOpenAdd}
            className="self-start md:self-center px-5 py-3 bg-[#6bff8f] hover:bg-[#52e876] text-[#083b54] font-extrabold text-xs rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 active:scale-95 cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>Tambah Topik / Modul Khusus</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-[#bec8d2] rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">auto_stories</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase">Total Modul</p>
            <p className="text-xl font-extrabold text-purple-800">{materials.length}</p>
          </div>
        </div>
        <div className="bg-white border border-[#bec8d2] rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#006e2f] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">publish</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase">Modul Published</p>
            <p className="text-xl font-extrabold text-[#006e2f]">{materials.filter(m => m.status === 'published').length}</p>
          </div>
        </div>
        <div className="bg-white border border-[#bec8d2] rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#006591]/10 text-[#006591] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">schedule</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase">Estimasi Jam Pelajaran</p>
            <p className="text-xl font-extrabold text-[#006591]">
              {Math.round(materials.reduce((acc, m) => acc + (m.estimatedMinutes || 30), 0) / 40)} JP
            </p>
          </div>
        </div>
        <div className="bg-white border border-[#bec8d2] rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#d27b22] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">science</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase">Validasi Sains</p>
            <p className="text-xs font-bold text-[#083b54]">BRIN & Leslie 2022</p>
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
            placeholder="Cari materi, capaian pembelajaran, atau jurnal..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-600 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none focus:border-purple-600"
          >
            <option value="all">Semua Status</option>
            <option value="published">Published (Tayang)</option>
            <option value="draft">Draft (Disembunyikan)</option>
          </select>

          <button
            onClick={fetchMaterials}
            title="Refresh Materi"
            className="p-2 text-slate-500 hover:text-purple-600 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
          </button>
        </div>
      </div>

      {/* Materials List Cards */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-[#bec8d2]">
          <span className="material-symbols-outlined text-4xl text-purple-600 animate-spin">progress_activity</span>
          <p className="text-xs text-slate-500 mt-2 font-medium">Memuat materi kurikulum...</p>
        </div>
      ) : filteredMaterials.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-[#bec8d2]">
          <span className="material-symbols-outlined text-5xl text-slate-300">menu_book</span>
          <p className="text-sm font-bold text-slate-600 mt-2">Tidak ada modul yang sesuai.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMaterials.map(mat => (
            <div
              key={mat.id}
              className="bg-white border border-[#bec8d2] hover:border-purple-300 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200"
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  {/* Stage Number Badge */}
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#7c3aed]/10 to-[#5b21b6]/20 text-[#5b21b6] flex flex-col items-center justify-center font-extrabold border border-[#7c3aed]/20 shrink-0">
                    <span className="text-[10px] font-mono uppercase tracking-tighter leading-none">Tahap</span>
                    <span className="text-lg leading-none font-[family-name:var(--font-outfit)] mt-0.5">{mat.stageNumber}</span>
                  </div>

                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        mat.status === 'published' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {mat.status === 'published' ? '● Published' : '○ Draft'}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#006591] text-[10px] font-bold border border-blue-100 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">timer</span>
                        {mat.estimatedMinutes} Menit
                      </span>
                      {mat.videoUrl && (
                        <span className="px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-bold border border-red-100 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">play_circle</span>
                          Video Praktikum
                        </span>
                      )}
                    </div>

                    <h3 className="text-base md:text-lg font-extrabold text-[#083b54] font-[family-name:var(--font-outfit)] leading-snug">
                      {mat.title}
                    </h3>
                    <p className="text-xs text-purple-700 font-semibold">{mat.subtitle}</p>

                    {/* Capaian Pembelajaran */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-1.5">
                      <p className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[#006591] text-[14px]">flag</span>
                        <span>Capaian Pembelajaran (CP / TP):</span>
                      </p>
                      <p className="text-slate-600 leading-relaxed pl-5">{mat.learningOutcome}</p>
                    </div>

                    {/* Scientific Reference */}
                    {mat.scientificReference && (
                      <div className="flex items-center gap-2 text-[11px] text-[#006e2f] bg-emerald-50/70 px-3 py-1.5 rounded-lg border border-emerald-100">
                        <span className="material-symbols-outlined text-[15px] shrink-0">menu_book</span>
                        <span className="truncate"><strong>Rujukan Ilmiah:</strong> {mat.scientificReference}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex lg:flex-col items-center justify-end gap-2 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                  <button
                    onClick={() => handleToggleStatus(mat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer w-full text-center ${
                      mat.status === 'published'
                        ? 'bg-amber-50 hover:bg-amber-100 text-amber-700'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-[#006e2f]'
                    }`}
                  >
                    {mat.status === 'published' ? 'Sembunyikan' : 'Publikasikan'}
                  </button>
                  <button
                    onClick={() => handleOpenEdit(mat)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-purple-50 text-slate-700 hover:text-purple-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer w-full"
                  >
                    <span className="material-symbols-outlined text-[15px]">edit</span>
                    <span>Edit Modul</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal Add / Edit Materi ── */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setModalMode(null)} />
          <div className="relative bg-white border border-[#bec8d2] rounded-3xl p-6 md:p-7 w-full max-w-lg shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-700 text-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">
                    {modalMode === 'add' ? 'add_circle' : 'edit'}
                  </span>
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-[#083b54] font-[family-name:var(--font-outfit)]">
                    {modalMode === 'add' ? 'Tambah Modul Kurikulum Baru' : 'Edit Materi Modul'}
                  </h3>
                  <p className="text-xs text-slate-400">Silabus pembelajaran IPA MicroJourney</p>
                </div>
              </div>
              <button onClick={() => setModalMode(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Tahap *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formData.stageNumber}
                    onChange={e => setFormData({ ...formData, stageNumber: parseInt(e.target.value) || 1 })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Durasi (Menit)</label>
                  <input
                    type="number"
                    min={5}
                    value={formData.estimatedMinutes}
                    onChange={e => setFormData({ ...formData, estimatedMinutes: parseInt(e.target.value) || 30 })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status Publikasi</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-purple-600"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Judul Materi Modul *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="misal: Simulasi Fotodegradasi UV & Abrasi Ombak"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Subjudul / Fase Pembelajaran</label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={e => setFormData({ ...formData, subtitle: e.target.value })}
                  placeholder="misal: Data Collection & Pelapukan Mikroplastik"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Capaian Pembelajaran (CP / TP) *</label>
                <textarea
                  rows={3}
                  required
                  value={formData.learningOutcome}
                  onChange={e => setFormData({ ...formData, learningOutcome: e.target.value })}
                  placeholder="Deskripsikan kompetensi sains yang diharapkan dicapai siswa..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Rujukan / Jurnal Ilmiah</label>
                <input
                  type="text"
                  value={formData.scientificReference}
                  onChange={e => setFormData({ ...formData, scientificReference: e.target.value })}
                  placeholder="misal: Leslie et al. (2022) Discovery of microplastics in human blood."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">URL Embed Video Pembelajaran (Opsional)</label>
                <input
                  type="url"
                  value={formData.videoUrl}
                  onChange={e => setFormData({ ...formData, videoUrl: e.target.value })}
                  placeholder="https://www.youtube.com/embed/..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:border-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ringkasan Materi Sains</label>
                <textarea
                  rows={2}
                  value={formData.summary}
                  onChange={e => setFormData({ ...formData, summary: e.target.value })}
                  placeholder="Ringkasan poin pembelajaran praktikum..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-purple-600"
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
                  className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-extrabold shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-1.5"
                >
                  {submitting && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
                  <span>{modalMode === 'add' ? 'Simpan Modul' : 'Perbarui Modul'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

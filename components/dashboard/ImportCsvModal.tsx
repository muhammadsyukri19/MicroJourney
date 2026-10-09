// ORGANISM: ImportCsvModal (v2)
// Upload daftar nama siswa saja → sistem auto-generate email & password.
// Alur: Upload → Default Kelas → Preview & Edit Kelas → Konfirmasi → Done + Export
'use client';
import { useRef, useState, useCallback } from 'react';
import { useAuthStore } from '@/lib/authStore';
import {
  parseCsvText,
  generateCsvTemplate,
  downloadCsv,
  exportCredentialsCsv,
  type CsvStudentRow,
} from '@/lib/utils/csv.utils';

interface ImportCsvModalProps {
  onClose:   () => void;
  createdBy: string;
}

type Step = 'upload' | 'preview' | 'done';

export default function ImportCsvModal({ onClose, createdBy }: ImportCsvModalProps) {
  const { registerStudentsBatch } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step,         setStep]         = useState<Step>('upload');
  const [dragging,     setDragging]     = useState(false);
  const [rows,         setRows]         = useState<CsvStudentRow[]>([]);
  const [headerError,  setHeaderError]  = useState('');
  const [defaultClass, setDefaultClass] = useState('');
  const [importing,    setImporting]    = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [failedRows,   setFailedRows]   = useState<string[]>([]);
  const [doneRows,     setDoneRows]     = useState<CsvStudentRow[]>([]);

  // ── Parse ───────────────────────────────────────────────────────────────────
  function handleFile(file: File) {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setHeaderError('File harus berformat .csv');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { rows: parsed, headerError: err } = parseCsvText(text, defaultClass);
      if (err) { setHeaderError(err); return; }
      setHeaderError('');
      setRows(parsed);
      setStep('preview');
    };
    reader.readAsText(file);
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, []); // eslint-disable-line

  // Update kelas per baris
  function updateRowClass(i: number, val: string) {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, className: val, error: val ? undefined : 'Kelas belum diisi' } : r));
  }

  // ── Import ──────────────────────────────────────────────────────────────────
  async function handleImport() {
    setImporting(true);
    const valid = rows.filter(r => !r.error);
    const initialFailed = rows.filter(r => !!r.error).map(r => `${r.name} (${r.error})`);

    const result = await registerStudentsBatch(
      valid.map(r => ({ name: r.name, email: r.email, password: r.password, className: r.className })),
      createdBy
    );

    setImportedCount(result.count || valid.length);
    setFailedRows([...initialFailed, ...(result.failed || [])]);
    setDoneRows(valid);
    setImporting(false);
    setStep('done');
  }

  const validRows   = rows.filter(r => !r.error);
  const invalidRows = rows.filter(r => !!r.error);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(8,59,84,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        style={{ border: '1.5px solid #d4e5ed' }}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#eceef0] flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-extrabold text-lg text-[#083b54]" style={{ fontFamily: 'var(--font-outfit)' }}>
              Import Siswa dari Daftar Nama
            </h2>
            <p className="text-[#7aa8b8] text-xs mt-0.5">
              Cukup upload daftar nama — email &amp; password dibuat otomatis oleh sistem.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[#7aa8b8] hover:bg-[#f0f5f8] hover:text-[#083b54] transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Steps */}
        <div className="px-6 pt-4 flex gap-2 shrink-0">
          {(['upload', 'preview', 'done'] as Step[]).map((s, i) => {
            const currentIdx = ['upload', 'preview', 'done'].indexOf(step);
            const done_ = currentIdx > i;
            return (
              <div key={s} className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold"
                  style={{
                    background: step === s ? '#006591' : done_ ? '#006e2f' : '#e4eef3',
                    color:      step === s || done_ ? 'white' : '#7aa8b8',
                  }}
                >
                  {done_ ? <span className="material-symbols-outlined text-[13px]">check</span> : i + 1}
                </div>
                <span className="text-xs font-semibold text-[#7aa8b8]">
                  {s === 'upload' ? 'Upload' : s === 'preview' ? 'Preview' : 'Selesai'}
                </span>
                {i < 2 && <span className="text-[#d4e5ed] mx-1">›</span>}
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── STEP 1: Upload ── */}
          {step === 'upload' && (
            <div className="space-y-4">

              {/* How it works */}
              <div className="rounded-2xl px-4 py-4" style={{ background: '#f0f8fd', border: '1px solid #c2dce9' }}>
                <p className="text-sm font-bold text-[#083b54] mb-2 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#006591] text-[18px]">auto_fix_high</span>
                  Cara kerja sistem
                </p>
                <div className="grid grid-cols-3 gap-2 text-center text-xs text-[#5a8aa0]">
                  <div className="rounded-xl p-2.5" style={{ background: 'white', border: '1px solid #d4e5ed' }}>
                    <p className="text-xl mb-1">📄</p>
                    <p className="font-bold text-[#083b54]">Guru upload</p>
                    <p>Daftar nama siswa (.csv)</p>
                  </div>
                  <div className="rounded-xl p-2.5" style={{ background: 'white', border: '1px solid #d4e5ed' }}>
                    <p className="text-xl mb-1">⚡</p>
                    <p className="font-bold text-[#083b54]">Sistem buat</p>
                    <p>Email & password otomatis</p>
                  </div>
                  <div className="rounded-xl p-2.5" style={{ background: 'white', border: '1px solid #d4e5ed' }}>
                    <p className="text-xl mb-1">📋</p>
                    <p className="font-bold text-[#083b54]">Guru export</p>
                    <p>Bagikan ke siswa</p>
                  </div>
                </div>

                <div className="mt-3 text-xs text-[#7aa8b8] flex items-start gap-1.5">
                  <span className="material-symbols-outlined text-[14px] mt-0.5">info</span>
                  <span>Contoh: <strong className="text-[#006591]">Muhammad Syukri</strong> → password: <code className="bg-[#e4f0f7] px-1 rounded font-bold text-[#006591]">syukri123</code>, email: <code className="bg-[#e4f0f7] px-1 rounded font-bold text-[#006591]">syukri@mj.id</code></span>
                </div>
              </div>

              {/* Default class - prominently at top */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#a0b4bf] block mb-1.5">
                  Kelas Default <span className="text-[#7aa8b8] normal-case font-normal">(dipakai jika kolom kelas tidak ada di CSV)</span>
                </label>
                <input
                  value={defaultClass}
                  onChange={e => setDefaultClass(e.target.value)}
                  placeholder="Contoh: VIII-A"
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-[#083b54] outline-none transition-all"
                  style={{ background: '#f7fbfd', border: '1.5px solid #d4e5ed' }}
                  onFocus={e => { e.target.style.border = '1.5px solid #006591'; }}
                  onBlur={e => { e.target.style.border = '1.5px solid #d4e5ed'; }}
                />
              </div>

              {/* Template download */}
              <div className="flex gap-2">
                <button
                  onClick={() => downloadCsv(generateCsvTemplate(false), 'daftar-nama-siswa.csv')}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2.5 rounded-xl transition-all active:scale-95"
                  style={{ background: '#f0f8fd', color: '#006591', border: '1.5px solid #b8d8eb' }}
                >
                  <span className="material-symbols-outlined text-[15px]">download</span>
                  Template (nama saja)
                </button>
                <button
                  onClick={() => downloadCsv(generateCsvTemplate(true), 'daftar-nama-kelas-siswa.csv')}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2.5 rounded-xl transition-all active:scale-95"
                  style={{ background: '#f0f8fd', color: '#006591', border: '1.5px solid #b8d8eb' }}
                >
                  <span className="material-symbols-outlined text-[15px]">download</span>
                  Template (nama + kelas)
                </button>
              </div>

              {/* Drop zone */}
              <div
                className="relative rounded-2xl flex flex-col items-center justify-center gap-3 py-10 cursor-pointer transition-all"
                style={{
                  border: `2px dashed ${dragging ? '#006591' : '#c2dce9'}`,
                  background: dragging ? '#e8f2f8' : '#f7fbfd',
                }}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="material-symbols-outlined text-5xl" style={{ color: dragging ? '#006591' : '#b8d0de' }}>
                  upload_file
                </span>
                <div className="text-center">
                  <p className="font-bold text-[#083b54] text-sm">
                    {dragging ? 'Lepaskan file di sini' : 'Klik atau seret file CSV ke sini'}
                  </p>
                  <p className="text-[#7aa8b8] text-xs mt-1">Hanya file .csv</p>
                </div>
                <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={onFileChange} />
              </div>

              {headerError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
                  <span className="material-symbols-outlined text-red-400 text-[15px] mt-0.5">error</span>
                  <p className="text-red-500 text-xs font-medium">{headerError}</p>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: Preview ── */}
          {step === 'preview' && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex gap-3 flex-wrap">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: '#f0f8fd', border: '1px solid #c2dce9' }}>
                  <span className="material-symbols-outlined text-[#006591] text-[18px]">groups</span>
                  <span className="text-sm font-bold text-[#083b54]">{rows.length} siswa</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: '#f2faf5', border: '1px solid #c2e8d2' }}>
                  <span className="material-symbols-outlined text-[#006e2f] text-[18px]">auto_fix_high</span>
                  <span className="text-sm font-bold text-[#006e2f]">{validRows.length} siap import</span>
                </div>
                {invalidRows.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: '#fff4f4', border: '1px solid #f5c2c2' }}>
                    <span className="material-symbols-outlined text-red-500 text-[18px]">error</span>
                    <span className="text-sm font-bold text-red-500">{invalidRows.length} perlu kelas</span>
                  </div>
                )}
              </div>

              {/* Bulk class setter */}
              <div
                className="flex items-center gap-3 rounded-2xl px-4 py-3"
                style={{ background: '#f0f8fd', border: '1.5px solid #b8d8eb' }}
              >
                <span className="material-symbols-outlined text-[#006591] text-[20px] shrink-0">class</span>
                <div className="flex-1">
                  <p className="text-xs font-bold text-[#083b54] mb-0.5">Isi kelas untuk semua siswa sekaligus</p>
                  <input
                    placeholder="Misal: VIII-A"
                    className="w-full px-3 py-1.5 rounded-xl text-sm text-[#083b54] outline-none transition-all"
                    style={{ background: 'white', border: '1.5px solid #c2dce9' }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        const val = (e.target as HTMLInputElement).value.trim();
                        if (val) setRows(prev => prev.map(r => ({ ...r, className: val, error: undefined })));
                      }
                    }}
                    onFocus={e => { e.target.style.border = '1.5px solid #006591'; }}
                    onBlur={e => {
                      const val = e.target.value.trim();
                      if (val) setRows(prev => prev.map(r => ({ ...r, className: val, error: undefined })));
                      e.target.style.border = '1.5px solid #c2dce9';
                    }}
                  />
                </div>
                <p className="text-[10px] text-[#a0b4bf] shrink-0">Tekan Enter<br/>untuk terapkan</p>
              </div>

              {/* Table */}
              <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #d4e5ed' }}>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: '#f0f5f8' }}>
                      {['Nama Siswa', 'Kelas', 'Email (auto)', 'Password (auto)'].map(h => (
                        <th key={h} className="text-left px-3 py-2.5 font-bold text-[#7aa8b8] uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} className="border-t" style={{ borderColor: '#edf2f5', background: row.error ? '#fff8f8' : 'white' }}>
                        <td className="px-3 py-2 font-semibold text-[#083b54]">{row.name}</td>
                        <td className="px-2 py-1.5">
                          <input
                            value={row.className}
                            onChange={e => updateRowClass(i, e.target.value)}
                            placeholder="VIII-A"
                            className="w-20 px-2 py-1 rounded-lg text-[#083b54] outline-none text-xs"
                            style={{
                              background: row.error ? '#fff0f0' : '#f0f5f8',
                              border: `1px solid ${row.error ? '#f5c2c2' : '#d4e5ed'}`,
                            }}
                          />
                        </td>
                        <td className="px-3 py-2 text-[#006591] font-mono">{row.email}</td>
                        <td className="px-3 py-2 text-[#785a00] font-mono font-bold">{row.password}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── STEP 3: Done ── */}
          {step === 'done' && (
            <div className="flex flex-col items-center text-center py-4 gap-4">
              <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: '#e8f6ee' }}>
                <span className="material-symbols-outlined text-[#006e2f] text-5xl">task_alt</span>
              </div>
              <div>
                <h3 className="font-extrabold text-xl text-[#083b54]" style={{ fontFamily: 'var(--font-outfit)' }}>
                  {importedCount} Siswa Berhasil Didaftarkan!
                </h3>
                <p className="text-[#7aa8b8] text-sm mt-1">
                  Email &amp; password sudah di-generate secara otomatis.
                </p>
              </div>

              {/* Export CTA */}
              <button
                onClick={() => downloadCsv(exportCredentialsCsv(doneRows), 'kredensial-siswa.csv')}
                className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all active:scale-95"
                style={{ background: 'linear-gradient(to bottom, #00a847, #006e2f)', color: 'white', border: '2px solid #004f20' }}
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                Download Daftar Kredensial Siswa
              </button>
              <p className="text-xs text-[#a0b4bf]">
                File CSV ini berisi nama, email, dan password setiap siswa. Bagikan ke siswa masing-masing!
              </p>

              {failedRows.length > 0 && (
                <div className="w-full rounded-2xl px-4 py-3 text-left" style={{ background: '#fff4f4', border: '1px solid #f5c2c2' }}>
                  <p className="text-xs font-bold text-red-500 mb-2">{failedRows.length} baris gagal:</p>
                  {failedRows.map((f, i) => <p key={i} className="text-xs text-red-400">• {f}</p>)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#eceef0] flex gap-3 justify-end shrink-0">
          {step === 'upload' && (
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[#7aa8b8] hover:bg-[#f0f5f8] transition-all">
              Batal
            </button>
          )}
          {step === 'preview' && (
            <>
              <button
                onClick={() => { setStep('upload'); setRows([]); }}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[#7aa8b8] hover:bg-[#f0f5f8] transition-all"
              >
                ← Ganti File
              </button>
              <button
                onClick={handleImport}
                disabled={importing || validRows.length === 0}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-white flex items-center gap-2 transition-all active:scale-95 disabled:opacity-60"
                style={{ background: 'linear-gradient(to bottom, #00a847, #006e2f)', border: '2px solid #004f20' }}
              >
                {importing ? (
                  <><span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>Mendaftarkan...</>
                ) : (
                  <><span className="material-symbols-outlined text-[16px]">group_add</span>Daftarkan {validRows.length} Siswa</>
                )}
              </button>
            </>
          )}
          {step === 'done' && (
            <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-95" style={{ background: '#006591' }}>
              Tutup
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

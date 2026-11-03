'use client';
import { useRef, useState } from 'react';

interface Props {
  onComplete: () => void;
  stageId: number;
}

export default function Stage5LKPD({ onComplete, stageId }: Props) {
  const [answers, setAnswers] = useState({ observasi: '', analisis: '', solusi: '' });
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const isValid = answers.observasi.trim().length > 20 && answers.analisis.trim().length > 20;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setSubmitting(true);
    setError(null);

    try {
      await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: 'student_001',
          completedStage: stageId,
          xpEarned: 300,
          lkpdAnswers: answers,
          hasScreenshot: !!screenshot,
          submittedAt: new Date().toISOString(),
        }),
      });
      setSubmitted(true);
    } catch {
      setError('Gagal mengirim. Periksa koneksi internet kamu.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full h-full bg-[var(--color-background)] overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-tertiary)] text-white rounded-2xl p-6 mb-6 relative overflow-hidden">
          <div className="absolute right-0 top-0 opacity-10 pointer-events-none">
            <span className="material-symbols-outlined" style={{ fontSize: 160 }}>edit_document</span>
          </div>
          <p className="text-xs font-bold opacity-70 uppercase tracking-widest mb-1">Tahap 5 · Verification</p>
          <h2 className="font-[family-name:var(--font-plus-jakarta)] text-2xl font-bold">E-LKPD Interaktif</h2>
          <p className="opacity-80 text-sm mt-1">Dokumentasikan hasil investigasi AR dan kirim ke guru kamu.</p>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Q1 */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-[var(--color-outline-variant)]/30">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-6 h-6 rounded-full bg-[var(--color-primary)] text-white text-xs flex items-center justify-center font-bold">1</span>
                <h3 className="font-bold text-[var(--color-on-surface)]">Hasil Observasi AR</h3>
              </div>
              <p className="text-sm text-[var(--color-on-surface-variant)] mb-3 ml-8">
                Apa yang kamu amati pada simulasi lambung? Jelaskan perbedaan antara bahan organik dan partikel plastik saat terkena HCl.
              </p>
              <textarea
                required
                value={answers.observasi}
                onChange={e => setAnswers(p => ({ ...p, observasi: e.target.value }))}
                className="w-full border border-[var(--color-outline-variant)] rounded-xl p-4 text-sm resize-none h-28 focus:outline-none focus:border-[var(--color-primary)]"
                placeholder="Pada simulasi X-Ray, bahan organik (daun) terlihat melunak dan terurai oleh asam HCl, sedangkan partikel plastik..."
              />
              <p className={`text-xs mt-1 ${answers.observasi.length < 20 ? 'text-orange-500' : 'text-green-600'}`}>
                {answers.observasi.length < 20 ? `Minimal 20 karakter (${answers.observasi.length} diisi)` : 'Cukup'}
              </p>
            </div>

            {/* Q2 */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-[var(--color-outline-variant)]/30">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-6 h-6 rounded-full bg-[var(--color-primary)] text-white text-xs flex items-center justify-center font-bold">2</span>
                <h3 className="font-bold text-[var(--color-on-surface)]">Analisis Ilmiah</h3>
              </div>
              <p className="text-sm text-[var(--color-on-surface-variant)] mb-3 ml-8">
                Mengapa plastik tidak bisa dicerna oleh tubuh manusia? Kaitkan dengan konsep rantai polimer sintetis dan sifat indigestible.
              </p>
              <textarea
                required
                value={answers.analisis}
                onChange={e => setAnswers(p => ({ ...p, analisis: e.target.value }))}
                className="w-full border border-[var(--color-outline-variant)] rounded-xl p-4 text-sm resize-none h-28 focus:outline-none focus:border-[var(--color-primary)]"
                placeholder="Plastik tidak dapat dicerna karena rantai polimernya terbuat dari ikatan karbon sintetis yang sangat kuat. Enzim protease dan HCl dalam lambung hanya..."
              />
              <p className={`text-xs mt-1 ${answers.analisis.length < 20 ? 'text-orange-500' : 'text-green-600'}`}>
                {answers.analisis.length < 20 ? `Minimal 20 karakter (${answers.analisis.length} diisi)` : 'Cukup'}
              </p>
            </div>

            {/* Q3 */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-[var(--color-outline-variant)]/30">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-6 h-6 rounded-full bg-[var(--color-secondary)] text-white text-xs flex items-center justify-center font-bold">3</span>
                <h3 className="font-bold text-[var(--color-on-surface)]">Solusi Konkret <span className="text-[var(--color-outline)] font-normal text-xs">(opsional)</span></h3>
              </div>
              <p className="text-sm text-[var(--color-on-surface-variant)] mb-3 ml-8">
                Apa satu langkah nyata yang bisa dilakukan masyarakat untuk mengurangi pencemaran mikroplastik di lautan?
              </p>
              <textarea
                value={answers.solusi}
                onChange={e => setAnswers(p => ({ ...p, solusi: e.target.value }))}
                className="w-full border border-[var(--color-outline-variant)] rounded-xl p-4 text-sm resize-none h-20 focus:outline-none focus:border-[var(--color-secondary)]"
                placeholder="Misalnya: mengurangi penggunaan plastik sekali pakai, memilah sampah di sumber..."
              />
            </div>

            {/* Screenshot upload */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-[var(--color-outline-variant)]/30">
              <h3 className="font-bold mb-1 flex items-center gap-2">
                <span className="material-symbols-outlined text-[var(--color-primary)]">screenshot</span>
                Bukti Screenshot AR
                <span className="text-[var(--color-outline)] font-normal text-xs ml-1">(opsional)</span>
              </h3>
              <p className="text-sm text-[var(--color-on-surface-variant)] mb-3">
                Unggah screenshot dari simulasi AR sebagai bukti pengamatan.
              </p>
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={e => setScreenshot(e.target.files?.[0] || null)} />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-3 border-2 border-dashed border-[var(--color-outline-variant)] rounded-xl px-5 py-4 text-sm text-[var(--color-on-surface-variant)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors w-full"
              >
                <span className="material-symbols-outlined">cloud_upload</span>
                {screenshot ? (
                  <span className="text-[var(--color-primary)] font-semibold">{screenshot.name}</span>
                ) : 'Pilih gambar screenshot'}
              </button>
            </div>

            {/* Scientific statement */}
            <div className="bg-[var(--color-primary-fixed)] border-l-4 border-[var(--color-primary)] rounded-xl p-5">
              <p className="text-sm font-bold text-[var(--color-primary)] mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-base">verified</span>
                Pernyataan Ilmiah
              </p>
              <p className="text-xs text-[var(--color-on-primary-fixed)] leading-relaxed">
                Plastik adalah polutan kimia sintetik yang bersifat toksik. Partikel mikroplastik bersifat <em>indigestible</em> — tidak dapat dicerna oleh sistem pencernaan manusia — dan berpotensi menyebabkan peradangan, gangguan hormonal, serta menumpuk dalam jaringan tubuh.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">{error}</div>
            )}

            <button
              type="submit"
              disabled={submitting || !isValid}
              className="w-full bg-[var(--color-primary)] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity text-lg"
            >
              {submitting ? (
                <>Mengirim... <span className="material-symbols-outlined animate-spin">progress_activity</span></>
              ) : (
                <>Kirim ke Guru <span className="material-symbols-outlined">send</span></>
              )}
            </button>
          </form>
        ) : (
          <div className="bg-white p-10 rounded-2xl shadow-sm text-center">
            <span className="material-symbols-outlined text-green-600 text-7xl mb-4 block">task_alt</span>
            <h3 className="font-bold text-2xl mb-2">Laporan Berhasil Dikirim!</h3>
            <p className="text-[var(--color-on-surface-variant)] text-sm mb-8">
              E-LKPD kamu telah diterima oleh sistem dan akan segera ditinjau oleh guru. Lanjutkan ke tahap kesimpulan akhir.
            </p>
            <button
              onClick={onComplete}
              className="w-full bg-[var(--color-primary)] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 text-lg"
            >
              Lihat Kesimpulan Akhir <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// MOLECULE: DriveInputCard
// Form input tugas PR Digital (Upload file langsung ke Cloudinary / Google Drive, link sosmed, & catatan aksi).
'use client';

import React, { useState } from 'react';
import { cn } from '@/libs/utils';
import InputField from '@/components/atoms/InputField';
import { uploadToCloudinary } from '@/lib/utils/cloudinary.utils';

interface DriveInputCardProps {
  driveLink: string;
  onDriveLinkChange: (val: string) => void;
  sosmedLink: string;
  onSosmedLinkChange: (val: string) => void;
  actionNote: string;
  onActionNoteChange: (val: string) => void;
  className?: string;
}

const DriveInputCard: React.FC<DriveInputCardProps> = ({
  driveLink,
  onDriveLinkChange,
  sosmedLink,
  onSosmedLinkChange,
  actionNote,
  onActionNoteChange,
  className,
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const isDriveValid =
    driveLink.trim() === '' ||
    driveLink.includes('cloudinary.com') ||
    driveLink.includes('res.cloudinary.com') ||
    driveLink.includes('drive.google.com') ||
    driveLink.includes('docs.google.com') ||
    driveLink.startsWith('http');

  const isSosmedValid =
    sosmedLink.trim() === '' ||
    sosmedLink.includes('tiktok.com') ||
    sosmedLink.includes('instagram.com') ||
    sosmedLink.includes('youtube.com') ||
    sosmedLink.startsWith('http');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      const res = await uploadToCloudinary(file, (pct) => {
        setUploadProgress(pct);
      });
      onDriveLinkChange(res.secure_url);
    } catch (err: any) {
      setUploadError(err?.message || 'Gagal mengunggah berkas ke Cloudinary');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className={cn(
        'bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4 text-xs',
        className
      )}
    >
      <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
        <div className="w-8 h-8 rounded-xl bg-[#006591]/10 text-[#006591] flex items-center justify-center font-bold">
          <span className="material-symbols-outlined text-[20px]">cloud_upload</span>
        </div>
        <div>
          <h4
            className="font-extrabold text-base text-[#083b54]"
            style={{ fontFamily: 'var(--font-outfit)' }}
          >
            Pengumpulan PR Digital & Dokumentasi Aksi Nyata
          </h4>
          <p className="text-[#648796] text-[11px]">
            Unggah foto/video/dokumen aksi nyata lingkunganmu, atau tempel link Google Drive/Sosmed.
          </p>
        </div>
      </div>

      {/* Direct File Upload Zone */}
      <div className="bg-[#f0f8ff] border-2 border-dashed border-[#006591]/30 rounded-xl p-4 text-center relative hover:border-[#006591] transition-all">
        <input
          type="file"
          id="cloudinary-file-input"
          onChange={handleFileUpload}
          disabled={uploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
          accept="image/*,video/*,application/pdf,.doc,.docx"
        />
        <div className="flex flex-col items-center justify-center gap-1.5 pointer-events-none">
          <div className="w-10 h-10 rounded-full bg-[#006591]/10 text-[#006591] flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">
              {uploading ? 'sync' : 'cloud_upload'}
            </span>
          </div>
          <p className="font-bold text-[#083b54] text-xs">
            {uploading ? `Mengunggah Berkas (${uploadProgress}%)...` : 'Klik atau seret file dokumentasi aksi di sini untuk mengunggah'}
          </p>
          <p className="text-[10px] text-[#648796]">
            Mendukung foto, video, PDF, dan dokumen tugas (Maks 50MB)
          </p>
        </div>

        {uploading && (
          <div className="w-full bg-[#d0e6f2] h-1.5 rounded-full overflow-hidden mt-3">
            <div
              className="bg-[#006591] h-full transition-all duration-200"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}

        {uploadError && (
          <p className="text-[11px] text-red-600 font-bold mt-2">
            ⚠️ {uploadError}
          </p>
        )}
      </div>

      {/* Input Link (Google Drive / Cloud Storage) */}
      <div className="space-y-1">
        <InputField
          label="Link Tautan Berkas / Google Drive (Otomatis terisi jika upload file)"
          icon="link"
          type="url"
          value={driveLink}
          onChange={(e) => onDriveLinkChange(e.target.value)}
          placeholder="https://drive.google.com/... atau tautan berkas aksi..."
          accentColor="#006591"
        />
        {driveLink.includes('cloudinary.com') && (
          <div className="flex items-center gap-1.5 text-[11px] text-[#006e2f] font-semibold bg-[#e6f4ea] p-2 rounded-lg">
            <span className="material-symbols-outlined text-[14px]">check_circle</span>
            <span>Berkas terunggah: <a href={driveLink} target="_blank" rel="noreferrer" className="underline truncate max-w-[250px] inline-block align-bottom">{driveLink}</a></span>
          </div>
        )}
        {!isDriveValid && (
          <p className="text-[11px] text-amber-600 font-semibold flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">warning</span>
            Pastikan format link valid (Google Drive, Cloud Storage, atau URL http/https).
          </p>
        )}
      </div>

      {/* Input Sosmed */}
      <div className="space-y-1">
        <InputField
          label="Link Video Kampanye Sosmed (Opsional)"
          icon="share"
          type="url"
          value={sosmedLink}
          onChange={(e) => onSosmedLinkChange(e.target.value)}
          placeholder="https://www.tiktok.com/@... atau Instagram Reels"
          accentColor="#006e2f"
        />
        {!isSosmedValid && (
          <p className="text-[11px] text-amber-600 font-semibold flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">warning</span>
            Pastikan tautan diawali dengan http:// atau https://
          </p>
        )}
      </div>

      {/* Catatan Aksi */}
      <div>
        <label className="text-[10px] font-bold uppercase tracking-widest text-[#a0b4bf] block mb-1.5">
          Catatan Aksi Lingkungan Sekitarmu
        </label>
        <textarea
          rows={2}
          value={actionNote}
          onChange={(e) => onActionNoteChange(e.target.value)}
          placeholder="Ceritakan aksi nyata yang kamu lakukan, misal: Membawa tumbler & tas belanja kain sendiri ke sekolah..."
          className="w-full p-3 rounded-xl text-[#083b54] placeholder-[#c8d8df] text-xs outline-none transition-all bg-[#f7fbfd] border border-[#d4e5ed] focus:border-[#006591]"
        />
      </div>
    </div>
  );
};

export default DriveInputCard;


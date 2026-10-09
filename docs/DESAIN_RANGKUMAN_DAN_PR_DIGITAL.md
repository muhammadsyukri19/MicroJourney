# 📄 Spesifikasi Teknis & Desain Visual: Rangkuman Ekspedisi, PR Digital & Feedback Siswa (Pasca-Tahap 6)

> **Dokumen Panduan Pengembang & Desain UI/UX**  
> Proyek: **MicroJourney AR — IPA Kelas VIII (Kurikulum Merdeka)**  
> Versi: **1.0.0** | Tanggal: **28 September 2026**

---

## 🗺️ 1. Gambaran Umum Fitur

Fitur ini berada di **Tahap 6 (Pasca-Submit Sumpah Komitmen)** sebagai transisi alami tanpa menambah Tahap 7 terpisah. Setelah siswa menandatangani komitmen dan mengunduh Rapor PDF, layar akan bertransisi menjadi **"Layar Rangkuman Ekspedisi & Misi Aksi Nyata"**.

### Fitur Utama:
1. **Rangkuman Ekspedisi & Sertifikat Digital**: Kartu pencapaian siswa (Total Partikel, Organ Kritis, Skor Kuis, & Komitmen).
2. **Submit PR Digital (Google Drive & Sosmed)**: Input link Google Drive tugas/file siswa + link kampanye media sosial (Reels/TikTok/Shorts) + catatan aksi nyata.
3. **Umpan Balik & Refleksi Siswa**: Penilaian bintang (1–5 Bintang) & ulasan kesan-pesan siswa selama belajar dengan MicroJourney AR.
4. **Integrasi Dashboard Guru**: Guru dapat melihat link Google Drive & Sosmed siswa dalam 1 klik langsung dari Dashboard (`/dashboard`) dan mengunduhnya ke CSV.

---

## 🛠️ 2. Stack Teknologi & Arsitektur

| Layer | Teknologi | Peran / Penggunaan |
|---|---|---|
| **Framework** | Next.js 16.2.7 (App Router) | Routing & Server Actions |
| **State Global** | Zustand (`lib/journeyStore.ts`) | Menyimpan state transient `driveLink`, `sosmedLink`, `actionNote`, `rating`, `feedback` |
| **Database** | MongoDB Atlas via Mongoose (`lib/models/LKPD.ts`) | Menyimpan data LKPD + Tugas PR Drive + Feedback secara permanen |
| **Styling** | Tailwind CSS v4 + Vanilla CSS | Aksen kayu, glassmorphism, gradient HSL, & animasi micro-interactions |
| **Animation** | Framer Motion | Fade-in transition saat berpindah dari Sumpah Komitmen ke Rangkuman |
| **Document Gen** | jsPDF | Membuat Sertifikat Digital Duta Lingkungan & Rapor PDF |
| **UI Architecture** | Atomic Design | Atoms (`StarRating`), Molecules (`DriveInputCard`), Organisms (`PostJourneySummary`) |

---

## 🎨 3. Konsep Desain Visual & UI/UX

### 🎨 Palet Warna & Token Visual
- **Hijau Sukses (Primary Action):** `#006e2f` (Tombol Kirim PR, Glow Sukses)
- **Biru Edukator (Aksen Brand):** `#006591` (Header Rangkuman & Link Active)
- **Kayu Nusantara (Tombol CTA):** Gradient `#f0a345` → `#d27b22` dengan Border `#8e4912`
- **Dark Navy Background:** `#083b54` (Latar Belakang Ekspedisi Malam)
- **Emas Sertifikat:** `#f59e0b` (Icon Bintang Rating & Lencana Duta)

### 🧱 Arsitektur Komponen (Atomic Design)

```
components/
  atoms/
    StarRating.tsx          ← Atom rating 1-5 bintang interaktif
    DriveIcon.tsx           ← Atom ikon SVG Google Drive
    SocialIcon.tsx          ← Atom ikon SVG Tiktok/Instagram/YouTube
  molecules/
    SummaryKpiCard.tsx      ← Molecule card statistik (Partikel, Kuis, Organ)
    DriveInputCard.tsx      ← Molecule form input URL Google Drive + auto-validate
    FeedbackFormCard.tsx    ← Molecule form rating bintang & ulasan
  organisms/
    PostJourneySummary.tsx  ← Organism utama yang merender Rangkuman + PR + Feedback
```

---

## 🔄 4. Alur Pengguna (User Experience Flow)

### 🧑‍🎓 A. Alur Siswa (Student Flow)
1. Siswa menyelesaikan **Game Matching** & mengisi **Sumpah Komitmen** di Tahap 6.
2. Siswa menandatangani **Tanda Tangan Digital** dan menekan **"Selesaikan & Unduh Rapor PDF"**.
3. Layar secara halus (*Framer Motion slide-up*) berpindah ke **Layar Rangkuman Ekspedisi & Misi Aksi Nyata**.
4. Siswa melihat **Rangkuman Capaian** dan opsi **Download Sertifikat Digital Duta Lingkungan**.
5. Siswa mengutip instruksi gurunya, lalu menempelkan **Link Google Drive PR** & **Link Sosmed Kampanye**.
6. Siswa memberikan **Rating Bintang (1–5)** dan menekan **"Kirim PR & Umpan Balik"**.
7. Data tersimpan ke MongoDB server dan siswa dialihkan kembali ke Beranda dengan aman.

### 👩‍🏫 B. Alur Guru (Teacher Flow)
1. Guru membuka **Dashboard Guru (`/dashboard`)** -> Tab **"Data Penilaian"**.
2. Di tabel siswa, terdapat 2 tombol cepat baru:
   - 📁 **[Buka Drive PR]**: Langsung membuka tab baru ke Google Drive siswa.
   - 📱 **[Lihat Sosmed]**: Membuka link video kampanye siswa.
3. Guru dapat melihat rating bintang ulasan siswa terhadap pembelajaran.
4. Guru menekan tombol **"Export Nilai (CSV/Excel)"** — file CSV kini otomatis menyertakan kolom Link Drive PR & Sosmed!

---

## 🗄️ 5. Skema Data & Interface TypeScript

### 📄 Updates Interface TypeScript (`lib/journeyStore.ts` & `lib/models/LKPD.ts`)

```typescript
export interface LKPDSubmissionData {
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
  
  // 🌟 Field Baru untuk PR Digital & Feedback
  driveLink?: string;       // Link Google Drive PR siswa
  sosmedLink?: string;      // Link TikTok / IG Reels / YouTube Shorts
  actionNote?: string;      // Catatan aksi nyata siswa
  rating?: number;          // Rating 1-5 bintang
  feedback?: string;        // Kesan & pesan siswa
}
```

---

## 📋 6. Rencana Tahap Implementasi

1. **Tahap 1: Pembaruan Mongoose Model & Zustand Store**
   - Tambahkan field `driveLink`, `sosmedLink`, `actionNote`, `rating`, `feedback` di `lib/models/LKPD.ts` dan `lib/journeyStore.ts`.
2. **Tahap 2: Komponen Atomic Design**
   - Buat `StarRating.tsx` (Atom), `DriveInputCard.tsx` (Molecule), dan `PostJourneySummary.tsx` (Organism).
3. **Tahap 3: Integrasi Tahap 6 (`app/journey/tahap-6/page.tsx`)**
   - Sambungkan transisi pasca-PDF ke `PostJourneySummary.tsx`.
   - Tambahkan fitur Cetak Sertifikat Digital Duta Lingkungan via `jsPDF`.
4. **Tahap 4: Update Dashboard Guru (`components/templates/pages/dashboard/TeacherDashboardTemplate.tsx`)**
   - Tampilkan kolom Link Drive PR & Sosmed di tabel penilaian.
   - Update fungsi `handleExportSubmissionsCsv` agar menyertakan kolom PR Drive.

---

> **Status:** Siap untuk Diimplementasikan  
> *Antigravity AI Agent — Pair Programming MicroJourney AR*

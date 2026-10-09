# 📝 TODO List & Perencanaan MicroJourney AR (LIDM)

Dokumen ini berisi daftar tugas (TODO) untuk merancang, mematangkan, dan mengimplementasikan fitur-fitur krusial yang dipersiapkan untuk kompetisi LIDM. Daftar ini dikategorikan berdasarkan skala prioritas.

---

## 1. 👩‍🏫 Sistem Autentikasi & Registrasi (Guru)
- [x] **UI/UX Form Register:** Menambahkan toggle dan form pendaftaran khusus Guru pada `LoginForm.tsx`.
- [x] **Backend Controller (Init):** Membuat MongoDB Model (`User.ts`) dan _Route Handlers_ untuk login/register (`api/auth/...`).
- [ ] **Integrasi API:** Menghubungkan fungsi di `lib/api/auth.api.ts` agar menembak langsung ke _endpoint_ backend Next.js secara nyata (meninggalkan mock dari Zustand).
- [ ] **Security & Session:** Memastikan Cookie Session bekerja dengan baik antar halaman. (Optional: tambahkan _Bcrypt_ jika siap).

## 2. 📊 Pematangan Dashboard Guru
- [ ] **Manajemen Siswa (Import CSV):** Mematangkan alur unggah file CSV absen kelas agar guru dapat meng-*generate* akun siswa secara otomatis.
- [ ] **Tampilan Rekap Nilai & Progress:** Membuat UI tabel yang interaktif untuk memonitor jawaban E-LKPD (Tahap 5) dan sumpah komitmen siswa (Tahap 6).
- [ ] **Fitur Filter & Pencarian:** Menambahkan filter data berdasarkan "Kelas" atau "Tahap" yang diselesaikan siswa.
- [ ] **Export Data (Rapor):** Fitur untuk mengekspor nilai (Rapor/Rekap) menjadi PDF atau Excel untuk keperluan dokumentasi sekolah.

## 3. 🔍 Pematangan Fitur AR (Augmented Reality) - Tahap 1
- [ ] **Integrasi Kamera Nyata:** Mengganti "simulasi klik" pada Tahap 1 dengan _real camera feed_ (menggunakan WebRTC / WebXR atau library seperti MindAR/A-Frame).
- [ ] **Scan Objek Plastik:** Mematangkan fitur deteksi/scan kode plastik (misal PET, HDPE) yang terintegrasi langsung dengan kamera smartphone/laptop siswa.
- [ ] **UI Scanner (HUD):** Memperbaiki tampilan _Heads-Up Display_ (HUD) saat melakukan scanning agar terlihat lebih futuristik dan *gamified*.

## 4. 🎓 Pemasangan Fitur Edukasi Siswa (Tahap 2-6)
- [ ] **Audio Panduan (Voice Over) - Tahap 2:** Menambahkan instruksi audio *voice-over* (suara panduan) pada saat proses pelapukan agar siswa lebih paham apa yang harus dilakukan.
- [ ] **Animasi Micro-interaction:** Menambahkan interaksi animasi (seperti Partikel, *hover effects* yang lebih hidup) di halaman materi dan lab virtual.
- [ ] **Sertifikat Digital (Tahap 6):** Setelah siswa melakukan "Sumpah Komitmen", siswa akan mendapatkan E-Sertifikat kelulusan berekstensi PDF yang bisa diunduh.
- [ ] **Penyimpanan Progress (Backend):** Mengamankan *progress* siswa dari *localStorage* ke MongoDB menggunakan *endpoint* `/api/progress` agar tidak hilang.

---

> **Catatan untuk Developer:** Fokuskan pengembangan pada fitur yang memiliki **dampak visual dan fungsional tertinggi di mata Juri LIDM** (seperti AR Scanner, Dashboard Import CSV, dan Interaktivitas Lab Virtual).

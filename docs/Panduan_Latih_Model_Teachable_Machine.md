# 🤖 Panduan Melatih & Mengintegrasikan Custom Model AI Plastik (Teachable Machine)

Dokumen ini menjelaskan langkah-langkah untuk melatih model deteksi objek plastik khusus menggunakan **Google Teachable Machine** agar akurasi deteksi sampah plastik pada **Tahap 1 (AR Scanner)** menjadi sangat tinggi.

---

## 🎯 Mengapa Perlu Custom Model?
Secara bawaan, model standar **COCO-SSD** dirancang umum untuk 80 kategori umum (kucing, mobil, orang, botol). Untuk aplikasi edukasi IPA ini, melatih model sendiri dengan **Google Teachable Machine (TensorFlow.js)** akan memberikan akurasi jauh lebih presisi untuk berbagai variasi sampah plastik lokal di Indonesia (botol mineral, gelas plastik kemasan, kantong kresek, tempat makan plastik).

---

## 🚀 Langkah Melatih Model (Tanpa Coding)

### 1. Buka Teachable Machine
- Akses ke [teachablemachine.withgoogle.com](https://teachablemachine.withgoogle.com/)
- Pilih **Get Started** -> **Image Project** -> **Standard Image Model**

### 2. Buat Kategori (Classes) Sampah Plastik
Buat 3 (tiga) kelas berikut:
1. **Class 1:** `Botol Plastik`
   - Ambil/upload 50-100 foto botol plastik (PET) dari berbagai sudut, warna, dan pencahayaan.
2. **Class 2:** `Wadah & Gelas Plastik`
   - Ambil/upload 50-100 foto gelas plastik (PP), kantong kresek, mika makanan.
3. **Class 3:** `Bukan Plastik`
   - Ambil/upload 50-100 foto latar belakang ruangan, tangan, kertas, benda non-plastik.

### 3. Latih Model (Train)
- Klik tombol **Train Model**.
- Tunggu hingga proses pelatihan selesai (biasanya 1–2 menit).
- Uji coba langsung menggunakan Webcam di panel sebelah kanan (*Preview*).

### 4. Export Model ke TensorFlow.js
- Klik **Export Model**.
- Pilih tab **TensorFlow.js**.
- Pilih **Download** (atau simpan Cloud Link jika menggunakan URL).
- Anda akan mendapatkan zip berisi 3 file:
  - `model.json`
  - `weights.bin`
  - `metadata.json`

---

## 📁 Integrasi ke Aplikasi MicroJourney AR

Aplikasi ini **sudah dikonfigurasi otomatis** untuk mendeteksi custom model jika file diletakkan di folder publik!

1. Ekstrak file zip hasil download Teachable Machine.
2. Masukkan file ke folder proyek berikut:
   ```
   public/
     models/
       plastic/
         model.json
         weights.bin
         metadata.json
   ```
3. Saat siswa membuka **Tahap 1 (AR Scanner Plastik)**, sistem akan secara otomatis mendeteksi ketersediaan model tersebut dan menampilkan indikator:
   `MODEL KHUSUS PLASTIK AKTIF ✓`

---

## 🛠️ Fitur Scanner AI Terbaru yang Sudah Diimplementasikan

1. **Penilaian Akumulatif (Lock Progress 0% - 100%):**
   - Tidak lagi bergantung pada nilai percaya mendadak yang suka hilang.
   - Sensor mengunci target secara mulus selama 1.5 detik saat siswa mengarahkan objek plastik ke kamera.
2. **Umpan Balik Audio (Audio Beep & Lock Ping):**
   - Menghasilkan suara beep radar dan efek suara kunci target layaknya scanner AR canggih.
3. **Multi-Kelas Plastik:**
   - Mendukung botol, gelas, wadah, mangkuk, pembungkus, dan kemasan sintetis.

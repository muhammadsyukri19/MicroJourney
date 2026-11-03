# Referensi Model Mikroplastik 3D

Model di `public/models/microplastic/v2/` adalah **visualisasi 3D berdasarkan referensi morfologi, bukan hasil pemindaian mikroskop**. Model ini belum divalidasi oleh ahli, jadi tidak boleh disebut akurat secara ilmiah.

Layar AR menampilkan lima foto asli dari publikasi berlisensi CC BY 4.0 di `public/images/microplastic/`, supaya ilustrasi bisa dibedakan dari pengamatan nyata. Setiap foto diberi atribusi, tautan lisensi, dan keterangan perubahan di layar:

| Berkas | Sumber | Perubahan |
|--------|--------|-----------|
| `foto-fragmen.jpg` | R4 Fig. 3 panel a | Dipotong dan diperkecil |
| `foto-film.jpg` | R4 Fig. 3 panel c | Dipotong dan diperkecil |
| `foto-serat.jpg` | R2 Fig. 5 panel B | Dipotong dan diperkecil |
| `foto-pelet.jpg` | R1 Fig. 3 panel A | Dipotong |
| `foto-semua.jpg` | R5 Fig. 1 | Format diubah ke JPEG |

Batas mikroplastik kurang dari 5 mm mengikuti [NOAA](https://oceanservice.noaa.gov/facts/microplastics.html): "small plastic pieces less than five millimeters long".

## 1. Daftar referensi

Judul, penulis, DOI, keterangan gambar, dan lisensi diperiksa langsung dari halaman penerbit pada 3 November 2026.

| ID | Publikasi | Gambar | Sampel dan alat | Bentuk yang ditunjukkan | Skala | Lisensi |
|----|-----------|--------|-----------------|-------------------------|-------|---------|
| R1 | Chinglenthoiba C, Danish HR, Anuar ST, Santos JH. 2025. *Quantification and identification of microplastic in sediment and surface water from selected areas in the Brunei ecosystem.* Water Emerging Contaminants & Nanoplastics. [doi:10.20517/wecn.2025.04](https://doi.org/10.20517/wecn.2025.04) | [Fig. 3](https://www.oaepublish.com/articles/wecn.2025.04/image/fig3) | Sedimen dan air permukaan sungai di Brunei; mikroskop 10/20×; FTIR | A pelet, B serat, C1 fragmen, C2 film, D busa | Batang 500 µm di tiap panel | CC BY 4.0 |
| R2 | Gao Z, Wontor K, Cizdziel JV, Lu H. 2022. *Distribution and characteristics of microplastics in beach sand near the outlet of a major reservoir in north Mississippi, USA.* Microplastics and Nanoplastics. [doi:10.1186/s43591-022-00029-z](https://doi.org/10.1186/s43591-022-00029-z) | [Fig. 5](https://microplastics.springeropen.com/articles/10.1186/s43591-022-00029-z/figures/5) | Pasir pantai Sardis Lake; mikroskop stereo; µ-FTIR pada sebagian partikel | A, B serat; C serat kusut dan fragmen; D butiran; E film; F, G, H, I fragmen | Batang 500 µm di tiap panel; label ukur 62,787 µm (D) dan 309,838 µm (F) | CC BY 4.0 |
| R3 | Huang Y, Fan J, Liu H, Lu X. 2022. *Vertical distribution of microplastics in the sediment profiles of the Lake Taihu, eastern China.* Sustainable Environment Research. [doi:10.1186/s42834-022-00154-7](https://doi.org/10.1186/s42834-022-00154-7) | [Fig. 4](https://sustainenvironres.biomedcentral.com/articles/10.1186/s42834-022-00154-7/figures/4) | Profil sedimen Danau Taihu; mikroskop stereo; Raman pada partikel perwakilan | a fragmen, b serat, c pelet, d film; e sampai h contoh per kelompok ukuran | Batang 250 µm di tiap panel | CC BY 4.0 |
| R4 | Li Y, Lu Z, Zheng H, Wang J, Chen C. 2020. *Microplastics in surface water and sediments of Chongming Island in the Yangtze Estuary, China.* Environmental Sciences Europe. [doi:10.1186/s12302-020-0297-7](https://doi.org/10.1186/s12302-020-0297-7) | [Fig. 3](https://link.springer.com/article/10.1186/s12302-020-0297-7/figures/3) | Air permukaan dan sedimen Pulau Chongming; mikroskop stereo; µ-FTIR | a, b fragmen; c, d film; e serat | Batang 100 µm di tiap panel | CC BY 4.0 |
| R5 | Wu C, Zhang K, Xiong X. 2018. *Microplastic Pollution in Inland Waters Focusing on Asia.* Dalam Wagner M, Lambert S (ed.), Freshwater Microplastics, Springer. [doi:10.1007/978-3-319-61615-5_5](https://doi.org/10.1007/978-3-319-61615-5_5) | [Fig. 1](https://link.springer.com/chapter/10.1007/978-3-319-61615-5_5/figures/1) | Danau Qinghai dan Waduk Tiga Ngarai | a lembaran (*sheet*), b film, c serat, d fragmen, e pelet atau granul, f busa | Batang 1 mm hanya pada panel D; panel lain tidak menyatakan skala | CC BY 4.0, dinyatakan di [halaman buku](https://link.springer.com/book/10.1007/978-3-319-61615-5) |

Sumber yang tidak dipakai sebagai bukti bentuk:

- **USGS, [Plastics in Great Lakes Tributaries](https://www.usgs.gov/media/images/plastics-great-lakes-tributaries):** ini ilustrasi, bukan foto mikroskop.
- **NPS, [Microplastics are Everywhere](https://www.nps.gov/articles/microplastics-are-everywhere.htm):** fotonya dari kontributor luar dan ketentuan pakai ulangnya tidak jelas, jadi hanya dipakai untuk pembanding.
- **NOAA:** halaman yang ditemukan tidak memuat galeri foto mikroskop yang bisa dipakai.

**Keterbatasan referensi:** belum ditemukan foto mikroskop pelet **silindris** dari sumber yang bisa diverifikasi. Bentuk ini hanya berasal dari deskripsi tertulis tentang pelet industri, dan halaman sumber yang ditemukan tidak bisa dibuka lengkap. Karena itu silinder di model diberi keterangan ilustratif pada layar.

## 2. Ringkasan analisis bentuk

Analisis berasal dari foto dua dimensi. Ketebalan umumnya tidak bisa ditentukan, dan bentuk tidak dipakai untuk menyimpulkan jenis polimer. Ukuran di bawah ini perkiraan dari batang skala pada panel yang sama, dan hanya menggambarkan contoh di foto, bukan rentang semua mikroplastik.

| Kategori | Yang terlihat di foto | Ukuran terbaca |
|----------|-----------------------|----------------|
| **Fragmen** | Kontur tidak beraturan. Ada serpihan bersudut tajam (R1 C1), batang beralur dengan ujung berserabut sekitar 7:1 (R4 a), potongan tembus cahaya melengkung (R4 b, R2 I), bongkah dengan bidang patah (R5 D), dan benda bertepi lebih lunak (R2 F, H) | sekitar 0,3–3 mm |
| **Serat** | Lebar mendekati batas resolusi foto, jadi rasio panjang terhadap lebar sangat besar. Ada yang berkelok tajam (R2 A), panjang dengan lingkar bersilangan (R2 B, R1 B), kusut dengan lingkar keluar (R2 C), lengkung lebar (R3 h), kait pendek (R4 e), dan lurus agak kasar (R5 C) | sekitar 0,1 mm sampai beberapa mm |
| **Film** | Kontur tidak rata, sering berakhir sebagai tepi robek. Ada lembaran datar dengan takik dan garis lipat (R4 c), lembaran dengan lipatan sejajar dan tepi terkikis (R4 d), serta pita kusut (R5 b). Ketebalan tidak terukur | sekitar 0,2–1,5 mm |
| **Pelet** | Membulat tetapi tidak bulat sempurna, ada sisi yang rata (R1 A), butiran kecil (R2 D, R3 c), dan cakram dengan bibir tepi (R5 e, skalanya tidak dinyatakan sehingga tidak dihitung) | sekitar 0,06–0,35 mm |

### Tabel ukur

Hanya dua nilai yang merupakan label ukur asli dari penulis publikasi. Nilai lain adalah perkiraan: panjang objek dalam piksel dibandingkan dengan batang skala di panel yang sama. Objek dipisahkan dari latar dengan ambang warna, jadi tepi yang samar bisa terlewat.

| Panel | Kategori | Batang skala | Hasil | Jenis nilai |
|-------|----------|--------------|-------|-------------|
| R2 D | Pelet | Label pada foto | 62,787 µm | Label asli |
| R2 F | Fragmen | Label pada foto | 309,838 µm | Label asli |
| R3 c | Pelet | 92 px = 250 µm | sekitar 81 × 61 µm | Perkiraan |
| R1 A | Pelet | 60 px = 500 µm | sekitar 340 × 260 µm | Perkiraan |
| R4 a | Fragmen | 99 px = 100 µm | sekitar 710 × 100 µm | Perkiraan |
| R4 b | Fragmen | 99 px = 100 µm | sekitar 350 × 180 µm | Perkiraan |
| R1 C1 | Fragmen | 60 px = 500 µm | sekitar 540 × 350 µm | Perkiraan |
| R5 D | Fragmen | 22 px = 1 mm | sekitar 2–3 mm; gambar sumber kecil | Perkiraan kasar |
| R4 e | Serat | 99 px = 100 µm | potongan pendek sekitar 80 µm | Perkiraan |
| R3 e | Serat | 93 px = 250 µm | sekitar 170 µm | Perkiraan |
| R2 B | Serat | 49 px = 500 µm | rentang sekitar 4 mm; panjang lintasannya lebih besar | Perkiraan |
| R3 d | Film | 93 px = 250 µm | sekitar 180 × 140 µm | Perkiraan |
| R4 c | Film | 99 px = 100 µm | sekitar 550 × 300 µm | Perkiraan |
| R2 E | Film | 139 px = 500 µm | sekitar 550 × 420 µm | Perkiraan |
| R1 C2 | Film | 60 px = 500 µm | sekitar 1,5 mm | Perkiraan |

Panel R5 E tidak dihitung karena skalanya tidak dinyatakan.

## 3. Pendekatan geometri

Model v2 dibuat oleh `scripts/build-microplastic-models-v2.py` dengan numpy, scipy, pillow, dan usd-core. Hasilnya lima pasang GLB dan USDZ biner: `semua`, `fragmen`, `serat`, `film`, dan `pelet`. Setiap partikel punya seed dan resep sendiri, jadi tidak ada yang berulang. Aset v1 dan pembuatnya, `scripts/build-microplastic-models.py` dan `scripts/export-microplastic-usdz.mjs`, belum dihapus sampai v2 lolos uji di HP.

Geometri tetap prosedural, karena pada 3 November 2026 tidak ditemukan aset 3D partikel mikroplastik yang layak dan bisa diunduh tanpa login:

- **Sketchfab (API, model yang bisa diunduh):** hanya "Microplastic Case" oleh simonster (CC BY, sekitar 594 ribu face). Itu pindaian model studi, bukan partikel, dan pengunduhan perlu login.
- **Zenodo dan figshare (API):** tidak ada mesh partikel mikroplastik.
- **Poly Haven (API):** tidak ada model mikroplastik.

Aset pihak ketiga yang dipakai, semuanya CC0:

| Aset | Sumber | Dipakai untuk |
|------|--------|---------------|
| Plastic013B, Plastic018B | [ambientCG](https://ambientcg.com/license) | Lapisan goresan dan bercak aus |
| SurfaceImperfections015 | [ambientCG](https://ambientcg.com/license) | Lapisan keausan halus |
| studio_small_09 | [Poly Haven](https://polyhaven.com/a/studio_small_09) | Cahaya viewer, diperkecil ke 256×128 dan warnanya dinetralkan menjadi `v2/studio.hdr` |

Plastic015B dan Scratches004 juga diperiksa, tetapi tidak dipakai. Berkas sumber CC0 tidak disimpan di repo. Unduh versi 1K-JPG dari ambientCG dan berikan foldernya ke skrip saat membuat ulang model.

Mesh dibuat ringan. Detail kecil dihitung dari fungsi tinggi yang sama, lalu disimpan sebagai normal map terhadap normal verteks yang terinterpolasi, ditambah tekstur warna dan kekasaran 1024 px per kategori. Serat memakai satu tekstur kecil yang berulang.

| Kategori | Cara membentuk | Rujukan bentuk |
|----------|----------------|----------------|
| Fragmen | Kontur bersudut dengan sisi yang berbeda-beda, lalu triangulasi Delaunay. Permukaan dari minimum beberapa bidang miring supaya tampak seperti bidang patah. Tepi ada yang menipis, ada yang tegak. Warna lebih terang di bagian tipis, dengan keausan tepi, goresan, dan bintik | R1 C1, R5 D, R2 F |
| Fragmen batang | Alur memanjang yang sedikit terpuntir, satu ujung tumpul, ujung lainnya bergerigi seperti serabut | R4 a |
| Fragmen sabit | Kontur sabit yang tidak simetris, tepi lebih tebal, sedikit melengkung dan terpuntir | R2 I, R4 b |
| Serat | Tabung tipis mengikuti jalur dari urutan belokan, dengan penampang agak pipih dan titik yang dipusatkan di belokan. Tiap jalur punya resep sendiri: melingkar, berkelok, lengkung, lurus dengan ujung bengkok. Serat kusut memakai gelombang dengan jangkauan yang mengecil di tengah | R2 A, B, C; R3 h; R5 C |
| Film | Kontur robek dengan takik dan lipatan V yang memudar di ujungnya. Garis lipat dan goresan lebih putih dan lebih tidak tembus cahaya, seperti pada foto. Dibuat tertutup dengan tepi tipis, tanpa bahan dua sisi karena USDZ tidak mendukungnya | R4 c, R4 d, R5 b |
| Pelet | Bola kubus tanpa kutub tekstur, dengan benjolan rendah, lubang kecil, goresan, dan satu sisi rata; cakram dengan bibir tepi; silinder pendek dengan ujung terpotong | R1 A, R2 D, R5 e; silinder ilustratif |

Warna memakai keluarga biru muda dan cyan MicroJourney. Bahan tidak memakai `emissive`, jadi tidak ada efek glow, dan bentuknya terbaca dari cahaya biasa. Transmisi kaca tidak dipakai karena kanvas viewer transparan.

## 4. Keterbatasan

**Ilmiah**

- Model ini ilustrasi yang terinspirasi foto, bukan rekonstruksi partikel tertentu. Tidak ada hasil pindai atau pengukuran 3D di dalamnya.
- Ketebalan, bentuk bagian bawah, dan tinggi lipatan adalah perkiraan, karena foto dua dimensi tidak menunjukkannya.
- Warna dipilih untuk identitas aplikasi. Warna dan bentuk tidak menunjukkan jenis polimer.
- Alur, serabut, garis lipat, goresan, dan bintik dibuat lebih jelas supaya terbaca di layar HP. Pola goresan dan keausan berasal dari tekstur plastik umum, bukan dari partikel di foto.
- Silinder pelet belum punya rujukan foto mikroskop.
- Model tidak menyatakan bentuk apa yang ada di organ tertentu.
- Perbandingan ukuran antarpartikel tidak sesuai skala nyata, dan semua partikel diperbesar.

**Teknis**

- Ukuran model sekitar 22–42 cm supaya terlihat di ruangan. Pengguna tetap bisa mengubah ukurannya di layar AR.
- USDZ tidak membawa animasi. Model di AR diam.
- Cahaya HDRI hanya berlaku di viewer. Di AR, cahaya mengikuti ruangan dan pengolah milik perangkat.
- Film memakai bahan tembus cahaya. Tampilannya bisa sedikit berbeda antara model-viewer, Quick Look, dan Scene Viewer.
- Lipatan yang saling menutupi pada film tidak diurutkan sempurna oleh penggambaran tembus cahaya.

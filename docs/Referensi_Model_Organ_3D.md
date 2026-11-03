# Referensi Model Organ 3D (Tahap 4)

Berkas: `public/models/organs/digestive.glb` dan `digestive.usdz`. Pembuat: `scripts/build-organ-model.py`.

## Aset

| Hal | Isi |
| --- | --- |
| Nama | BodyParts3D |
| Pembuat | Database Center for Life Science (Life Science Integrated Database Center), Jepang |
| Sumber asli | http://lifesciencedb.jp/bp3d/ |
| Salinan yang diunduh | https://github.com/Kevin-Mattheus-Moerman/BodyParts3D (`assets/BodyParts3D_data/stl`) |
| Lisensi | CC BY-SA 2.1 Jepang, https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en |
| Halaman lisensi asli | http://lifesciencedb.jp/bp3d/info_en/license/index.html |
| Kredit | BodyParts3D, Copyright© 2008 Life Science Integrated Database Center, licensed by CC Display-Inheritance 2.1 Japan |

Lisensinya berbagi serupa, jadi berkas turunan di `public/models/organs/` juga berlisensi CC BY-SA 2.1 Jepang. Kredit tampil di aplikasi pada modal Referensi Tahap 4 dan tersimpan di metadata GLB.

Bagian yang dipakai:

| Bagian | Berkas | Segitiga asli | Segitiga hasil |
| --- | --- | --- | --- |
| Kerongkongan | FMA7131 | sekitar 2.600 | 1.500 |
| Lambung | FMA7148 | sekitar 9.400 | 5.000 |
| Duodenum | FMA7206 | sekitar 12.000 | 2.800 |
| Jejunum | FMA7207 | sekitar 31.500 | 7.000 |
| Ileum | FMA7208 | sekitar 31.200 | 7.000 |
| Apendiks | FMA14542 | sekitar 700 | 300 |
| Kolon | FMA14543nsn | sekitar 69.500 | 9.000 |
| Rektum | FMA14544 | sekitar 8.800 | 1.800 |

## Modifikasi

- Bagian digabung menjadi empat kelompok: kerongkongan, lambung, usus halus, usus besar.
- Jumlah poligon disederhanakan dengan fast-simplification. Bentuk organ tidak digambar ulang.
- Sumbu dan titik pusat disesuaikan. Ukuran tetap anatomis: sekitar 22 x 66 x 17 cm.
- Warna jaringan, lekukan yang lebih gelap, dan transparansi ditambahkan.
- Ditambah 48 partikel ilustratif (fragmen, serat, film, pelet) yang dibuat sendiri, tanpa aset luar.

## Batas ilmiah

- Jalur partikel dihitung dari bentuk mesh, bukan hasil pengamatan di dalam tubuh.
- Mesh jejunum dan ileum terdiri dari banyak potongan tertutup yang menempel, bukan satu tabung. Jalurnya berkeliling melalui titik-titik rongga agar seluruh bagian terlewati, jadi urutannya bukan urutan anatomi yang pasti.
- Bentuk partikel saja tidak memastikan jenis plastiknya.
- Ukuran partikel sangat diperbesar dan jumlahnya tidak mewakili jumlah sebenarnya.
- Model tidak menunjukkan partikel menembus jaringan atau masuk ke darah. Pada pilihan Aliran Darah, partikel disembunyikan.
- Tidak ada visual kerusakan, luka, atau penyakit.
- Mulut dan aliran darah tidak dimodelkan.
- Isi panel ada di `lib/organs.ts`. Setiap kalimat mengikuti abstrak yang dibaca di Europe PMC, dan setiap sumber punya DOI.

## Animasi dan AR

GLB berisi lima klip: `jalur_lengkap`, `kerongkongan`, `lambung`, `usus_halus`, `usus_besar`. USDZ hanya berisi animasi jalur lengkap dan tidak punya warna lekukan per titik. Partikel ada di dalam kedua berkas, jadi tidak ada sistem AR kedua.

Cara menghitung jalur: tiap bagian organ divoxelkan 2,5 mm, jarak ke dinding dihitung dengan distance transform, lalu jalur terpendek berbobot (menjauhi dinding) menjadi garis tengah. Jalur dihaluskan, dan bagian yang keluar rongga memakai penghalusan lebih ringan. Posisi partikel, ukuran yang mengikuti lebar rongga, dan arah dihitung tiap 0,05 detik, lalu kuncinya dipadatkan dalam batas toleransi. Pada klip lambung, sebagian besar partikel berkeliling di dalam rongga lambung dan sisanya lewat dari kerongkongan ke usus halus.

Validasi: glTF Validator 0 error dan 0 peringatan; validator bawaan usd-core 0 temuan. Quick Look di iPhone serta Scene Viewer dan WebXR di Android belum diuji di perangkat sungguhan.

## Membuat ulang

Unduh delapan berkas STL di atas ke satu folder, lalu jalankan dari root repo:

```bash
python scripts/build-organ-model.py public/models/organs <folder STL>
```

Butuh numpy, scipy, fast-simplification, dan usd-core. Bila pusat organ berubah, sesuaikan `VIEWS` di `components/stages/OrganViewer3D.tsx`.

## Alternatif yang diperiksa

"Human Organs" oleh AfifPutra Suyanto di Sketchfab (https://sketchfab.com/3d-models/human-organs-bced6b6ebded4845bcfb2496a6e6d35c) tercatat dapat diunduh, berlisensi CC Attribution, dan berisi 316.160 segitiga, tetapi pengunduhannya butuh login Sketchfab. Model itu belum pernah diunduh atau diperiksa isinya. Untuk memakainya, unduh GLB secara manual lalu kirim ke tim pengembang; organnya perlu dipisah per material dan jumlah poligonnya perlu dikurangi sebelum dipasang.

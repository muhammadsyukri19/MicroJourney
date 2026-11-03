/**
 * Kategori bentuk mikroplastik pada layar 3D dan AR.
 * Teksnya hanya menjelaskan bentuk yang terlihat di foto, tanpa menyimpulkan jenis polimer.
 * Daftar rujukan dan tabel ukur ada di docs/Referensi_Model_Mikroplastik_3D.md.
 */
export type MicroplasticTypeId = 'semua' | 'fragmen' | 'serat' | 'film' | 'pelet';

export interface MicroplasticSource {
  label: string;
  url: string;
}

export interface MicroplasticPhoto {
  src: string;
  width: number;
  height: number;
  caption: string;
  source: MicroplasticSource;
  /** Perubahan pada foto, wajib disebut oleh lisensi CC BY */
  changes: string;
}

export interface MicroplasticType {
  id: MicroplasticTypeId;
  label: string;
  alt: string;
  shape: string;
  /** Rentang ukuran contoh, diperkirakan dari batang skala pada foto rujukan */
  size?: string;
  /** Bagian model yang tidak berasal dari foto */
  note?: string;
  /** Sudut dan jarak awal kamera supaya partikel mengisi bingkai */
  orbit: string;
  photo: MicroplasticPhoto;
  sources: MicroplasticSource[];
}

const SOURCES = {
  chinglenthoiba: { label: 'Chinglenthoiba dkk. 2025', url: 'https://doi.org/10.20517/wecn.2025.04' },
  gao: { label: 'Gao dkk. 2022', url: 'https://doi.org/10.1186/s43591-022-00029-z' },
  huang: { label: 'Huang dkk. 2022', url: 'https://doi.org/10.1186/s42834-022-00154-7' },
  li: { label: 'Li dkk. 2020', url: 'https://doi.org/10.1186/s12302-020-0297-7' },
  wu: { label: 'Wu dkk. 2018', url: 'https://doi.org/10.1007/978-3-319-61615-5_5' },
} satisfies Record<string, MicroplasticSource>;

export const MICROPLASTIC_TYPES: MicroplasticType[] = [
  {
    id: 'semua',
    label: 'Semua',
    alt: 'Model 3D gabungan mikroplastik berbentuk fragmen, serat, film, dan pelet',
    shape: 'Mikroplastik sering dikelompokkan dari bentuknya. Pilih satu untuk melihat lebih dekat.',
    orbit: '20deg 52deg 96%',
    photo: {
      src: '/images/microplastic/foto-semua.jpg',
      width: 550,
      height: 273,
      caption: 'Partikel dari Danau Qinghai dan Waduk Tiga Ngarai. A lembaran, B film, C serat, D fragmen, E pelet atau granul, F busa. Batang 1 mm hanya ada di panel D.',
      source: SOURCES.wu,
      changes: 'format diubah ke JPEG',
    },
    sources: [],
  },
  {
    id: 'fragmen',
    label: 'Fragmen',
    alt: 'Model 3D fragmen: serpihan bersudut, bongkahan, batang beralur, dan sabit melengkung',
    shape: 'Serpihan atau pecahan tidak beraturan. Sudut dan tepinya berbeda-beda.',
    size: 'sekitar 0,3–3 mm',
    orbit: '20deg 50deg 92%',
    photo: {
      src: '/images/microplastic/foto-fragmen.jpg',
      width: 560,
      height: 418,
      caption: 'Fragmen dari sampel Pulau Chongming, dilihat dengan mikroskop. Batang skala 100 µm.',
      source: SOURCES.li,
      changes: 'dipotong dari Fig. 3 dan diperkecil',
    },
    sources: [SOURCES.gao, SOURCES.li, SOURCES.wu],
  },
  {
    id: 'serat',
    label: 'Serat',
    alt: 'Model 3D serat: helai panjang melingkar, lengkung, berkelok, lurus, dan kusut',
    shape: 'Sangat tipis dan panjang. Bisa lurus, melengkung, berkelok, atau kusut.',
    size: 'panjang sekitar 0,1 mm sampai beberapa mm',
    orbit: '20deg 48deg 95%',
    photo: {
      src: '/images/microplastic/foto-serat.jpg',
      width: 560,
      height: 435,
      caption: 'Serat merah panjang dari pasir pantai Sardis Lake, AS, dilihat dengan mikroskop. Batang hijau 500 µm.',
      source: SOURCES.gao,
      changes: 'dipotong dari Fig. 5 dan diperkecil',
    },
    sources: [SOURCES.gao, SOURCES.huang, SOURCES.li],
  },
  {
    id: 'film',
    label: 'Film',
    alt: 'Model 3D film: lembaran tipis dengan tepi robek, lipatan, dan kerutan',
    shape: 'Lembaran sangat tipis dengan tepi tidak rata. Ada yang datar, ada yang berkerut atau terlipat.',
    size: 'sekitar 0,2–1,5 mm',
    orbit: '20deg 46deg 94%',
    photo: {
      src: '/images/microplastic/foto-film.jpg',
      width: 560,
      height: 422,
      caption: 'Film dari sampel Pulau Chongming, dilihat dengan mikroskop. Batang skala 100 µm.',
      source: SOURCES.li,
      changes: 'dipotong dari Fig. 3 dan diperkecil',
    },
    sources: [SOURCES.li, SOURCES.wu, SOURCES.huang, SOURCES.chinglenthoiba],
  },
  {
    id: 'pelet',
    label: 'Pelet',
    alt: 'Model 3D pelet: butiran membulat, cakram, butiran kecil, dan silinder pendek',
    shape: 'Butiran membulat yang tidak selalu bulat sempurna.',
    size: 'sekitar 0,06–0,35 mm',
    note: 'Silinder di model ini hanya dari deskripsi tertulis, belum dari foto mikroskop.',
    orbit: '20deg 56deg 86%',
    photo: {
      src: '/images/microplastic/foto-pelet.jpg',
      width: 365,
      height: 365,
      caption: 'Pelet di tengah gambar, dari sampel sungai di Brunei, dilihat dengan mikroskop. Batang skala 500 µm.',
      source: SOURCES.chinglenthoiba,
      changes: 'dipotong dari Fig. 3',
    },
    sources: [SOURCES.chinglenthoiba, SOURCES.gao, SOURCES.wu],
  },
];

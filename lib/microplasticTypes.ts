/**
 * Kategori bentuk mikroplastik pada layar 3D dan AR.
 * Teksnya hanya menjelaskan bentuk yang terlihat di foto mikroskop, tanpa menyimpulkan jenis polimer.
 * Daftar rujukan lengkap ada di docs/Referensi_Model_Mikroplastik_3D.md.
 */
export type MicroplasticTypeId = 'semua' | 'fragmen' | 'serat' | 'film' | 'pelet';

export interface MicroplasticSource {
  label: string;
  url: string;
}

export interface MicroplasticType {
  id: MicroplasticTypeId;
  label: string;
  alt: string;
  shape: string;
  /** Rentang ukuran yang terbaca dari skala pada foto rujukan */
  size?: string;
  /** Bagian model yang tidak berasal dari foto mikroskop */
  note?: string;
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
    sources: [],
  },
  {
    id: 'fragmen',
    label: 'Fragmen',
    alt: 'Model 3D fragmen: serpihan bersudut, bongkahan, batang beralur, dan sabit melengkung',
    shape: 'Serpihan atau pecahan tidak beraturan. Sudut dan tepinya berbeda-beda.',
    size: 'sekitar 0,3–3 mm',
    sources: [SOURCES.gao, SOURCES.li, SOURCES.wu],
  },
  {
    id: 'serat',
    label: 'Serat',
    alt: 'Model 3D serat: helai panjang melingkar, lengkung, berkelok, lurus, dan kusut',
    shape: 'Sangat tipis dan panjang. Bisa lurus, melengkung, berkelok, atau kusut.',
    size: 'panjang sekitar 0,1 mm sampai beberapa mm',
    sources: [SOURCES.gao, SOURCES.huang, SOURCES.li],
  },
  {
    id: 'film',
    label: 'Film',
    alt: 'Model 3D film: lembaran tipis dengan tepi robek, lipatan, dan kerutan',
    shape: 'Lembaran sangat tipis dengan tepi tidak rata. Ada yang datar, ada yang berkerut atau terlipat.',
    size: 'sekitar 0,2–2 mm',
    sources: [SOURCES.li, SOURCES.wu, SOURCES.huang, SOURCES.chinglenthoiba],
  },
  {
    id: 'pelet',
    label: 'Pelet',
    alt: 'Model 3D pelet: butiran membulat, cakram, butiran kecil, dan silinder pendek',
    shape: 'Butiran membulat yang tidak selalu bulat sempurna.',
    size: 'sekitar 0,06–0,4 mm',
    note: 'Silinder di model ini hanya dari deskripsi tertulis, belum dari foto mikroskop.',
    sources: [SOURCES.chinglenthoiba, SOURCES.gao, SOURCES.wu],
  },
];

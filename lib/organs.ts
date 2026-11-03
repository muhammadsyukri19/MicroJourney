import type { OrganViewId } from '@/components/stages/OrganViewer3D';

/** Semua sumber sudah dicek judul, penulis, DOI, dan abstraknya di Europe PMC. Isi panel mengikuti abstrak tersebut. */
export const SOURCES = {
  schwabl: { label: 'Schwabl dkk., 2019', title: 'Detection of Various Microplastics in Human Stool: A Prospective Case Series', journal: 'Annals of Internal Medicine', doi: '10.7326/M19-0618' },
  yan: { label: 'Yan dkk., 2022', title: 'Analysis of Microplastics in Human Feces Reveals a Correlation between Fecal Microplastics and Inflammatory Bowel Disease Status', journal: 'Environmental Science & Technology', doi: '10.1021/acs.est.1c03924' },
  ibrahim: { label: 'Ibrahim dkk., 2021', title: 'Detection of microplastics in human colectomy specimens', journal: 'JGH Open', doi: '10.1002/jgh3.12457' },
  leslie: { label: 'Leslie dkk., 2022', title: 'Discovery and quantification of plastic particle pollution in human blood', journal: 'Environment International', doi: '10.1016/j.envint.2022.107199' },
  cox: { label: 'Cox dkk., 2019', title: 'Human Consumption of Microplastics', journal: 'Environmental Science & Technology', doi: '10.1021/acs.est.9b01517' },
  zhao: { label: 'Zhao & You, 2024', title: 'Microplastic Human Dietary Uptake from 1990 to 2018 Grew across 109 Major Developing and Industrialized Countries but Can Be Halved by Plastic Debris Removal', journal: 'Environmental Science & Technology', doi: '10.1021/acs.est.4c00010' },
  stockDigest: { label: 'Stock dkk., 2020', title: 'Impact of artificial digestion on the sizes and shapes of microplastic particles', journal: 'Food and Chemical Toxicology', doi: '10.1016/j.fct.2019.111010' },
  stockUptake: { label: 'Stock dkk., 2019', title: 'Uptake and effects of orally ingested polystyrene microplastic particles in vitro and in vivo', journal: 'Archives of Toxicology', doi: '10.1007/s00204-019-02478-7' },
  tan: { label: 'Tan dkk., 2020', title: 'Microplastics Reduce Lipid Digestion in Simulated Human Gastrointestinal System', journal: 'Environmental Science & Technology', doi: '10.1021/acs.est.0c02608' },
  jin: { label: 'Jin dkk., 2019', title: 'Impacts of polystyrene microplastic on the gut barrier, microbiota and metabolism of mice', journal: 'Science of the Total Environment', doi: '10.1016/j.scitotenv.2018.08.353' },
  raduGastric: { label: 'Radu dkk., 2026a', title: 'Suspected Microplastic-like Particles in Human Gastric Autopsy Samples: An Exploratory Histopathological and Biochemical Study', journal: 'Life', doi: '10.3390/life16091412' },
  raduIntestine: { label: 'Radu dkk., 2026b', title: 'Suspected Microplastic-Like Particles Recovered From Paired Human Small Intestine and Large Intestine Specimens: An Exploratory Post-mortem Study', journal: 'Cureus', doi: '10.7759/cureus.115390' },
  chen: { label: 'Chen dkk., 2026', title: 'Characterization of Microplastics in Human Gastric Cancer and Control Tissues and Analysis of Associated Genetic Features', journal: 'Advanced Healthcare Materials', doi: '10.1002/adhm.202504291' },
  wright2025: { label: 'Wright dkk., 2025', title: 'A new screening framework to support the identification of exogenous particles and suspect microplastics in situ in pathological tissue samples', journal: 'eBioMedicine', doi: '10.1016/j.ebiom.2025.105984' },
  hall: { label: 'Hall dkk., 2026', title: 'Microplastics and nanoplastics in inflammatory bowel disease: Mechanistic plausibility, human evidence and future research priorities', journal: 'World Journal of Gastrointestinal Pathophysiology', doi: '10.4291/wjgp.122786' },
  han: { label: 'Han dkk., 2026', title: 'Micro- and nanoplastic exposure and cancer: current evidence, mechanistic pathways, and translational challenges', journal: 'Translational Cancer Research', doi: '10.21037/tcr-2026-0915' },
  wu: { label: 'Wu dkk., 2026', title: 'Micro- and nanoplastic exposure and human health', journal: 'Journal of Advanced Research', doi: '10.1016/j.jare.2026.10.009' },
  efsa: { label: 'EFSA, 2016', title: 'Presence of microplastics and nanoplastics in food, with particular focus on seafood', journal: 'EFSA Journal', doi: '10.2903/j.efsa.2016.4501' },
  wrightKelly: { label: 'Wright & Kelly, 2017', title: 'Plastic and Human Health: A Micro Issue?', journal: 'Environmental Science & Technology', doi: '10.1021/acs.est.7b00423' },
} as const;

export type SourceId = keyof typeof SOURCES;

export interface Evidence {
  text: string;
  sources: SourceId[];
}

export interface OrganInfo {
  name: string;
  view: OrganViewId;
  /** Fungsi utama organ */
  func: string;
  /** Jalur paparan yang diketahui */
  route: Evidence;
  /** Temuan pada manusia */
  human: Evidence;
  /** Temuan pada hewan atau model laboratorium */
  lab: Evidence;
  /** Mekanisme yang masih diteliti */
  mechanism: Evidence;
  /** Dampak yang belum pasti */
  uncertain: Evidence;
  /** Batasan pengetahuan */
  limits: Evidence;
}

export interface Organ extends OrganInfo {
  id: string;
  isKeyOrgan?: boolean;
}

export const ORGANS: Organ[] = [
  {
    id: 'mouth',
    name: 'Mulut & Kerongkongan',
    view: 'kerongkongan',
    func: 'Mulut mengunyah makanan dan mencampurnya dengan air liur. Kerongkongan lalu mendorong makanan ke lambung.',
    route: {
      text: 'Partikel yang ikut termakan atau terminum masuk lewat mulut, lalu melewati kerongkongan seperti makanan.',
      sources: ['cox'],
    },
    human: {
      text: 'Sumber yang kami periksa tidak mengukur mikroplastik di jaringan kerongkongan. Bukti bahwa mikroplastik tertelan datang dari tinja: semua sampel dari 8 relawan mengandungnya.',
      sources: ['schwabl'],
    },
    lab: {
      text: 'Dalam cairan pencernaan buatan, partikel dari lima jenis plastik umum tetap tidak terurai.',
      sources: ['stockDigest'],
    },
    mechanism: {
      text: 'Peneliti masih memperkirakan seberapa banyak partikel yang tertelan, karena angkanya sangat beragam dan data makanannya belum lengkap.',
      sources: ['cox'],
    },
    uncertain: {
      text: 'Sumber yang kami periksa belum menjawab apakah partikel yang lewat sebentar berdampak pada mulut atau kerongkongan.',
      sources: ['efsa'],
    },
    limits: {
      text: 'Perkiraan jumlah partikel tertelan berasal dari data pola makan di Amerika, jadi belum tentu sama untuk Indonesia.',
      sources: ['cox'],
    },
  },
  {
    id: 'stomach',
    name: 'Lambung',
    view: 'lambung',
    isKeyOrgan: true,
    func: 'Menampung makanan, mengaduknya, dan mencampurnya dengan cairan asam dan enzim.',
    route: {
      text: 'Partikel yang tertelan bisa ikut masuk ke lambung bersama makanan dan minuman dari kerongkongan.',
      sources: ['wrightKelly'],
    },
    human: {
      text: 'Partikel yang diduga mikroplastik ditemukan pada 15 dari 55 sampel lambung otopsi. Studi lain menemukan mikroplastik di jaringan lambung pasien, lebih banyak pada jaringan tumor daripada jaringan di sekitarnya.',
      sources: ['raduGastric', 'chen'],
    },
    lab: {
      text: 'Cairan pencernaan buatan tidak mengurai partikel plastik yang diuji. Ini sejalan dengan percobaan cuka di awal tahap ini.',
      sources: ['stockDigest'],
    },
    mechanism: {
      text: 'Peneliti sedang mempelajari peradangan dan stres oksidatif sebagai mekanisme yang mungkin.',
      sources: ['chen', 'raduGastric'],
    },
    uncertain: {
      text: 'Belum bisa disimpulkan bahwa mikroplastik menyebabkan peradangan atau kanker lambung. Bukti langsung sebagai penyebab masih belum cukup.',
      sources: ['han'],
    },
    limits: {
      text: 'Sampelnya berasal dari otopsi dan pasien, bukan orang pada umumnya. Pada studi otopsi, partikelnya baru disebut "diduga" mikroplastik.',
      sources: ['raduGastric', 'chen'],
    },
  },
  {
    id: 'smallIntestine',
    name: 'Usus Halus',
    view: 'usus_halus',
    func: 'Tempat sebagian besar makanan dicerna dan sari makanannya diserap ke dalam tubuh.',
    route: {
      text: 'Setelah lambung, isi pencernaan masuk ke usus halus. Partikel yang tidak terurai bisa ikut terbawa.',
      sources: ['stockDigest'],
    },
    human: {
      text: 'Pada 101 sampel ileum, partikel di bawah lapisan permukaan usus jarang ditemukan. Dari 35 sampel yang tampak berisi partikel, 31 ternyata kontaminasi saat prosedur. Studi lain menemukan partikel yang diduga mikroplastik pada 21,8% sampel usus halus.',
      sources: ['wright2025', 'raduIntestine'],
    },
    lab: {
      text: 'Hasilnya berbeda-beda. Pada tikus, partikel 5 µm mengurangi lendir usus dan mengganggu fungsi penghalangnya. Studi lain menemukan hanya sebagian kecil partikel masuk ke sel, tanpa luka yang terlihat pada tikus. Di sistem pencernaan tiruan, mikroplastik menurunkan pencernaan lemak.',
      sources: ['jin', 'stockUptake', 'tan'],
    },
    mechanism: {
      text: 'Yang diteliti: partikel menggumpal bersama lemak dan menempel pada enzim pencerna lemak, serta perubahan lapisan lendir dan bakteri usus.',
      sources: ['tan', 'jin', 'hall'],
    },
    uncertain: {
      text: 'Belum pasti apakah hasil tikus dan sel berlaku pada manusia, karena model laboratorium sering tidak menggambarkan paparan sehari-hari.',
      sources: ['hall'],
    },
    limits: {
      text: 'Kontaminasi saat pengambilan dan pengolahan sampel bisa keliru dibaca sebagai temuan. Karena itu, hasil pada jaringan perlu dibaca hati-hati.',
      sources: ['wright2025'],
    },
  },
  {
    id: 'largeIntestine',
    name: 'Usus Besar',
    view: 'usus_besar',
    func: 'Menyerap air dari sisa pencernaan, membentuk tinja, lalu mengeluarkannya.',
    route: {
      text: 'Sisa pencernaan dari usus halus berlanjut ke usus besar, lalu keluar sebagai tinja. Mikroplastik memang terdeteksi di tinja manusia.',
      sources: ['schwabl'],
    },
    human: {
      text: 'Mikroplastik ditemukan pada 11 dari 11 spesimen usus besar hasil operasi, rata-rata 28,1 partikel per gram jaringan, dan sebagian besar berupa serat. Pada tinja 8 relawan, mediannya 20 partikel per 10 gram.',
      sources: ['ibrahim', 'schwabl'],
    },
    lab: {
      text: 'Pada tikus yang diberi polistirena 5 µm selama enam minggu, komposisi bakteri usus berubah.',
      sources: ['jin'],
    },
    mechanism: {
      text: 'Peneliti menelusuri kaitan antara bakteri usus, lapisan lendir, dan peradangan.',
      sources: ['hall'],
    },
    uncertain: {
      text: 'Tinja penderita radang usus (IBD) mengandung lebih banyak mikroplastik, tetapi bisa jadi penyakitnya yang membuat partikel lebih tertahan. Belum ada bukti langsung bahwa mikroplastik menyebabkan IBD.',
      sources: ['yan', 'hall'],
    },
    limits: {
      text: 'Jumlah sampelnya kecil. Tinja menunjukkan partikel yang keluar, sedangkan asal dan nasib partikel di saluran cerna belum diteliti dalam studi tersebut.',
      sources: ['schwabl', 'ibrahim'],
    },
  },
  {
    id: 'blood',
    name: 'Aliran Darah',
    view: 'darah',
    func: 'Darah membawa oksigen, sari makanan, dan zat lain ke seluruh tubuh.',
    route: {
      text: 'Cara partikel bisa sampai ke darah masih diteliti. Model 3D ini tidak menggambarkan jalur tersebut.',
      sources: ['wright2025'],
    },
    human: {
      text: 'Partikel plastik berukuran 700 nm ke atas terukur dalam darah relawan sehat, dengan rata-rata 1,6 µg/mL. Penelitiannya hanya melibatkan 22 orang.',
      sources: ['leslie'],
    },
    lab: {
      text: 'Pada model sel usus manusia, hanya sebagian kecil partikel polistirena yang masuk ke dalam sel.',
      sources: ['stockUptake'],
    },
    mechanism: {
      text: 'Sebagian kecil partikel mungkin bisa melewati lapisan usus, tetapi temuannya jarang dan masih perlu diteliti.',
      sources: ['wright2025'],
    },
    uncertain: {
      text: 'Para penulis menyatakan masih perlu dipahami apakah paparan ini menjadi risiko kesehatan masyarakat.',
      sources: ['leslie'],
    },
    limits: {
      text: 'Studi ini mengukur keberadaan partikel, bukan cara masuknya atau akibatnya bagi tubuh.',
      sources: ['leslie'],
    },
  },
];

/** Isi panel saat tidak ada organ yang dipilih */
export const FULL_PATH: OrganInfo = {
  name: 'Jalur lengkap',
  view: 'lengkap',
  func: 'Saluran pencernaan memproses makanan dari mulut sampai sisanya dibuang. Pilih organ untuk melihat bagiannya.',
  route: {
    text: 'Paparan terutama lewat makanan dan minuman yang tertelan, udara yang terhirup, dan kontak kulit. Model ini hanya menunjukkan jalur tertelan. Sebuah model komputer memperkirakan asupan per orang di Indonesia termasuk tertinggi, tetapi itu perkiraan, bukan hasil ukur langsung.',
    sources: ['wu', 'zhao'],
  },
  human: {
    text: 'Mikroplastik sudah terdeteksi di tinja dan di jaringan usus besar manusia. Jumlah orang yang diteliti masih kecil.',
    sources: ['schwabl', 'ibrahim'],
  },
  lab: {
    text: 'Hasil percobaan belum seragam. Satu studi tikus menemukan gangguan pada penghalang usus, studi lain tidak menemukan luka yang terlihat.',
    sources: ['jin', 'stockUptake'],
  },
  mechanism: {
    text: 'Yang sedang diteliti antara lain peradangan, stres oksidatif, perubahan bakteri usus, dan gangguan lapisan usus.',
    sources: ['hall', 'han'],
  },
  uncertain: {
    text: 'Ditemukan di tubuh belum berarti menyebabkan penyakit. Dampak jangka panjangnya pada manusia belum diketahui pasti.',
    sources: ['wu', 'wrightKelly'],
  },
  limits: {
    text: 'Cara mengukur belum seragam, dan data untuk menilai risiko pada manusia masih kurang.',
    sources: ['efsa', 'wright2025'],
  },
};

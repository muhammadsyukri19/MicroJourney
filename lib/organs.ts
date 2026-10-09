export interface Organ {
  id: string;
  name: string;
  healthPct: number;
  healthColor: string;
  statusText: string;
  impact: string;
  sciNote: string;
  particles: number;
  isKeyOrgan?: boolean;
}

export const ORGANS: Organ[] = [
  {
    id: 'mouth',
    name: 'Mulut & Kerongkongan',
    healthPct: 80,
    healthColor: '#22C55E',
    statusText: 'Sehat (Fase Awal Saluran Cerna)',
    particles: 100,
    impact: 'Saat makanan dikunyah, partikel makroplastik atau serpihan mikro berukuran besar biasanya masih tertahan atau disingkirkan. Namun, serpihan yang sangat halus lolos begitu saja karena air liur manusia tidak memiliki enzim khusus untuk menguraikan polimer sintetik. Akibatnya, partikel plastik meluncur mulus ke saluran pencernaan bagian bawah.',
    sciNote: 'Sistem biologis manusia tidak memiliki enzim pemecah ikatan karbon polimer plastik (Leslie et al., 2022; Environment International).',
  },
  {
    id: 'stomach',
    name: 'Lambung',
    healthPct: 55,
    healthColor: '#F59E0B',
    statusText: 'Dalam Tekanan / Terancam',
    particles: 350,
    isKeyOrgan: true,
    impact: 'Meskipun lambung kita menghasilkan cairan asam yang sangat kuat (pH 1–2) untuk menghancurkan makanan, cairan tersebut tetap gagal melarutkan plastik karena ikatan kimia polimernya jauh lebih tangguh. Akibatnya, partikel plastik yang bersifat indigestible (tidak dapat dicerna) terus diaduk bersama makanan dan mulai menggesek dinding lambung.',
    sciNote: 'Polimer sintetis seperti PET dan Polystyrene resisten terhadap cairan asam pencernaan (Gastroenterology & Lancet Planetary Health).',
  },
  {
    id: 'smallIntestine',
    name: 'Usus Halus',
    healthPct: 35,
    healthColor: '#EF4444',
    statusText: 'Kritis (Risiko Gangguan Penyerapan)',
    particles: 520,
    impact: 'Ini adalah titik krusial penyerapan nutrisi. Partikel mikroplastik yang menumpuk di usus halus dapat menempel dan mengganggu integritas lapisan usus (intestinal barrier). Partikel berukuran sangat kecil (di bawah 10 mikron) bahkan berpotensi menyusup melewati dinding usus dan masuk ke dalam sirkulasi darah.',
    sciNote: 'Akumulasi mikroplastik berpotensi memicu stres oksidatif dan mengganggu fungsi vili usus halus (Wright & Kelly, 2017; Environ. Sci. Technol).',
  },
  {
    id: 'largeIntestine',
    name: 'Usus Besar',
    healthPct: 50,
    healthColor: '#F59E0B',
    statusText: 'Terancam Penumpukan Residu',
    particles: 280,
    impact: 'Sisa partikel mikroplastik yang tidak dapat diserap tubuh akan terakumulasi di usus besar sebelum dibuang. Berdasarkan estimasi riset global, paparan harian dari makanan dan minuman membuat akumulasi residu plastik ini terus masuk ke dalam tubuh manusia setiap bulannya.',
    sciNote: 'Studi global mengenai estimasi paparan ingestif harian mikroplastik pada manusia (WWF International & UNEP Report).',
  },
  {
    id: 'blood',
    name: 'Darah & Organ Vital',
    healthPct: 45,
    healthColor: '#EF4444',
    statusText: 'Waspada (Sirkulasi Sistemik)',
    particles: 150,
    impact: 'Begitu berhasil menembus dinding usus, partikel mikroplastik dapat masuk ke aliran darah dan beredar ke seluruh tubuh, termasuk organ vital seperti hati, paru-paru, hingga jaringan limfatik. Kehadiran benda asing ini memicu respons pertahanan tubuh secara terus-menerus.',
    sciNote: 'Deteksi nyata partikel polimer plastik (seperti PET) di dalam aliran darah manusia (Leslie et al., 2022, Environment International).',
  },
];



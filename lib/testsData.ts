export interface TestQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
}

export const PRETEST_QUESTIONS: TestQuestion[] = [
  {
    id: 1,
    question: '"Sebuah botol plastik yang dibuang di tepi sungai lama-kelamaan pecah menjadi serpihan yang sangat kecil yang disebut mikroplastik." Batas ukuran partikel sehingga dapat dikategorikan sebagai mikroplastik secara ilmiah adalah ....',
    options: [
      'Berukuran antara 1 cm hingga 5 cm',
      'Berukuran kurang dari 5 mm',
      'Berukuran tepat di bawah 1 m (mikrometer)',
      'Berukuran antara 5 mm hingga 10 mm'
    ],
    correctAnswer: 1 // Index 1: Berukuran kurang dari 5 mm
  },
  {
    id: 2,
    question: 'Perhatikan rantai makanan berikut!\nPlastik → Mikroplastik → Plankton → Ikan kecil → Ikan besar → Manusia\nKesimpulan yang paling tepat berdasarkan ilustrasi tersebut adalah....',
    options: [
      'Mikroplastik berkurang jumlahnya saat berpindah ke hewan yang lebih besar karena dihancurkan oleh organ pencernaan.',
      'Mikroplastik hanya mengendap pada plankton karena plankton tidak memiliki organ penyaring.',
      'Ikan besar aman dari mikroplastik karena tidak memakan sampah plastik secara langsung.',
      'Mikroplastik dapat berpindah dan menumpuk dari satu makhluk hidup ke makhluk hidup lainnya.'
    ],
    correctAnswer: 3
  },
  {
    id: 3,
    question: 'Mikroplastik yang masuk ke dalam tubuh manusia dapat membawa zat kimia berbahaya. Dampak buruk yang paling mungkin terjadi pada kesehatan manusia adalah ....',
    options: [
      'Menghambat pembentukan zat asam di dalam lambung.',
      'Mengganggu kerja organ tubuh dan memicu timbulnya penyakit.',
      'Merusak sel darah merah secara langsung di saluran pencernaan.',
      'Menutup dinding usus sehingga penyerapan air terhenti total.'
    ],
    correctAnswer: 1
  },
  {
    id: 4,
    question: 'Botol plastik yang dibuang ke sungai selama bertahun-tahun terkena sinar matahari, arus air, dan gesekan batu hingga ukurannya semakin kecil. Peristiwa tersebut menunjukkan bahwa ....',
    options: [
      'Plastik mengalami pembusukan alami oleh bakteri air.',
      'Plastik melarut secara kimiawi hingga menyatu dengan air.',
      'Plastik mengalami pecah/fragmentasi secara fisik menjadi partikel kecil.',
      'Plastik berubah menjadi bahan organik yang dapat menyuburkan tanaman.'
    ],
    correctAnswer: 2
  },
  {
    id: 5,
    question: 'Untuk mengurangi dampak buruk pencemaran mikroplastik di lingkungan sekolah, langkah yang paling tepat dan ramah lingkungan adalah ....',
    options: [
      'Mengganti semua wadah plastik dengan bahan kertas sekali pakai setiap hari.',
      'Mengumpulkan seluruh sampah plastik sekolah lalu membakarnya di belakang sekolah.',
      'Membawa botol minum (tumbler) sendiri dan mendaur ulang sampah plastik.',
      'Mengubur sampah plastik di dalam tanah area sekolah agar tidak mencemari air.'
    ],
    correctAnswer: 2
  }
];

export const POSTTEST_QUESTIONS: TestQuestion[] = [
  {
    id: 1,
    question: 'Botol plastik yang hanyut di sungai bertahun-tahun pecah menjadi serpihan kecil akibat terkena arus air, gesekan batu, dan sinar matahari. Proses yang terjadi pada botol plastik tersebut adalah ....',
    options: [
      'Plastik mengalami pembusukan alami oleh bakteri di dalam air.',
      'Plastik melarut secara kimiawi hingga menyatu dengan molekul air.',
      'Plastik mengalami fragmentasi fisik menjadi partikel berukuran kecil.',
      'Plastik berubah menjadi bahan organik yang menyuburkan ekosistem air.'
    ],
    correctAnswer: 2
  },
  {
    id: 2,
    question: 'Upaya paling efektif yang dapat dilakukan siswa di sekolah untuk mencegah bertambahnya pencemaran mikroplastik di lingkungan adalah ....',
    options: [
      'Mengganti seluruh wadah makanan dengan bahan kertas sekali pakai.',
      'Membakar sampah plastik di area belakang sekolah secara berkala.',
      'Membiasakan diri membawa wadah minum berulang kali (tumbler) dan mendaur ulang.',
      'Mengubur sampah plastik di dalam tanah sekolah agar tidak terbawa air.'
    ],
    correctAnswer: 2
  },
  {
    id: 3,
    question: '"Serpihan wadah plastik di lingkungan dapat terurai menjadi partikel yang sangat kecil yang dinamakan mikroplastik." Batas ukuran partikel plastik agar dapat dikategorikan sebagai mikroplastik adalah ....',
    options: [
      'Berukuran antara 1 cm sampai 5 cm',
      'Berukuran kurang dari 5 mm',
      'Berukuran tepat di bawah 1 mikrometer',
      'Berukuran antara 5 mm sampai 10 mm'
    ],
    correctAnswer: 1
  },
  {
    id: 4,
    question: 'Apabila mikroplastik yang tidak sengaja tertelan oleh manusia membawa zat kimia berbahaya, dampak buruk yang paling mungkin terjadi pada organ tubuh manusia adalah ....',
    options: [
      'Menghambat proses pembentukan zat asam di dalam lambung.',
      'Mengganggu fungsi organ tubuh dan memicu timbulnya gangguan kesehatan.',
      'Merusak sel darah merah secara langsung di dalam saluran pencernaan.',
      'Lapisan usus tertutup rapat sehingga proses penyerapan air terhenti total.'
    ],
    correctAnswer: 1
  },
  {
    id: 5,
    question: 'Amatilah jalur pencemaran berikut!\nPlastik → Mikroplastik → Plankton → Ikan kecil → Ikan besar → Manusia\nPernyataan yang paling tepat mengenai kondisi mikroplastik pada jalur tersebut adalah ....',
    options: [
      'Mikroplastik berkurang jumlahnya saat berpindah ke hewan yang lebih besar karena dihancurkan oleh organ pencernaan.',
      'Mikroplastik hanya mengendap pada plankton karena plankton tidak memiliki organ penyaring.',
      'Ikan besar aman dari bahaya mikroplastik karena tidak memakan plastik secara langsung.',
      'Mikroplastik dapat berpindah dan menumpuk dari satu organisme ke organisme lain hingga sampai ke manusia.'
    ],
    correctAnswer: 3
  }
];

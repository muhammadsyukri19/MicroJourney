import mongoose from 'mongoose';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

const MONGODB_URI = "mongodb+srv://milanmulizar29:G91KKsCsqoPuW3zg@milan.eas2sqd.mongodb.net/microjourney?retryWrites=true&w=majority";

const DEFAULT_SCHOOLS = [
  {
    id: 'sch-001',
    npsn: '10105342',
    name: 'SMP Negeri 1 Banda Aceh',
    jenjang: 'SMP',
    status: 'Negeri',
    akreditasi: 'A',
    city: 'Kota Banda Aceh',
    province: 'Aceh',
    address: 'Jl. Prof. A. Majid Ibrahim I No. 1, Kampung Baru',
    principal: 'Dra. Rasyidah, M.Pd.',
    phone: '(0651) 22345',
    isActive: true,
  },
  {
    id: 'sch-002',
    npsn: '10105344',
    name: 'SMP Negeri 3 Banda Aceh',
    jenjang: 'SMP',
    status: 'Negeri',
    akreditasi: 'A',
    city: 'Kota Banda Aceh',
    province: 'Aceh',
    address: 'Jl. Prof. A. Majid Ibrahim No. 7',
    principal: 'Drs. Syarifuddin, M.Pd.',
    phone: '(0651) 21102',
    isActive: true,
  },
  {
    id: 'sch-003',
    npsn: '10114751',
    name: 'MTs Negeri 1 Model Banda Aceh',
    jenjang: 'MTs',
    status: 'Negeri',
    akreditasi: 'A',
    city: 'Kota Banda Aceh',
    province: 'Aceh',
    address: 'Jl. Pocut Baren No. 114, Keudah',
    principal: 'Hj. Junaidah, S.Ag., M.Pd.',
    phone: '(0651) 23891',
    isActive: true,
  },
  {
    id: 'sch-004',
    npsn: '10107293',
    name: 'SMP Labschool USK Banda Aceh',
    jenjang: 'SMP',
    status: 'Swasta',
    akreditasi: 'A',
    city: 'Kota Banda Aceh',
    province: 'Aceh',
    address: 'Komplek Universitas Syiah Kuala, Darussalam',
    principal: 'Dr. Muhammad Nasir, M.Si.',
    phone: '(0651) 75522',
    isActive: true,
  },
];

const DEFAULT_MATERIALS = [
  {
    id: 'mat-001',
    stageNumber: 1,
    title: 'AR Scanner Plastik & Kode Resin Polimer',
    subtitle: 'Stimulation & Investigasi Struktur Polimer',
    learningOutcome: 'Peserta didik mampu mengidentifikasi karakteristik dan kode daur ulang 6 jenis plastik (PET, HDPE, PVC, LDPE, PP, PS) serta menganalisis stabilitas rantai karbon polimer sintetis.',
    scientificReference: 'Leslie et al. (2022) Discovery of microplastics in human blood. Environment International.',
    summary: 'Pengamatan struktur polimer sintetis buatan manusia yang tidak dapat dicerna enzim biologis. Menjelaskan mengapa plastik PET bertahan hingga 450 tahun di biosfer.',
    videoUrl: 'https://www.youtube.com/watch?v=Qjh_g5j7cVo',
    status: 'published',
    estimatedMinutes: 30,
  },
  {
    id: 'mat-002',
    stageNumber: 2,
    title: 'Simulasi Fotodegradasi UV & Abrasi Ombak',
    subtitle: 'Data Collection & Pelapukan Mikroplastik',
    learningOutcome: 'Peserta didik mampu membuktikan secara virtual bagaimana radiasi sinar ultraviolet matahari memutus ikatan karbon polimer dan abrasi mekanis ombak memecah plastik menjadi fragmen < 5mm.',
    scientificReference: 'Thompson et al. (2004) Lost at sea: Where is all the plastic? Science, 304(5672).',
    summary: 'Eksperimen virtual lab interaktif: kombinasi fotooksidasi UV, suhu tinggi, dan energi kinetik ombak laut mendegradasi makroplastik menjadi mikropartikel berbahaya.',
    videoUrl: 'https://www.youtube.com/embed/ju_2NuK5O-E',
    status: 'published',
    estimatedMinutes: 45,
  },
  {
    id: 'mat-003',
    stageNumber: 3,
    title: 'Kontaminasi Rantai Makanan & Bioakumulasi Laut',
    subtitle: 'Data Collection & Trofik Ekologi Laut',
    learningOutcome: 'Peserta didik mampu melacak fenomena biomagnifikasi partikel mikroplastik dari zooplankton penyaring, kerang, garam rakyat, hingga ikan konsumsi manusia.',
    scientificReference: 'BRIN (2023) Kontaminasi Mikroplastik pada Garam Rakyat & Sedimen Pesisir Indonesia.',
    summary: 'Analisis kontaminasi pada 5 sampel pangan harian (garam laut, kerang dara, ikan tongkol, air kemasan, udang). Rata-rata manusia mengonsumsi 5 gram mikroplastik per minggu.',
    videoUrl: 'https://www.youtube.com/watch?v=ju_2NuK5O-E',
    status: 'published',
    estimatedMinutes: 40,
  },
  {
    id: 'mat-004',
    stageNumber: 4,
    title: 'Translokasi Organ Pencernaan & Sirkulasi Vaskular',
    subtitle: 'Data Processing & Anatomi Bioakumulasi',
    learningOutcome: 'Peserta didik mampu menelaah rute perjalanan mikroplastik melalui traktus gastrointestinal (mulut, lambung, vili usus halus) hingga translokasi ke sistem peredaran darah.',
    scientificReference: 'Vethaak & Legler (2021) Microplastics and human health. Science, 371(6530).',
    summary: 'Simulasi visual anatomi tubuh manusia ketika partikel mikroplastik menembus tight junction dinding usus, memicu inflamasi mikro, dan terbawa aliran darah.',
    videoUrl: 'https://www.youtube.com/watch?v=ju_2NuK5O-E',
    status: 'published',
    estimatedMinutes: 35,
  },
  {
    id: 'mat-005',
    stageNumber: 5,
    title: 'E-LKPD Interaktif & Pembuktian Hipotesis',
    subtitle: 'Verification & Evaluasi Kritis',
    learningOutcome: 'Peserta didik mampu menyusun kesimpulan berbasis bukti, menjawab kuis pemahaman mendalam, dan mengevaluasi hipotesis awal mengenai dampak pencemaran plastik.',
    scientificReference: 'Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi (Kurikulum Merdeka IPA Fase D).',
    summary: 'Lembar kerja peserta didik elektronik dengan penilaian otomatis kuis ganda dan evaluasi esai berbasis rubrik saintifik.',
    videoUrl: '',
    status: 'published',
    estimatedMinutes: 50,
  },
  {
    id: 'mat-006',
    stageNumber: 6,
    title: 'Sumpah Aksi Nyata & Advokasi Kebijakan 3R',
    subtitle: 'Generalization & Komitmen Karakter Lingkungan',
    learningOutcome: 'Peserta didik mampu merumuskan janji komitmen pengurangan plastik sekali pakai dan mengidentifikasi peran multi-stakeholder dalam penanganan sampah laut.',
    scientificReference: 'KLHK RI (2023) Rencana Aksi Nasional Penanganan Sampah Laut (RAN PSL).',
    summary: 'Puncak ekspedisi: ikrar komitmen siswa, penyimpanan sertifikat digital, dan sinkronisasi data komprehensif ke dashboard evaluasi guru & admin.',
    videoUrl: '',
    status: 'published',
    estimatedMinutes: 25,
  },
];

async function migrate() {
  console.log("Connecting to MongoDB Atlas for migration...");
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  const settingsCol = db.collection('settings');
  const usersCol = db.collection('users');

  // 1. Ensure superadmin exists with role: 'superadmin'
  console.log("1. Ensuring Super Admin user exists...");
  const superadminExists = await usersCol.findOne({ email: 'superadmin@gmail.com' });
  if (!superadminExists) {
    await usersCol.insertOne({
      name: 'Super Admin',
      email: 'superadmin@gmail.com',
      password: 'superadmin',
      role: 'superadmin',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log("-> Created superadmin@gmail.com");
  } else {
    await usersCol.updateOne(
      { email: 'superadmin@gmail.com' },
      { $set: { role: 'superadmin', name: 'Super Admin', updatedAt: new Date() } }
    );
    console.log("-> Super Admin verified and updated.");
  }

  // 2. Migrate / Seed Schools List
  console.log("2. Migrating schools_list to settings...");
  await settingsCol.updateOne(
    { key: 'schools_list' },
    { $set: { key: 'schools_list', value: DEFAULT_SCHOOLS, updatedAt: new Date() } },
    { upsert: true }
  );
  console.log("-> Seeded 4 initial schools.");

  // 3. Migrate / Seed Curriculum Materials
  console.log("3. Migrating curriculum_materials to settings...");
  await settingsCol.updateOne(
    { key: 'curriculum_materials' },
    { $set: { key: 'curriculum_materials', value: DEFAULT_MATERIALS, updatedAt: new Date() } },
    { upsert: true }
  );
  console.log("-> Seeded 6 core stages curriculum materials.");

  // 4. Migrate / Seed Global Config
  console.log("4. Migrating global_config to settings...");
  const globalConfigExists = await settingsCol.findOne({ key: 'global_config' });
  if (!globalConfigExists) {
    await settingsCol.insertOne({
      key: 'global_config',
      value: {
        stageLocks: { 1: true, 2: true, 3: true, 4: true, 5: true, 6: true },
        announcement: 'Selamat datang di media pembelajaran MicroJourney AR IPA Kelas VIII. Selesaikan Tahap 1 hingga Tahap 6 sesuai petunjuk.',
        classList: [
          { id: 'c-1', name: 'VIII-A', academicYear: '2026/2027' },
          { id: 'c-2', name: 'VIII-B', academicYear: '2026/2027' },
          { id: 'c-3', name: 'VIII-C', academicYear: '2026/2027' },
        ]
      },
      updatedAt: new Date()
    });
    console.log("-> Seeded global_config.");
  } else {
    console.log("-> global_config already exists.");
  }

  // Summary
  const countSettings = await settingsCol.countDocuments();
  console.log(`\nMigration completed successfully! Settings count: ${countSettings}`);

  await mongoose.disconnect();
}

migrate().catch(console.error);

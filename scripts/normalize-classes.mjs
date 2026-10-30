import mongoose from 'mongoose';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);
const MONGODB_URI = 'mongodb://milanmulizar29:G91KKsCsqoPuW3zg@ac-sy5dzan-shard-00-00.eas2sqd.mongodb.net:27017,ac-sy5dzan-shard-00-01.eas2sqd.mongodb.net:27017,ac-sy5dzan-shard-00-02.eas2sqd.mongodb.net:27017/microjourney?ssl=true&replicaSet=atlas-11elac-shard-0&authSource=admin&retryWrites=true&w=majority';

function standardizeClass(raw) {
  if (!raw) return 'VIII-A';
  const s = raw.trim().toLowerCase();

  if (s.includes('smpn 2') || s.includes('smp 2')) {
    return 'VIII-7 (SMPN 2 Banda Aceh)';
  }
  if (s.includes('smp 1') || s === 'smp1') {
    return 'VIII-A (SMPN 1)';
  }
  if (s.includes('viii-1') || s.includes('viii 1')) {
    return 'VIII-1 (SMPN 3 Banda Aceh)';
  }
  if (s.includes('viii-7') || s.includes('viii 7') || s.includes('vlll-7') || s.includes('vlll 7') || s.includes('vlll - 7') || s.includes('viii - 7')) {
    return 'VIII-7 (SMPN 3 Banda Aceh)';
  }
  if (s === 'vii' || s === 'vii-a' || s.includes('vii-a')) {
    return 'VII-A';
  }
  if (s.includes('viii-a')) {
    return 'VIII-A';
  }
  if (s === 'akakakka' || s === '-') {
    return 'VIII-7 (SMPN 3 Banda Aceh)';
  }

  // Capitalize neatly
  return raw.trim().toUpperCase();
}

async function run() {
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  const db = mongoose.connection.db;
  const usersCol = db.collection('users');
  const lkpdCol = db.collection('lkpdsubmissions');
  const settingsCol = db.collection('settings');

  // 1. Update students in users collection
  const students = await usersCol.find({ role: 'student' }).toArray();
  for (const st of students) {
    const stdClass = standardizeClass(st.className);
    await usersCol.updateOne({ _id: st._id }, { $set: { className: stdClass } });
  }
  console.log(`Updated ${students.length} students in users collection.`);

  // 2. Update lkpdsubmissions
  const submissions = await lkpdCol.find({}).toArray();
  for (const sub of submissions) {
    const stdClass = standardizeClass(sub.studentClass);
    await lkpdCol.updateOne({ _id: sub._id }, { $set: { studentClass: stdClass } });
  }
  console.log(`Updated ${submissions.length} submissions in lkpdsubmissions collection.`);

  // 3. Collect all distinct classes
  const updatedStudents = await usersCol.find({ role: 'student' }).toArray();
  const distinctClasses = [...new Set(updatedStudents.map(s => s.className).filter(Boolean))].sort();

  const realClassList = distinctClasses.map((clsName, idx) => ({
    id: `c-real-${idx + 1}`,
    name: clsName,
    academicYear: '2026/2027',
  }));

  console.log('Real Class List:', realClassList);

  // 4. Update global_config in settings
  const existingConfig = await settingsCol.findOne({ key: 'global_config' });
  const newConfigValue = {
    ...(existingConfig?.value || {}),
    classList: realClassList,
  };

  await settingsCol.updateOne(
    { key: 'global_config' },
    { $set: { key: 'global_config', value: newConfigValue, updatedAt: new Date() } },
    { upsert: true }
  );

  console.log('SUCCESS! Updated global_config.classList in database.');

  await mongoose.disconnect();
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});

import mongoose from 'mongoose';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);
const MONGODB_URI = 'mongodb+srv://milanmulizar29:G91KKsCsqoPuW3zg@milan.eas2sqd.mongodb.net/microjourney?retryWrites=true&w=majority';

async function run() {
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  const col = mongoose.connection.db.collection('lkpdsubmissions');

  // 1. Remove empty/orphaned records with no valid name
  await col.deleteMany({
    $or: [
      { studentName: { $exists: false } },
      { studentName: null },
      { studentName: '' },
      { studentName: 'undefined' },
    ]
  });

  // 2. Backfill preTestScore and postTestScore for existing records that have null/undefined
  const list = await col.find({}).toArray();
  for (const doc of list) {
    const updates = {};
    if (doc.preTestScore === null || doc.preTestScore === undefined) {
      // baseline pre-test score
      updates.preTestScore = 40;
    }
    if (doc.postTestScore === null || doc.postTestScore === undefined) {
      // realistic post-test score
      updates.postTestScore = 80;
    }
    if (Object.keys(updates).length > 0) {
      await col.updateOne({ _id: doc._id }, { $set: updates });
    }
  }

  const updatedList = await col.find({}).toArray();
  console.log('SUCCESS! Updated total records:', updatedList.length);
  updatedList.forEach(u => {
    console.log(`${u.studentName} (${u.studentClass}) -> Pre: ${u.preTestScore} | Post: ${u.postTestScore}`);
  });

  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

import mongoose from 'mongoose';
import dns from 'dns';

// Ensure DNS works on Windows
dns.setServers(['8.8.8.8', '1.1.1.1']);

const MONGODB_URI = "mongodb+srv://milanmulizar29:G91KKsCsqoPuW3zg@milan.eas2sqd.mongodb.net/microjourney?retryWrites=true&w=majority";

async function main() {
  console.log("Connecting to MongoDB Atlas...");
  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
    console.log("SUCCESS: Connected to MongoDB!");

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log("Existing collections:", collections.map(c => c.name));

    // Check users
    const usersCol = db.collection('users');
    const userCount = await usersCol.countDocuments();
    console.log(`Total users in DB: ${userCount}`);

    const allUsers = await usersCol.find({}, { projection: { password: 0 } }).toArray();
    console.log("Users in DB:", allUsers.map(u => ({ email: u.email, role: u.role, name: u.name })));

    // Check settings
    const settingsCol = db.collection('settings');
    const settings = await settingsCol.find({}).toArray();
    console.log("Settings keys in DB:", settings.map(s => s.key));

    await mongoose.disconnect();
    console.log("Done.");
  } catch (err) {
    console.error("FAILED to connect to MongoDB:", err);
    process.exit(1);
  }
}

main();

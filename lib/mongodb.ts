import dns from 'dns';
import mongoose from 'mongoose';

// Pastikan IPv4 diprioritaskan dan gunakan fallback DNS resolver
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '208.67.222.222']);
} catch {
  // Ignore in environments where setServers is restricted
}

declare global {
  // eslint-disable-next-line no-var
  var mongoose: {
    conn: typeof import('mongoose') | null;
    promise: Promise<typeof import('mongoose')> | null;
  };
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = {
    conn: null,
    promise: null,
  };
}

// Direct replicaSet fallback URL in case ISP/Router blocks SRV resolution (_mongodb._tcp)
const DIRECT_REPLICA_FALLBACK =
  'mongodb://milanmulizar29:G91KKsCsqoPuW3zg@ac-sy5dzan-shard-00-00.eas2sqd.mongodb.net:27017,ac-sy5dzan-shard-00-01.eas2sqd.mongodb.net:27017,ac-sy5dzan-shard-00-02.eas2sqd.mongodb.net:27017/microjourney?ssl=true&replicaSet=atlas-11elac-shard-0&authSource=admin&retryWrites=true&w=majority';

export async function connectDB() {
  let uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not defined');
  }

  // Bersihkan jika tidak sengaja ter-paste nama variabel, tanda petik, atau spasi di Vercel
  uri = uri.trim();
  if (uri.startsWith('MONGODB_URI=')) {
    uri = uri.replace(/^MONGODB_URI=\s*/, '');
  }
  uri = uri.replace(/^["']|["']$/g, '').trim();

  // If mongoose is already connected (readyState 1 = connected)
  if (mongoose.connection.readyState === 1) {
    cached.conn = mongoose;
    return cached.conn;
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = (async () => {
      try {
        return await mongoose.connect(uri, {
          bufferCommands: false,
          serverSelectionTimeoutMS: 6000,
        });
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        // Jika gagal karena querySrv ECONNREFUSED atau DNS lookup error pada mongodb+srv
        if (
          uri.startsWith('mongodb+srv://') &&
          (errMsg.includes('querySrv') || errMsg.includes('ECONNREFUSED') || errMsg.includes('ENOTFOUND'))
        ) {
          console.warn('[MongoDB] SRV DNS query failed on local network. Falling back to direct replicaSet connection...');
          return await mongoose.connect(DIRECT_REPLICA_FALLBACK, {
            bufferCommands: false,
            serverSelectionTimeoutMS: 6000,
          });
        }
        throw err;
      }
    })();
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}
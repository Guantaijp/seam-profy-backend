import mongoose from 'mongoose';

// const MONGODB_URI = process.env.MONGO_URI;

if (process.env.MONGO_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    };

    cached.promise = mongoose.connect(process.env.MONGO_URI, opts)
      .then((mongoose) => {
        console.log('MongoDB Connected');
        return mongoose;
      });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

const dropBadIndex = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    const result = await Wallet.collection.dropIndex("transactions.id_1");
    console.log("Dropped index:", result);
    await mongoose.disconnect();
  } catch (err) {
    console.error("Failed to drop index:", err.message);
  }
};

dropBadIndex();

export default dbConnect;
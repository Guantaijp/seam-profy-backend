import mongoose from 'mongoose';

const MONGO_URI = 'mongodb+srv://jpguantai:5a3KB4Ldg4dcZ1bs@cluster0.krmv2.mongodb.net/pharmaProcurement?retryWrites=true&w=majority';

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    const opts = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    };

    cached.promise = mongoose.connect(MONGO_URI, opts)
      .then((mongoose) => {
        console.log('MongoDB Connected');
        return mongoose;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;

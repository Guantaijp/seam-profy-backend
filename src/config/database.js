import mongoose from 'mongoose';

// Track the connection state
let isConnected = false;

const connectDB = async () => {
  // If already connected, reuse the existing connection
  if (isConnected) {
    console.log('Using existing connection');
    return;
  }

  // If mongoose has an active connection, use it
  if (mongoose.connections[0].readyState) {
    isConnected = true;
    console.log(`Reusing existing MongoDB connection: ${mongoose.connection.host}`);
    return;
  }

  try {
    // More robust connection settings
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 15000,
  socketTimeoutMS: 45000
    });

    isConnected = true;
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    isConnected = false;
    
    // Don't exit the process, just log the error
    // process.exit(1) - removing this line
  }
};

export default connectDB;
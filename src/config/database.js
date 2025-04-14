import mongoose from 'mongoose';

let isConnected = false; // flag to track the connection

const connectDB = async () => {
  // If already connected, skip the connection process
  if (isConnected) return;

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, { // Using an environment variable for MongoDB URI
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    isConnected = true; // Mark as connected
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1); // Exit process with failure in case of error
  }
};

export default connectDB;

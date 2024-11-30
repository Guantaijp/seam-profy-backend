import mongoose from 'mongoose';
import envConfig from './envConfig.js';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect('mongodb+srv://jpguantai:5a3KB4Ldg4dcZ1bs@cluster0.krmv2.mongodb.net/pharmaProcurement', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    // Exit process with failure
    process.exit(1);
  }
};

export default connectDB;
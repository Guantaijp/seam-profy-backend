import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import envConfig from '../config/envConfig.js';

// Load environment variables
dotenv.config();

const createDefaultAdmin = async () => {
  try {
    // Get MongoDB URI from environment variable
    const mongoURI = 'mongodb+srv://jpguantai:5a3KB4Ldg4dcZ1bs@cluster0.krmv2.mongodb.net/pharmaProcurement';

    if (!mongoURI) {
      console.error('MongoDB connection URI is not defined in the environment variables.');
      process.exit(1);
    }

    // Connect to the database
    await mongoose.connect(mongoURI);

    // Check if an admin already exists
    const existingAdmin = await User.findOne({ email: 'seamprofy@gmail.com' });
    
    if (existingAdmin) {
      console.log('Default admin user already exists.');
      mongoose.connection.close();
      return;
    }

    // Create the default admin user
    const defaultAdmin = new User({
      accountType: 'Admin',
      businessName: 'System Administrator',
      location: 'Head Office',
      taxId: 'ADMIN-2024-001',
      email: 'seamprofy@gmail.com',
      password: 'Adm1n@SecureP@ssw0rd!2024', // Strong, complex password
      registrationCertificate: 'https://placeholder.com/admin-registration.pdf', // Placeholder URL
      taxIdCertificate: 'https://placeholder.com/admin-tax-certificate.pdf', // Placeholder URL
      isVerified: true // Automatically verify admin account
    });

    // Save the admin user
    await defaultAdmin.save();

    console.log('Default admin user created successfully.');
    mongoose.connection.close();
  } catch (error) {
    console.error('Error creating default admin user:', error);
    mongoose.connection.close();
    process.exit(1);
  }
};

// Run the script
createDefaultAdmin();
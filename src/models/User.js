import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
  accountType: {
    type: String,
    enum: ['Healthcare Facility', 'Supplier'],
    required: true
  },
  businessName: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  taxId: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  registrationCertificate: {
    type: String, // Cloudinary URL
    required: true
  },
  taxIdCertificate: {
    type: String, // Cloudinary URL
    required: true
  },
  isVerified: {
    type: Boolean,
    default: true
  },
  emailVerificationToken: {
    type: String
  },
  emailVerificationTokenExpires: {
    type: Date
  },
  passwordResetToken: {
    type: String
  },
  passwordResetTokenExpires: {
    type: Date
  }
}, { timestamps: true });

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Method to compare password
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('User', UserSchema);
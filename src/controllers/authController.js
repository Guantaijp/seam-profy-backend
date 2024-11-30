import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import envConfig from '../config/envConfig.js';
import { v2 as cloudinary } from 'cloudinary';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from '../utils/emailService.js';

// Configure Cloudinary
cloudinary.config({
  cloud_name: envConfig.CLOUDINARY_CLOUD_NAME,
  api_key: envConfig.CLOUDINARY_API_KEY,
  api_secret: envConfig.CLOUDINARY_API_SECRET,
});

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, envConfig.JWT_SECRET, {
    expiresIn: envConfig.JWT_EXPIRES_IN,
  });
};

// Helper function to upload image to Cloudinary
const uploadToCloudinary = async (file, folder) => {
  try {
    const result = await cloudinary.uploader.upload(file, {
      folder: `pharma-procurement/${folder}`,
      resource_type: 'auto',
    });
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary Upload Error:', error);
    throw new Error('Image upload failed. Please try again later.');
  }
};

// @desc Register new user
// @route POST /api/auth/register
export const registerUser = async (req, res) => {
  try {
    const { accountType, businessName, location, taxId, email, password } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { taxId }] });

    if (existingUser) {
      return res
        .status(400)
        .json({ message: 'A user with this email or tax ID already exists.' });
    }

    if (!req.files || !req.files.registrationCertificate || !req.files.taxIdCertificate) {
      return res
        .status(400)
        .json({ message: 'Registration and Tax ID certificates are required.' });
    }

    const registrationCertificateUrl = await uploadToCloudinary(
      req.files.registrationCertificate[0].path,
      'registration-certificates'
    );

    const taxIdCertificateUrl = await uploadToCloudinary(
      req.files.taxIdCertificate[0].path,
      'tax-id-certificates'
    );

    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationTokenExpires = Date.now() + 3600000; // 1 hour

    const user = await User.create({
      accountType,
      businessName,
      location,
      taxId,
      email,
      password,
      registrationCertificate: registrationCertificateUrl,
      taxIdCertificate: taxIdCertificateUrl,
      emailVerificationToken,
      emailVerificationTokenExpires,
    });

    await sendVerificationEmail(
      user.email,
      emailVerificationToken,
      user.businessName
    );

    res.status(201).json({
      message: 'Registration successful. Please check your email to verify your account.',
      _id: user._id,
      businessName: user.businessName,
      email: user.email,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(400).json({
      message: error.message || 'Registration failed. Please try again later.',
    });
  }
};

// @desc Authenticate user
// @route POST /api/auth/login
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.comparePassword(password))) {
      if (!user.isVerified) {
        return res.status(403).json({
          message: 'Your email is not verified. Please verify your email to log in.',
        });
      }

      res.json({
        message: 'Login successful.',
        _id: user._id,
        businessName: user.businessName,
        email: user.email,
        accountType: user.accountType,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password.' });
    }
  } catch (error) {
    res.status(400).json({
      message: error.message || 'Login failed. Please try again later.',
    });
  }
};

// @desc Verify email
// @route GET /api/auth/verify-email/:token
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        message: 'Verification failed. The token is invalid or has expired.',
      });
    }

    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationTokenExpires = undefined;

    await user.save();

    res.json({ message: 'Email verified successfully.' });
  } catch (error) {
    res.status(400).json({
      message: error.message || 'Email verification failed. Please try again later.',
    });
  }
};

// @desc Forgot password
// @route POST /api/auth/forgot-password
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'No user found with this email.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    user.passwordResetTokenExpires = Date.now() + 3600000; // 1 hour

    await user.save();

    await sendPasswordResetEmail(user.email, resetToken, user.businessName);

    res.json({
      message: 'Password reset instructions have been sent to your email.',
    });
  } catch (error) {
    res.status(400).json({
      message: error.message || 'Password reset request failed. Please try again later.',
    });
  }
};

// @desc Reset password
// @route POST /api/auth/reset-password/:token
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        message: 'Reset token is invalid or has expired.',
      });
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpires = undefined;

    await user.save();

    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    res.status(400).json({
      message: error.message || 'Password reset failed. Please try again later.',
    });
  }
};

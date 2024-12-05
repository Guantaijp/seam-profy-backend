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

const generateToken = (userId) => {
  return jwt.sign(
    { id: userId }, 
    envConfig.JWT_SECRET, 
    { 
      expiresIn: '30d' // Token expires in 1 day
    }
  );
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
      // isVerified: true,
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

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Please provide email and password' 
      });
    }

    const user = await User.findOne({ email });

    if (user && (await user.comparePassword(password))) {
      // Email verification check
      if (!user.isVerified) {
        return res.status(403).json({
          message: 'Your email is not verified. Please verify your email to log in.',
        });
      }

      // Generate token
      const token = generateToken(user._id);

      res.json({
        message: 'Login successful.',
        user: {
          _id: user._id,
          businessName: user.businessName,
          email: user.email,
          accountType: user.accountType,
        },
        token, // Ensure token is included in the response
      });
    } else {
      res.status(401).json({ 
        message: 'Invalid email or password.' 
      });
    }
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({
      message: 'Login failed. Please try again later.',
      error: error.message
    });
  }
};
// @desc Verify email
// @route GET /api/auth/verify-email/:token
// @desc Verify email
// @route GET /api/auth/verify-email/:token
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    // Check if the token exists in the request parameters
    if (!token) {
      return res.status(400).json({
        message: 'Verification token is missing.',
      });
    }

    // Find the user associated with the token
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationTokenExpires: { $gt: Date.now() },
    });

    // If user is not found or token has expired, return error
    if (!user) {
      return res.status(400).json({
        message: 'Verification failed. The token is invalid or has expired.',
      });
    }

    // If user is already verified, return a message
    if (user.isVerified) {
      return res.status(200).json({
        message: 'Email is already verified.',
      });
    }

    // Set user as verified and remove the verification token
    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationTokenExpires = undefined;

    // Save the user with updated status
    await user.save();

    // Return a success response
    res.status(200).json({
      message: 'Email verified successfully.',
    });
  } catch (error) {
    // Error handling: Provide meaningful message
    res.status(500).json({
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


// @desc Get logged-in user details
// @route GET /api/auth/me
export const getUserProfile = async (req, res) => {
  try {
    // The authMiddleware will attach the user to req.user
    // We'll exclude sensitive information like password
    const user = await User.findById(req.user._id).select('-password');

    if (!user) {
      return res.status(404).json({ 
        message: 'User not found.' 
      });
    }

    res.json({
      _id: user._id,
      accountType: user.accountType,
      businessName: user.businessName,
      email: user.email,
      location: user.location,
      taxId: user.taxId,
      registrationCertificate: user.registrationCertificate,
      taxIdCertificate: user.taxIdCertificate,
      isVerified: user.isVerified
    });
  } catch (error) {
    console.error('Get User Profile Error:', error);
    res.status(500).json({
      message: 'Unable to retrieve user profile.',
      error: error.message
    });
  }
};
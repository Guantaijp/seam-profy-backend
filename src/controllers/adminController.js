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


// @desc Get all users (Admin only)
export const getAllUsers = async (req, res) => {
    try {
      // Retrieve all users, excluding sensitive information
      const users = await User.find({}).select('-password');
      
      res.json({
        count: users.length,
        users: users
      });
    } catch (error) {
      res.status(500).json({
        message: 'Unable to retrieve users.',
        error: error.message
      });
    }
  };
  
  // @desc Get user by ID (Admin only)
  export const getUserById = async (req, res) => {
    try {
      const user = await User.findById(req.params.id).select('-password');
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json(user);
    } catch (error) {
      res.status(500).json({
        message: 'Unable to retrieve user.',
        error: error.message
      });
    }
  };
  
  // @desc Create new user by Admin
  export const createUserByAdmin = async (req, res) => {
    try {
      const { 
        accountType, 
        businessName, 
        location, 
        taxId, 
        email, 
        password 
      } = req.body;
  
      // Check if user already exists
      const existingUser = await User.findOne({ $or: [{ email }, { taxId }] });
  
      if (existingUser) {
        return res.status(400).json({ 
          message: 'A user with this email or tax ID already exists.' 
        });
      }
  
      // Handle file uploads
      let registrationCertificateUrl, taxIdCertificateUrl;
      
      if (req.files) {
        if (req.files.registrationCertificate) {
          registrationCertificateUrl = await uploadToCloudinary(
            req.files.registrationCertificate[0].path,
            'registration-certificates'
          );
        }
  
        if (req.files.taxIdCertificate) {
          taxIdCertificateUrl = await uploadToCloudinary(
            req.files.taxIdCertificate[0].path,
            'tax-id-certificates'
          );
        }
      }
  
      // Create user with admin verification
      const user = await User.create({
        accountType,
        businessName,
        location,
        taxId,
        email,
        password,
        registrationCertificate: registrationCertificateUrl,
        taxIdCertificate: taxIdCertificateUrl,
        isVerified: true // Admin-created users are automatically verified
      });
  
      // Return user details without password
      const userResponse = user.toObject();
      delete userResponse.password;
  
      res.status(201).json({
        message: 'User created successfully',
        user: userResponse
      });
    } catch (error) {
      res.status(500).json({
        message: 'User creation failed',
        error: error.message
      });
    }
  };
  
  // @desc Update user by Admin
  export const updateUserByAdmin = async (req, res) => {
    try {
      const userId = req.params.id;
      const { 
        accountType, 
        businessName, 
        location, 
        taxId, 
        email,
        isVerified
      } = req.body;
  
      // Find the user
      const user = await User.findById(userId);
  
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      // Update basic fields
      if (businessName) user.businessName = businessName;
      if (location) user.location = location;
      if (accountType) user.accountType = accountType;
      
      // Handle email update with unique check
      if (email && email !== user.email) {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          return res.status(400).json({ 
            message: 'Email is already in use by another account.' 
          });
        }
        user.email = email;
      }
  
      // Handle tax ID update
      if (taxId && taxId !== user.taxId) {
        const existingUserWithTaxId = await User.findOne({ taxId });
        if (existingUserWithTaxId) {
          return res.status(400).json({ 
            message: 'Tax ID is already in use by another account.' 
          });
        }
        user.taxId = taxId;
      }
  
      // Admin can force verify/unverify
      if (isVerified !== undefined) user.isVerified = isVerified;
  
      // Handle file uploads
      const fileUploads = [
        { field: 'registrationCertificate', folder: 'registration-certificates' },
        { field: 'taxIdCertificate', folder: 'tax-id-certificates' },
        { field: 'companyLogo', folder: 'company-logos' }
      ];
  
      // Process each possible file upload
      for (const upload of fileUploads) {
        if (req.files && req.files[upload.field]) {
          try {
            const fileUrl = await uploadToCloudinary(
              req.files[upload.field][0].path,
              upload.folder
            );
            user[upload.field] = fileUrl;
          } catch (uploadError) {
            return res.status(400).json({ 
              message: `${upload.field} upload failed.`,
              error: uploadError.message 
            });
          }
        }
      }
  
      // Optional: Password reset by admin
      if (req.body.newPassword) {
        user.password = req.body.newPassword;
      }
  
      // Save updated user
      await user.save();
  
      // Return updated user (excluding password)
      const updatedUser = user.toObject();
      delete updatedUser.password;
  
      res.json({
        message: 'User updated successfully',
        user: updatedUser
      });
    } catch (error) {
      res.status(500).json({
        message: 'Unable to update user.',
        error: error.message
      });
    }
  };
  
  // @desc Delete user by Admin
  export const deleteUserByAdmin = async (req, res) => {
    try {
      const userId = req.params.id;
  
      // Find and delete the user
      const user = await User.findByIdAndDelete(userId);
  
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      res.json({ 
        message: 'User deleted successfully',
        deletedUser: {
          _id: user._id,
          email: user.email,
          businessName: user.businessName
        }
      });
    } catch (error) {
      res.status(500).json({
        message: 'Unable to delete user.',
        error: error.message
      });
    }
  };
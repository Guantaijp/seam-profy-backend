import express from 'express';
import multer from 'multer';
import {
  registerUser,
  loginUser,
  verifyEmail,
  forgotPassword,
  resetPassword,
  getUserProfile,
  updateUserProfile
} from '../controllers/authController.js';
import {
  getAllUsers,
  getUserById,
  createUserByAdmin,
  updateUserByAdmin,
  deleteUserByAdmin
} from '../controllers/adminController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import { adminOnly } from '../middleware/adminMiddleware.js';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB file size limit
  },
  fileFilter: (req, file, cb) => {
    // Accept image and PDF files
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only images and PDFs are allowed'), false);
    }
  }
});

// Configure file upload middleware
const uploadCertificates = upload.fields([
  { name: 'registrationCertificate', maxCount: 1 },
  { name: 'taxIdCertificate', maxCount: 1 },
  { name: 'pharmacyLicense', maxCount: 1 }
]);

const uploadUpdateFiles = upload.fields([
  { name: 'registrationCertificate', maxCount: 1 },
  { name: 'taxIdCertificate', maxCount: 1 },
  { name: 'pharmacyLicense', maxCount: 1 },
  { name: 'companyLogo', maxCount: 1 }
]);

router.post('/register', uploadCertificates, registerUser);
router.post('/login', loginUser);
router.get('/verify-email/:token', verifyEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.get('/me', authMiddleware, getUserProfile);
router.put('/profile',
  authMiddleware,
  uploadUpdateFiles,
  updateUserProfile
);

// Admin-only routes for user management
router.get('/admin/users', authMiddleware, adminOnly, getAllUsers);
router.get('/admin/users/:id', authMiddleware, adminOnly, getUserById);
router.post('/admin/users', authMiddleware, adminOnly, uploadCertificates, createUserByAdmin);
router.put('/admin/users/:id', authMiddleware, adminOnly, uploadUpdateFiles, updateUserByAdmin);
router.delete('/admin/users/:id', authMiddleware, adminOnly, deleteUserByAdmin);

export default router;

import express from 'express';
import {
  submitRating,
  getSupplierRatings,
  getPendingRatings,
  getHealthFacilitySubmittedRatings,
  getSupplierRatingStats,
  getAllRatings,
  getSystemRatingStats,
  deleteRating
} from '../controllers/ratingController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import { adminOnly } from '../middleware/adminMiddleware.js';

const router = express.Router();

// Health Facility Routes
// Submit a rating for an order
router.post('/ratings', authMiddleware, submitRating);

// Get pending ratings for the facility (unrated delivered orders)
router.get('/health-facility/pending-ratings', authMiddleware, getPendingRatings);

// Get all ratings submitted by the facility
router.get('/health-facility/submitted-ratings', authMiddleware, getHealthFacilitySubmittedRatings);

// Supplier Routes
// Get all ratings for a supplier
router.get('/supplier/ratings/:supplierId', authMiddleware, getSupplierRatings);

// Get supplier's rating statistics
router.get('/supplier/rating-stats/:supplierId', authMiddleware, getSupplierRatingStats);

// Admin Routes
// Get all ratings in the system
router.get('/admin/ratings', authMiddleware, adminOnly, getAllRatings);

// Get system-wide rating statistics
router.get('/admin/rating-stats', authMiddleware, adminOnly, getSystemRatingStats);

// Delete inappropriate ratings
router.delete('/admin/ratings/:ratingId', authMiddleware, adminOnly, deleteRating);

export default router;
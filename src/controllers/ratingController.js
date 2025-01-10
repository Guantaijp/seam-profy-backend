import mongoose from 'mongoose';
import  Rating  from '../models/Rating.js';
import Order from '../models/Order.js';
import User from '../models/User.js'; // Assuming you already have the User model from your previous code


export const submitRating = async (req, res) => {
    try {
      const { supplierId, orderId, ratings, overallRating, comment } = req.body;
      const facilityId = req.user._id;
  
      // Verify the user is a Healthcare Facility
      const facility = await User.findById(facilityId);
      if (!facility || facility.accountType !== 'Healthcare Facility') {
        return res.status(403).json({
          success: false,
          message: 'Only healthcare facilities can submit ratings'
        });
      }
  
      // Verify the order exists and belongs to this facility
      const order = await Order.findOne({
        _id: orderId,
        facilityId,
        status: 'DELIVERED', // Only allow rating completed orders
        ratingSubmitted: { $ne: true } // Ensure order hasn't been rated
      });
  
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found or not eligible for rating'
        });
      }
  
      // Create the rating
      const rating = await Rating.create({
        supplierId,
        facilityId,
        orderId,
        ratings,
        overallRating,
        comment
      });
  
      // Mark order as rated
      await Order.findByIdAndUpdate(orderId, {
        ratingSubmitted: true
      });
  
      // Calculate and update supplier's average ratings
      const averageRatings = await Rating.aggregate([
        { $match: { supplierId: mongoose.Types.ObjectId(supplierId) } },
        {
          $group: {
            _id: null,
            avgPrice: { $avg: '$ratings.price' },
            avgDelivery: { $avg: '$ratings.delivery' },
            avgQuality: { $avg: '$ratings.quality' },
            avgOverall: { $avg: '$overallRating' },
            totalRatings: { $sum: 1 }
          }
        }
      ]);
  
      res.status(200).json({
        success: true,
        rating,
        averageRatings: averageRatings[0]
      });
  
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'This order has already been rated'
        });
      }
  
      res.status(500).json({
        success: false,
        message: 'Error submitting rating',
        error: error.message
      });
    }
  };
  
  // Get ratings for a supplier with order details
  export const getSupplierRatings = async (req, res) => {
    try {
      const { supplierId } = req.params;
  
      const ratings = await Rating.find({ supplierId })
        .populate('facilityId', 'businessName location')
        .populate('orderId', 'orderNumber totalAmount deliveryDate')
        .sort('-createdAt');
  
      const stats = await Rating.aggregate([
        { $match: { supplierId: mongoose.Types.ObjectId(supplierId) } },
        {
          $group: {
            _id: null,
            avgPrice: { $avg: '$ratings.price' },
            avgDelivery: { $avg: '$ratings.delivery' },
            avgQuality: { $avg: '$ratings.quality' },
            avgOverall: { $avg: '$overallRating' },
            totalRatings: { $sum: 1 },
            lastMonthRatings: {
              $sum: {
                $cond: [
                  { 
                    $gte: [
                      '$createdAt',
                      new Date(new Date().setMonth(new Date().getMonth() - 1))
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]);
  
      res.status(200).json({
        success: true,
        ratings,
        stats: stats[0] || {
          avgPrice: 0,
          avgDelivery: 0,
          avgQuality: 0,
          avgOverall: 0,
          totalRatings: 0,
          lastMonthRatings: 0
        }
      });
  
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching ratings',
        error: error.message
      });
    }
  };
  
  // Get pending ratings for a facility
  export const getPendingRatings = async (req, res) => {
    try {
      const facilityId = req.user._id;
  
      // Find delivered orders without ratings
      const pendingOrders = await Order.find({
        facilityId,
        status: 'DELIVERED',
        ratingSubmitted: { $ne: true }
      }).populate('supplierId', 'businessName');
  
      res.status(200).json({
        success: true,
        pendingOrders
      });
  
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching pending ratings',
        error: error.message
      });
    }
  };

  // Get all ratings submitted by a specific facility
export const getHealthFacilitySubmittedRatings = async (req, res) => {
    try {
      const facilityId = req.user._id;
  
      const ratings = await Rating.find({ facilityId })
        .populate('supplierId', 'businessName')
        .populate('orderId', 'orderNumber totalAmount deliveryDate')
        .sort('-createdAt');
  
      res.status(200).json({
        success: true,
        ratings
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching submitted ratings',
        error: error.message
      });
    }
  };
  
  // Get detailed rating statistics for a supplier
  export const getSupplierRatingStats = async (req, res) => {
    try {
      const { supplierId } = req.params;
  
      const stats = await Rating.aggregate([
        { $match: { supplierId: mongoose.Types.ObjectId(supplierId) } },
        {
          $facet: {
            overall: [
              {
                $group: {
                  _id: null,
                  avgPrice: { $avg: '$ratings.price' },
                  avgDelivery: { $avg: '$ratings.delivery' },
                  avgQuality: { $avg: '$ratings.quality' },
                  avgOverall: { $avg: '$overallRating' },
                  totalRatings: { $sum: 1 }
                }
              }
            ],
            monthly: [
              {
                $group: {
                  _id: {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' }
                  },
                  avgRating: { $avg: '$overallRating' },
                  count: { $sum: 1 }
                }
              },
              { $sort: { '_id.year': -1, '_id.month': -1 } },
              { $limit: 12 }
            ],
            ratingDistribution: [
              {
                $group: {
                  _id: '$overallRating',
                  count: { $sum: 1 }
                }
              },
              { $sort: { '_id': 1 } }
            ]
          }
        }
      ]);
  
      res.status(200).json({
        success: true,
        stats: stats[0]
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching supplier rating statistics',
        error: error.message
      });
    }
  };
  
  // Admin: Get all ratings
  export const getAllRatings = async (req, res) => {
    try {
      const { page = 1, limit = 10, sort = '-createdAt' } = req.query;
  
      const ratings = await Rating.find()
        .populate('supplierId', 'businessName')
        .populate('facilityId', 'businessName')
        .populate('orderId', 'orderNumber')
        .sort(sort)
        .limit(limit * 1)
        .skip((page - 1) * limit);
  
      const count = await Rating.countDocuments();
  
      res.status(200).json({
        success: true,
        ratings,
        totalPages: Math.ceil(count / limit),
        currentPage: page
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching ratings',
        error: error.message
      });
    }
  };
  
  // Admin: Get system-wide rating statistics
  export const getSystemRatingStats = async (req, res) => {
    try {
      const stats = await Rating.aggregate([
        {
          $facet: {
            overall: [
              {
                $group: {
                  _id: null,
                  totalRatings: { $sum: 1 },
                  avgOverall: { $avg: '$overallRating' },
                  avgPrice: { $avg: '$ratings.price' },
                  avgDelivery: { $avg: '$ratings.delivery' },
                  avgQuality: { $avg: '$ratings.quality' }
                }
              }
            ],
            supplierStats: [
              {
                $group: {
                  _id: '$supplierId',
                  avgRating: { $avg: '$overallRating' },
                  totalRatings: { $sum: 1 }
                }
              },
              { $sort: { avgRating: -1 } },
              { $limit: 10 }
            ],
            monthlyTrends: [
              {
                $group: {
                  _id: {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' }
                  },
                  avgRating: { $avg: '$overallRating' },
                  count: { $sum: 1 }
                }
              },
              { $sort: { '_id.year': -1, '_id.month': -1 } },
              { $limit: 12 }
            ]
          }
        }
      ]);
  
      res.status(200).json({
        success: true,
        stats: stats[0]
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching system rating statistics',
        error: error.message
      });
    }
  };
  
  // Admin: Delete a rating
  export const deleteRating = async (req, res) => {
    try {
      const { ratingId } = req.params;
  
      const rating = await Rating.findById(ratingId);
      if (!rating) {
        return res.status(404).json({
          success: false,
          message: 'Rating not found'
        });
      }
  
      // Update the order to allow re-rating
      await Order.findByIdAndUpdate(rating.orderId, {
        ratingSubmitted: false
      });
  
      await Rating.findByIdAndDelete(ratingId);
  
      res.status(200).json({
        success: true,
        message: 'Rating deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error deleting rating',
        error: error.message
      });
    }
  };
  
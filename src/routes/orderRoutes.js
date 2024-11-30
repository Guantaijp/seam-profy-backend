import express from 'express';
import {
  createOrderFromRFQ,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  cancelOrder
} from '../controllers/orderController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// Order routes
router.route('/create-from-rfq/:rfqId')
  .post(authMiddleware, createOrderFromRFQ);

router.route('/')
  .get(authMiddleware, getAllOrders);

router.route('/:id')
  .get(authMiddleware, getOrderById)
  .patch(authMiddleware, updateOrderStatus);

// Cancel order route
router.patch('/:id/cancel', authMiddleware, cancelOrder);

export default router;
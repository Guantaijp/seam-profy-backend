import express from 'express';
import { createOrder,getHealthFacilityOrders,getSupplierOrders} from '../controllers/orderController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// @route POST /api/orders
router.post('/orders', authMiddleware, createOrder);
// In your routes file
router.get('/health-facility-orders', authMiddleware, getHealthFacilityOrders);
router.get('/supplier-orders', authMiddleware, getSupplierOrders);

export default router;
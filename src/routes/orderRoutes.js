import express from 'express';
import { createOrder,} from '../controllers/orderController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// @route POST /api/orders
router.post('/orders', authMiddleware, createOrder);

// // Route for suppliers to see orders made to them
// router.get('/supplier', authMiddleware, getOrdersForSupplier);

// // Route for health facilities to see orders they have made
// router.get('/health-facility', authMiddleware, getOrdersForHealthFacility);


export default router;
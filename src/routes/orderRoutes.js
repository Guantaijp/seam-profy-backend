import express from 'express';
import { createOrder,getHealthFacilityOrders,getSupplierOrders,getHealthFacilityMonthlyPurchases,
     getSupplierMonthlySales,
     adminCreateOrder,
     getAllOrders,
     updateOrder,
     deleteOrder,
     getAllSales,
     getAllPurchases,
    } from '../controllers/orderController.js';
    import authMiddleware from '../middleware/authMiddleware.js';
    import { adminOnly } from '../middleware/adminMiddleware.js';

const router = express.Router();

// @route POST /api/orders
router.post('/orders', authMiddleware, createOrder);
// In your routes file
router.get('/health-facility-orders', authMiddleware, getHealthFacilityOrders);
router.get('/supplier-orders', authMiddleware, getSupplierOrders);

// For Health Facility
router.get('/health-facility/monthly-purchases', authMiddleware, getHealthFacilityMonthlyPurchases);

// For Supplier
router.get('/supplier/monthly-sales', authMiddleware, getSupplierMonthlySales);



// Admin Routes for Orders Management
router.post('/orders', authMiddleware, adminOnly, adminCreateOrder);        // Create Order
router.get('/orders', authMiddleware, adminOnly, getAllOrders);            // Get All Orders
router.put('/orders/:id', authMiddleware, adminOnly, updateOrder);         // Update Order
router.delete('/orders/:id', authMiddleware, adminOnly, deleteOrder);      // Delete Order

// Admin Routes for Reports
router.get('/sales', authMiddleware, adminOnly, getAllSales);              // Get Total Sales
router.get('/purchases', authMiddleware, adminOnly, getAllPurchases); 

export default router;
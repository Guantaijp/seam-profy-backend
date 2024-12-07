import express from 'express';
import { 
  createPayment, 
  getHealthFacilityPayments, 
  getSupplierPayments,
  markPaymentAsPaid,
  downloadInvoice,
  cleanupInvoices
} from '../controllers/paymentController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// Middleware to check if user is a health facility
const isHealthFacility = (req, res, next) => {
  if (req.user.accountType !== 'HealthFacility') {
    return res.status(403).json({ 
      message: 'Access denied. Health facility role required.' 
    });
  }
  next();
};

// Middleware to check if user is a supplier
const isSupplier = (req, res, next) => {
  if (req.user.accountType !== 'Supplier') {
    return res.status(403).json({ 
      message: 'Access denied. Supplier role required.' 
    });
  }
  next();
};

// Middleware to check if user is an admin
const isAdmin = (req, res, next) => {
  if (req.user.accountType !== 'Admin') {
    return res.status(403).json({ 
      message: 'Access denied. Admin role required.' 
    });
  }
  next();
};

// Create payment (Health Facility only)
router.post('/', 
  authMiddleware, 
  isHealthFacility, 
  createPayment
);

// Get health facility payments
router.get('/health-facility', 
  authMiddleware, 
  isHealthFacility, 
  getHealthFacilityPayments
);

// Get supplier payments
router.get('/supplier', 
  authMiddleware, 
  isSupplier, 
  getSupplierPayments
);

// Mark payment as paid (Supplier only)
router.patch('/:paymentId/mark-paid', 
  authMiddleware, 
  isSupplier, 
  markPaymentAsPaid
);

// Download invoice (Both Health Facility and Supplier)
router.get('/:paymentId/download', 
  authMiddleware, 
  downloadInvoice
);

// Cleanup invoices (Admin only)
router.delete('/cleanup', 
  authMiddleware, 
  isAdmin, 
  cleanupInvoices
);

export default router;
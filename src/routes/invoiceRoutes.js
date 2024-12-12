import express from 'express';
import { 
  generateInvoice, 
  downloadInvoice, 
  getHealthFacilityInvoices,
  getSupplierInvoices
} from '../controllers/invoiceController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// Generate invoice for a specific order
router.post('/generate/:orderId', authMiddleware, generateInvoice);

// Download a specific invoice
router.get('/download/:invoiceId', authMiddleware, downloadInvoice);

// Get all invoices for a health facility
router.get('/health-facility', authMiddleware, getHealthFacilityInvoices);

// Get all invoices for a supplier
router.get('/supplier', authMiddleware, getSupplierInvoices);

export default router;
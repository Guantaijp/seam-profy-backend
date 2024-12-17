import express from 'express';
import { 
  generateInvoice, 
  downloadInvoice, 
  getHealthFacilityInvoices,
  getSupplierInvoices,
  getAllInvoices,  // New route to fetch all invoices for admin
  adminDownloadInvoice,  // New route to allow admin to download any invoice
  deleteInvoice 
} from '../controllers/invoiceController.js';
import { adminOnly } from '../middleware/adminMiddleware.js';
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


// Admin routes
// Get all invoices (only for admins)
router.get('/admin/invoices', authMiddleware, adminOnly, getAllInvoices);

// Admin: Download invoice (any invoice, only for admins)
router.get('/admin/invoices/:invoiceId/download', authMiddleware, adminOnly, adminDownloadInvoice);

// Admin: Delete invoice (only for admins)
router.delete('/admin/invoices/:invoiceId', authMiddleware, adminOnly, deleteInvoice);


export default router;
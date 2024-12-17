import express from 'express';
import { negotiateRFQ, getNegotiationsForRFQ, selectNegotiation,getSupplierNegotiations ,
    getHealthFacilityNegotiations,
    getAllNegotiationsForAdmin,
    getNegotiationByIdForAdmin,
    updateNegotiationForAdmin,
    deleteNegotiationForAdmin,
 } from '../controllers/negotiationsController.js';
 import { adminOnly } from '../middleware/adminMiddleware.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply the authMiddleware to routes that require authentication
router.post('/:id/negotiate', authMiddleware, negotiateRFQ);
router.get('/:id/negotiations', authMiddleware, getNegotiationsForRFQ);
router.patch('/:id/select-negotiation/:negotiationId', authMiddleware, selectNegotiation);
router.get('/supplier-negotiations', authMiddleware, getSupplierNegotiations);
router.get('/health-facility-negotiations', authMiddleware, getHealthFacilityNegotiations);


// Admin Routes for Negotiations
router.get('/negotiations', authMiddleware, adminOnly, getAllNegotiationsForAdmin);
router.get('/negotiations/:id', authMiddleware, adminOnly, getNegotiationByIdForAdmin);
router.patch('/negotiations/:id', authMiddleware, adminOnly, updateNegotiationForAdmin);
router.delete('/negotiations/:id', authMiddleware, adminOnly, deleteNegotiationForAdmin);

export default router;

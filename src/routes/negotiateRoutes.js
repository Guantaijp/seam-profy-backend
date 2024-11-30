import express from 'express';
import { negotiateRFQ, getNegotiationsForRFQ, selectNegotiation,getSupplierNegotiations ,getHealthFacilityNegotiations } from '../controllers/negotiationsController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply the authMiddleware to routes that require authentication
router.post('/:id/negotiate', authMiddleware, negotiateRFQ);
router.get('/:id/negotiations', authMiddleware, getNegotiationsForRFQ);
router.patch('/:id/select-negotiation/:negotiationId', authMiddleware, selectNegotiation);
router.get('/supplier-negotiations', authMiddleware, getSupplierNegotiations);
router.get('/health-facility-negotiations', authMiddleware, getHealthFacilityNegotiations);

export default router;

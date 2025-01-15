import express from 'express';
import { 
  createCreditRequest, 
  approveCreditRequest, 
  makePayment,
  getMyCreditRequests 
} from '../controllers/creditRequestController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// Get credit requests
router.get('/my-requests', authMiddleware, getMyCreditRequests);

// Create credit request
router.post('/', authMiddleware, createCreditRequest);

// Credit request actions
router.patch('/:creditRequestId/approve', authMiddleware, approveCreditRequest);
router.post('/:creditRequestId/payment', authMiddleware, makePayment);

export default router;
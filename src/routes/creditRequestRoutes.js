import express from 'express';
import { 
  createCreditRequest, 
  // approveCreditRequest, 
  makePayment,
  updateCreditRequestStatus,
  getMyCreditRequests ,
  getAllCreditRequests
} from '../controllers/creditRequestController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// Get credit requests
router.get('/my-requests', authMiddleware, getMyCreditRequests);
router.get('/admin/credit-requests', getAllCreditRequests);
// Create credit request
router.post('/', authMiddleware, createCreditRequest);

// Credit request actions
router.patch('/:creditRequestId/status', authMiddleware,updateCreditRequestStatus);
router.post('/:creditRequestId/payment', authMiddleware, makePayment);

export default router;
import express from 'express';
import {  handleCallback,confirmPayment, initiateMPESAPayment, getPaymentStatus } from '../controllers/mpesaControler.js';
import { adminOnly } from '../middleware/adminMiddleware.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/callback/', handleCallback);
router.post('/initiate', initiateMPESAPayment);
router.post('/confirm/:checkoutRequestId', confirmPayment);
router.get('/status/:orderId',  getPaymentStatus);
export default router;
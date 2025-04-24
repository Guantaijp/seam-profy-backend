import express from 'express';
import {
  createWallet,
  getUserWallets,
  getWallet,
  topUpViaBank,
  topUpViaMpesa,
  getWalletTransactions,
  getAllWallets, // New route for admin
  adminWalletDetails, // New route for admin to view any wallet
  suspendWallet, // New route for admin to suspend a wallet
  updateWalletStatus // New route for admin to update wallet status
} from '../controllers/walletController.js';
import { adminOnly } from '../middleware/adminMiddleware.js';
import authMiddleware from '../middleware/authMiddleware.js';
const router = express.Router();

// User routes
// Create a new wallet
router.post('/', authMiddleware, createWallet);

// Get all wallets for the logged-in user
router.get('/user', authMiddleware, getUserWallets);

// Get a specific wallet
router.get('/:walletId', authMiddleware, getWallet);

// Top up wallet via bank
router.post('/:walletId/topup/bank', authMiddleware, topUpViaBank);

// Top up wallet via M-Pesa
router.post('/:walletId/topup/mpesa', authMiddleware, topUpViaMpesa);

// Get transactions for a specific wallet
router.get('/:walletId/transactions', authMiddleware, getWalletTransactions);

// Admin routes
// Get all wallets (only for admins)
router.get('/admin/wallets', authMiddleware, adminOnly, getAllWallets);

// Admin: Get specific wallet details (any wallet, only for admins)
router.get('/admin/wallets/:walletId', authMiddleware, adminOnly, adminWalletDetails);

// Admin: Suspend wallet (only for admins)
router.post('/admin/wallets/:walletId/suspend', authMiddleware, adminOnly, suspendWallet);

// Admin: Update wallet status (only for admins)
router.patch('/admin/wallets/:walletId/status', authMiddleware, adminOnly, updateWalletStatus);

export default router;
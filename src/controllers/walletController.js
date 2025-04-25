// controllers/walletController.js
import { v4 as uuidv4 } from 'uuid';
import Wallet from '../models/Wallet.js';

export const createWallet = async (req, res) => {
  try {
    const { name, type } = req.body;
    const userId = req.user._id;
    
    if (req.body._id) {
      delete req.body._id;
    }
    
    if (!name || !type) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name and type'
      });
    }
    
    const walletId = uuidv4().substring(0, 8);
    
    // Create a wallet with an empty transactions array
    // This avoids the unique index issue
    const newWallet = new Wallet({
      id: walletId,
      name,
      type,
      userId,
      balance: 0,
      beginningBalance: 0,
      status: 'Active',
      transactions: [] // Empty array - this is fine once the index is dropped
    });
    
    await newWallet.save();
    
    return res.status(201).json({
      success: true,
      message: 'Wallet created successfully',
      data: newWallet
    });
  } catch (error) {
    console.error('Error creating wallet:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create wallet',
      error: error.message
    });
  }
};
// Get all wallets for the authenticated user
export const getUserWallets = async (req, res) => {
  try {
    const userId = req.user._id; // Get userId from authenticated user
    
    const userWallets = await Wallet.find({ userId });
    
    return res.status(200).json({
      success: true,
      count: userWallets.length,
      data: userWallets
    });
  } catch (error) {
    console.error('Error fetching wallets:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch wallets',
      error: error.message
    });
  }
};

// Get a single wallet
export const getWallet = async (req, res) => {
  try {
    const { walletId } = req.params;
    const userId = req.user._id; // Get userId from authenticated user
    
    const wallet = await Wallet.findOne({ id: walletId, userId });
    
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: wallet
    });
  } catch (error) {
    console.error('Error fetching wallet:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch wallet',
      error: error.message
    });
  }
};

// Top up wallet via bank
export const topUpViaBank = async (req, res) => {
  try {
    const { walletId } = req.params;
    const { amount, bankAccount, bankName, reference } = req.body;
    const userId = req.user._id; // Get userId from authenticated user
    
    if (!amount || !bankAccount || !bankName) {
      return res.status(400).json({
        success: false,
        message: 'Please provide amount, bankAccount, and bankName'
      });
    }
    
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0'
      });
    }
    
    const wallet = await Wallet.findOne({ _id: walletId, userId });
    
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }
    
    if (wallet.status !== 'Active') {
      return res.status(400).json({
        success: false,
        message: `Cannot top up wallet with status: ${wallet.status}`
      });
    }
    
    // In a real application, you would integrate with a payment gateway
    // For demonstration, we'll just update the wallet balance
    
    const transaction = {
      id: uuidv4(),
      type: 'TOPUP',
      method: 'BANK',
      amount,
      bankAccount,
      bankName,
      reference: reference || `BANK-${Date.now()}`,
      status: 'COMPLETED',
      timestamp: new Date()
    };
    
    wallet.beginningBalance = wallet.balance;
    wallet.balance += amount;
    wallet.transactions.push(transaction);
    
    await wallet.save();
    
    return res.status(200).json({
      success: true,
      message: 'Wallet topped up successfully via bank',
      data: {
        wallet,
        transaction
      }
    });
  } catch (error) {
    console.error('Error topping up wallet:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to top up wallet',
      error: error.message
    });
  }
};

// Top up wallet via M-Pesa
export const topUpViaMpesa = async (req, res) => {
  try {
    const { walletId } = req.params;
    const { amount, phoneNumber } = req.body;
    const userId = req.user._id; // Get userId from authenticated user
    
    if (!amount || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Please provide amount and phoneNumber'
      });
    }
    
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0'
      });
    }
    
    const wallet = await Wallet.findOne({ _id: walletId, userId });
    
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }
    
    if (wallet.status !== 'Active') {
      return res.status(400).json({
        success: false,
        message: `Cannot top up wallet with status: ${wallet.status}`
      });
    }
    
    // In a real application, you would integrate with M-Pesa API
    // For demonstration, we'll just update the wallet balance
    
    const transaction = {
      id: uuidv4(),
      type: 'TOPUP',
      method: 'MPESA',
      amount,
      phoneNumber,
      reference: `MPESA-${Date.now()}`,
      status: 'COMPLETED',
      timestamp: new Date()
    };
    
    wallet.beginningBalance = wallet.balance;
    wallet.balance += amount;
    wallet.transactions.push(transaction);
    
    await wallet.save();
    
    return res.status(200).json({
      success: true,
      message: 'Wallet topped up successfully via M-Pesa',
      data: {
        wallet,
        transaction
      }
    });
  } catch (error) {
    console.error('Error topping up wallet:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to top up wallet',
      error: error.message
    });
  }
};

// Get wallet transactions
export const getWalletTransactions = async (req, res) => {
  try {
    const { walletId } = req.params;
    const userId = req.user._id; // Get userId from authenticated user
    
    const wallet = await Wallet.findOne({ id: walletId, userId });
    
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      count: wallet.transactions.length,
      data: wallet.transactions
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions',
      error: error.message
    });
  }
};

// ADMIN CONTROLLERS

// Get all wallets (admin only)
export const getAllWallets = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, type } = req.query;
    
    // Build query based on filters
    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (type) {
      query.type = type;
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Execute query with pagination
    const wallets = await Wallet.find(query)
      .populate('userId', 'firstName lastName email phone')
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ createdAt: -1 });
    
    // Get total count for pagination info
    const totalWallets = await Wallet.countDocuments(query);
    
    return res.status(200).json({
      success: true,
      count: wallets.length,
      totalPages: Math.ceil(totalWallets / limit),
      currentPage: parseInt(page),
      data: wallets
    });
  } catch (error) {
    console.error('Error fetching all wallets:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch wallets',
      error: error.message
    });
  }
};

// Get specific wallet details (admin only)
export const adminWalletDetails = async (req, res) => {
  try {
    const { walletId } = req.params;
    
    const wallet = await Wallet.findOne({ id: walletId })
      .populate('userId', 'firstName lastName email phone');
    
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: wallet
    });
  } catch (error) {
    console.error('Error fetching wallet details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch wallet details',
      error: error.message
    });
  }
};

// Suspend wallet (admin only)
export const suspendWallet = async (req, res) => {
  try {
    const { walletId } = req.params;
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a reason for suspension'
      });
    }
    
    const wallet = await Wallet.findOne({ id: walletId });
    
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }
    
    wallet.status = 'Suspended';
    wallet.suspensionReason = reason;
    wallet.suspendedAt = new Date();
    wallet.suspendedBy = req.user.id;
    
    await wallet.save();
    
    // In a real app, you might want to notify the user about the suspension
    
    return res.status(200).json({
      success: true,
      message: 'Wallet suspended successfully',
      data: wallet
    });
  } catch (error) {
    console.error('Error suspending wallet:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to suspend wallet',
      error: error.message
    });
  }
};

// Update wallet status (admin only)
export const updateWalletStatus = async (req, res) => {
  try {
    const { walletId } = req.params;
    const { status, reason } = req.body;
    
    if (!status || !['Active', 'Inactive', 'Suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid status (Active, Inactive, or Suspended)'
      });
    }
    
    if (status === 'Suspended' && !reason) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a reason for suspension'
      });
    }
    
    const wallet = await Wallet.findOne({ id: walletId });
    
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }
    
    wallet.status = status;
    
    if (status === 'Suspended') {
      wallet.suspensionReason = reason;
      wallet.suspendedAt = new Date();
      wallet.suspendedBy = req.user._id;
    } else if (status === 'Active' && wallet.status === 'Suspended') {
      // If reactivating a suspended wallet
      wallet.suspensionReason = null;
      wallet.suspendedAt = null;
      wallet.suspendedBy = null;
    }
    
    await wallet.save();
    
    // In a real app, you might want to notify the user about the status change
    
    return res.status(200).json({
      success: true,
      message: `Wallet status updated to ${status} successfully`,
      data: wallet
    });
  } catch (error) {
    console.error('Error updating wallet status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update wallet status',
      error: error.message
    });
  }
};
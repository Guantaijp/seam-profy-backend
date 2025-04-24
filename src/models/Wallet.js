// models/Wallet.js
import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['TOPUP', 'WITHDRAWAL', 'TRANSFER', 'PAYMENT'],
    required: true
  },
  method: {
    type: String,
    enum: ['BANK', 'MPESA', 'CARD', 'INTERNAL'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  bankAccount: String,
  bankName: String,
  phoneNumber: String,
  reference: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'],
    default: 'PENDING'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const walletSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  balance: {
    type: Number,
    default: 0
  },
  beginningBalance: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Suspended'],
    default: 'Active'
  },
  suspensionReason: {
    type: String,
    default: null
  },
  suspendedAt: {
    type: Date,
    default: null
  },
  suspendedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  transactions: [transactionSchema]
}, {
  timestamps: true
});

// Create indexes for better query performance
walletSchema.index({ userId: 1 });
// Removed the _id index that was causing the warning
walletSchema.index({ status: 1 });
walletSchema.index({ type: 1 });

const Wallet = mongoose.model('Wallet', walletSchema);

export default Wallet;
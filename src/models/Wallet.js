import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
    // Removed unique: true
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
  id: {
    type: String,
    required: true
    // Removed unique: true
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
  createdAt: {
    type: Date,
    default: Date.now
  },
  transactions: [transactionSchema]
}, {
  timestamps: true,
  id: false  // Disable the virtual id getter/setter
});

// Remove any index definitions that enforce uniqueness
// If you had any walletSchema.index() calls, remove them or modify them

const Wallet = mongoose.model('Wallet', walletSchema);
export default Wallet;
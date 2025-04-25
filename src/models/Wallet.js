import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
    // Remove the unique: true constraint here
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
    type: String,  // Custom ID as a string
    required: true,
    unique: true
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

// Create a compound index for transactions.id within each wallet
// This ensures uniqueness only within a single wallet document
walletSchema.index({ 'userId': 1, 'transactions.id': 1 });

// Remove any existing index on just transactions.id
// You'll need to do this in MongoDB if it exists

const Wallet = mongoose.model('Wallet', walletSchema);
export default Wallet;
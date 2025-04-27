import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const transactionSchema = new mongoose.Schema({
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
}, {
  _id: false, // no internal _id for subdocs
  id: false,  // no virtual id either
  autoIndex: false
});


const walletSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: ["KES", "USD"],
  },
  userId: {
    type: String,
    required: true,
  },
  balance: {
    type: Number,
    default: 0,
  },
  beginningBalance: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ["Active", "Inactive"],
    default: "Active",
  },
  transactions: {
    type: Array,
    default: [],
  },
})

// ✅ No unique index on id or userId
// If you want to enforce unique wallet names per user, uncomment below:
// walletSchema.index({ userId: 1, name: 1 }, { unique: true });

const Wallet = mongoose.model('Wallet', walletSchema);
export default Wallet;

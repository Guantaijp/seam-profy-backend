// models/CreditRequest.js
import mongoose from 'mongoose';

const creditRequestSchema = new mongoose.Schema({
  creditRequestNumber: {
    type: String,
    required: true,
    unique: true,
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
  },
  orderNumber: {
    type: String,
    required: true,
  },
  healthFacilityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  interestRate: {
    type: Number,
    required: true,
  },
  termMonths: {
    type: Number,
    required: true,
  },
  repaymentAmount: {
    type: Number,
    required: true,
  },
  allowEarlyRepayment: {
    type: Boolean,
    default: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'paid', 'overdue'],
    default: 'pending',
  },
  approvedAt: Date,
  dueDate: Date,
  paidAmount: {
    type: Number,
    default: 0,
  },
  lastPaymentDate: Date,
  paymentHistory: [{
    amount: Number,
    date: Date,
    paymentMethod: String,
    transactionId: String
  }]
}, { timestamps: true });

const CreditRequest = mongoose.model('CreditRequest', creditRequestSchema);
export default CreditRequest;
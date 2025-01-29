import mongoose from 'mongoose';

const creditRequestSchema = new mongoose.Schema({
  creditRequestNumber: {
    type: String,
    required: true,
    unique: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  orderNumber: {
    type: String,
    required: true
  },
  healthFacilityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  interestRate: {
    type: Number,
    required: true
  },
  termMonths: {
    type: Number,
    required: true
  },
  repaymentAmount: {
    type: Number,
    required: true
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'paid', 'overdue'],
    default: 'pending'
  },
  allowEarlyRepayment: {
    type: Boolean,
    default: true
  },
  creditScore: {
    type: Number,
    required: true
  },
  currentCreditScore: {
    type: Number
  }
}, {
  timestamps: true
});

export default mongoose.model('CreditRequest', creditRequestSchema);
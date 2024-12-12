import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  taxAmount: {
    type: Number,
    default: 0
  },
  netAmount: {
    type: Number,
    required: true
  },
  invoiceDate: {
    type: Date,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['Generated', 'Sent', 'Paid', 'Overdue'],
    default: 'Generated'
  },
  paymentDetails: {
    method: String,
    transactionId: String,
    paymentDate: Date
  },
  billingDetails: {
    healthFacilityName: String,
    healthFacilityAddress: String,
    supplierName: String,
    supplierAddress: String
  }
}, { timestamps: true });

const Invoice = mongoose.model('Invoice', invoiceSchema);

export default Invoice;
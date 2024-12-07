import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  invoiceNumber: {
    type: String,
    unique: true,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMethod: {
    type: String,
    enum: ['Bank Transfer', 'Credit Card', 'Digital Wallet', 'Cash'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid', 'Overdue', 'Cancelled'],
    default: 'Pending'
  },
  dueDate: {
    type: Date,
    required: true
  },
  paymentDate: {
    type: Date
  },
  healthFacility: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  paymentProof: {
    type: String, // Path to uploaded payment proof document
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

// Pre-save hook to generate invoice number
PaymentSchema.pre('save', async function(next) {
  if (!this.invoiceNumber) {
    const lastInvoice = await this.constructor.findOne({}, {}, { sort: { createdAt: -1 } });
    const lastNumber = lastInvoice ? parseInt(lastInvoice.invoiceNumber.split('-')[1]) : 0;
    this.invoiceNumber = `INV-${(lastNumber + 1).toString().padStart(6, '0')}`;
  }
  next();
});

const Payment = mongoose.model('Payment', PaymentSchema);

export default Payment;
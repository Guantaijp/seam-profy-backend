import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true },
  amount: { type: Number, required: true },
  transactionId: { type: String, required: true },
  status: { type: String, required: true },
  paymentMethod: { type: String, required: true },
  orderId: { type: String, required: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  healthFacility: { type: mongoose.Schema.Types.ObjectId, ref: 'HealthFacility', required: true },
  dueDate: { type: Date, required: true },
  invoiceNumber: { type: String, required: true },
  order: { type: String, required: true },  // Make sure order field exists
}, { timestamps: true });

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;

import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  invoiceNumber: { type: String, required: true },
  totalAmount: { type: Number, required: true },
  taxAmount: { type: Number, required: true },
  netAmount: { type: Number, required: true },
  dueDate: { type: Date, required: true },
  status: { type: String, enum: ['Generated', 'Paid', 'Overdue'], default: 'Generated' },
  billingDetails: {
    healthFacilityName: { type: String, required: true },
    healthFacilityAddress: { type: String, required: true },
  },
  orderDetails: {
    orderNumber: { type: String, required: true },
    rfqId: { type: mongoose.Schema.Types.ObjectId, ref: 'RFQ' },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
    negotiationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Negotiation' },
    deliveryDetails: { type: Object, required: true },
    totalPrice: { type: Number, required: true },
    negotiationDetails: { type: Object, required: true },
    rfqDetails: { type: Object, required: true },
    supplierDetails: { type: Object, required: true },
  },
});


const Invoice = mongoose.model('Invoice', invoiceSchema);

export default Invoice;
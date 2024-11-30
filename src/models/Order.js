import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  rfqId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RFQ',
    required: true
  },
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [{
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    agreedPrice: {
      type: Number,
      required: true
    }
  }],
  totalAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: [
      'Pending', 
      'Processing', 
      'Shipped', 
      'Delivered', 
      'Cancelled'
    ],
    default: 'Pending'
  },
  deliveryTimeframe: {
    type: String
  },
  billingAddress: {
    type: Object
  },
  shippingAddress: {
    type: Object
  },
  cancellationReason: {
    type: String
  }
}, { timestamps: true });

export default mongoose.model('Order', OrderSchema);
import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,  // Ensure the orderNumber is unique
    },
    rfqId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RFQ',
      required: true,
    },
    negotiationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Negotiation',
      required: true,
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',  // Reference to User model (not Supplier)
      required: true
    },
    healthFacilityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Assuming health facilities are part of the `User` model
      required: true,
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    deliveryDetails: {
      address: { type: String, required: true },
      deliveryDate: { type: Date, required: true },
    },
    status: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Delivered', 'Cancelled'],
      default: 'Pending',
    },
  },
  { timestamps: true }
);

const Order = mongoose.model('Order', orderSchema);

export default Order;

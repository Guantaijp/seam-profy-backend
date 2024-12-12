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
    negotiationDetails: {
      deliveryTimeframe: String,
      additionalNotes: String,
      items: [{
        itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'RFQItem' },
        itemName: String,
        itemDescription: String,
        quotedPrice: Number,
        quantity: Number
      }]
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
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Invoiced', 'Paid', 'Overdue'],
      default: 'Pending'
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
    negotiationDetails: {
      deliveryTimeframe: String,
      additionalNotes: String,
      totalQuotePrice: Number,
      items: [{
        itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'RFQItem' },
        itemName: String,
        itemSpecifications: String,
        itemUnit: String,
        quotedPrice: Number,
        quantity: Number,
        originalQuantity: Number
      }]
    },
    rfqDetails: {
      title: String,
      summary: String
    },
    supplierDetails: {
      businessName: String,
      email: String,
      phoneNumber: String,
      location: String,
      accountType: String
    }
  },
  { timestamps: true }
);

const Order = mongoose.model('Order', orderSchema);

export default Order;

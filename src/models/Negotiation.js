import mongoose from 'mongoose';

// Define the item structure in the negotiation
const NegotiationItemSchema = new mongoose.Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RFQItem', // Referring to the RFQItem collection
    required: [true, 'Item ID is required']
  },
  itemName: {
    type: String,
    required: true
  },
  quotedPrice: {
    type: Number,
    required: [true, 'Quoted price is required'],
    min: [0, 'Quoted price must be a positive number']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1']
  }
});

// Define the overall negotiation schema
const NegotiationSchema = new mongoose.Schema({
  rfqId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RFQ',
    required: true,
  },
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  healthFacilityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  items: [
    {
      itemId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
      },
      itemName: {
        type: String,
        required: true,
      },
      quantity: {
        type: Number, // Ensure this is required if your model expects it
        required: [true, 'Quantity is required'],
        min: [1, 'Quantity must be at least 1'],
      },
      quotedPrice: {
        type: Number,
        required: [true, 'Quoted price is required'],
        min: [0, 'Quoted price must be a positive value'],
      },
    },
  ],
  totalQuotePrice: {
    type: Number,
    required: [true, 'Total quote price is required'],
  },
  deliveryTimeframe: {
    type: String,
    required: [true, 'Delivery timeframe is required'],
  },
  additionalNotes: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['Submitted', 'Accepted', 'Rejected'],
    default: 'Submitted',
  },
  negotiationStatus: {
    type: String,
    enum: ['Pending', 'Approved', 'Declined'],
    default: 'Pending',
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
});


// Export the model
export default mongoose.model('Negotiation', NegotiationSchema);

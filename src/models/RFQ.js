import mongoose from 'mongoose';

export const RFQItemSchema = new mongoose.Schema({
  itemName: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1']
  },
  unit: {
    type: String,
    required: [true, 'Unit is required'],
    trim: true
  },
  specifications: {
    type: String,
    required: [true, 'Specifications are required'],
    trim: true
  },
  rfqId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RFQ',
    required: true
  }
}, {
  timestamps: true
});



const RFQSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'RFQ title is required'],
    trim: true
  },
  items: [RFQItemSchema],
  attachments: [{
    fileName: String,
    fileUrl: String
  }],
  summary: {
    type: String,
    trim: true // Optional field for a brief RFQ summary
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: [
      'Draft',      // Initial state when RFQ is created
      'Published',  // RFQ is open and available for suppliers
      'Active',    // RFQ has ongoing negotiations
      'Closed',    // RFQ is finalized and closed
      'Negotiated' // RFQ has completed negotiations
    ],
    default: 'Draft'
  },
  expiryDate: {
    type: Date,
    required: [true, 'Expiry date is required for the RFQ'],
    validate: {
      validator: function(value) {
        // Ensure expiry date is in the future
        return value > new Date();
      },
      message: 'Expiry date must be in the future'
    }
  },
  publishedAt: {
    type: Date
  },
  closedAt: {
    type: Date
  },
  negotiations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Negotiation'
  }],
  negotiationStatus: {
    type: String,
    enum: ['Not Negotiated', 'In Progress', 'Completed'],
    default: 'Not Negotiated'
  }
}, {
  timestamps: true
});

// Pre-save middleware to update status based on expiry date
RFQSchema.pre('save', function(next) {
  const now = new Date();

  // If RFQ is published and has expired
  if (this.status === 'Published' && this.expiryDate < now) {
    this.status = 'Closed';
    this.closedAt = now;
  }

  next();
});

// Method to check if RFQ is expired
RFQSchema.methods.isExpired = function() {
  return this.expiryDate < new Date();
};

// Static method to find active RFQs
RFQSchema.statics.findActiveRFQs = function() {
  return this.find({
    status: 'Published',
    expiryDate: { $gt: new Date() }
  });
};

export default mongoose.model('RFQ', RFQSchema);
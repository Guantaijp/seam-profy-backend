import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: [
      'Antibiotics', 
      'Painkillers', 
      'Vaccines', 
      'Diagnostics', 
      'Medical Supplies', 
      'Other'
    ],
    required: true
  },
  manufacturer: {
    type: String,
    required: false,
    trim: true
  },
  dosageForm: {
    type: String,
    enum: [
      'Tablet', 
      'Capsule', 
      'Injection', 
      'Syrup', 
      'Cream', 
      'Ointment', 
      'Other'
    ]
  },
  strength: {
    type: String,
    trim: true
  },
  quantityAvailable: {
    type: Number,
    required: true,
    min: 0
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  expiryDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['Available', 'Low Stock', 'Out of Stock', 'Expired'],
    default: 'Available'
  },
  batchNumber: {
    type: String,
    trim: true
  },
  storageConditions: {
    type: String,
    trim: true
  }
}, { timestamps: true });

// Middleware to update product status based on quantity and expiry
ProductSchema.pre('save', function(next) {
  // Update status based on quantity
  if (this.quantityAvailable === 0) {
    this.status = 'Out of Stock';
  } else if (this.quantityAvailable <= 10) {
    this.status = 'Low Stock';
  }

  // Check if product is expired
  if (new Date(this.expiryDate) < new Date()) {
    this.status = 'Expired';
  }

  next();
});

export default mongoose.model('Product', ProductSchema);
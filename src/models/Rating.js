import mongoose from 'mongoose';

// Rating Schema
const RatingSchema = new mongoose.Schema({
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  facilityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
//   orderId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Order',
//     required: true
//   },
  ratings: {
    price: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    delivery: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    quality: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    }
  },
  overallRating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    trim: true
  }
}, { timestamps: true });

// Ensure a facility can only rate an order once
RatingSchema.index({ orderId: 1 }, { unique: true });
export default mongoose.model('Rating', RatingSchema);
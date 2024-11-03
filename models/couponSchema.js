const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true
  },
  discountType: {
    type: String,
    enum: ['percentage', 'flat'], // 'percentage' or 'flat' discount
    required: true
  },
  discountValue: {
    type: Number,
    required: true
  },
  minPurchaseAmount: {
    type: Number, // Minimum purchase amount to use the coupon
    default: 0
  },
  maxDiscount: {
    type: Number, // Maximum discount limit, if applicable
    default: 0
  },
  expiryDate: {
    type: Date,
    required: true
  },
  usageLimit: {
    type: Number, // Number of times the coupon can be used
    default: 1
  },
  usersUsed: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isActive: {
    type: Boolean,
    default: true  // Coupons are active by default
  }
});

module.exports = mongoose.model('Coupon', couponSchema);

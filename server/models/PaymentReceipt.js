const mongoose = require('mongoose');

const paymentReceiptSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentDate: {
    type: Date,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'mobile_banking', 'other'],
    default: 'cash'
  },
  notes: {
    type: String,
    default: ''
  },
  week: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'confirmed'
  }
}, {
  timestamps: true
});

// Compound index for efficient querying
paymentReceiptSchema.index({ user: 1, year: 1, month: 1, week: 1 });
paymentReceiptSchema.index({ paymentDate: -1 });

module.exports = mongoose.model('PaymentReceipt', paymentReceiptSchema);
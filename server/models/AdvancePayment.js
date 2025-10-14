const mongoose = require('mongoose');

const advancePaymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    default: ''
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  paymentType: {
    type: String,
    enum: ['advance', 'due_clearance', 'deduction'],
    default: 'advance'
  },
  clearedDueAmount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('AdvancePayment', advancePaymentSchema);
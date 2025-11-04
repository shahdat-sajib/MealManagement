const mongoose = require('mongoose');

const dueAdjustmentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  week: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  adjustmentAmount: {
    type: Number,
    required: true
  },
  adjustmentType: {
    type: String,
    enum: ['credit', 'debit', 'clear_due'],
    required: true
  },
  previousBalance: {
    type: Number,
    required: true
  },
  newBalance: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    required: true
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
  adjustmentDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for efficient querying
dueAdjustmentSchema.index({ user: 1, year: 1, month: 1, week: 1 });
dueAdjustmentSchema.index({ adjustmentDate: -1 });

module.exports = mongoose.model('DueAdjustment', dueAdjustmentSchema);
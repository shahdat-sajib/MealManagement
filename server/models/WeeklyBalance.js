const mongoose = require('mongoose');

const weeklyBalanceSchema = new mongoose.Schema({
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
  weekStart: {
    type: Date,
    required: true
  },
  weekEnd: {
    type: Date,
    required: true
  },
  
  // Meal and Purchase Data
  totalMeals: {
    type: Number,
    default: 0
  },
  totalPurchases: {
    type: Number,
    default: 0
  },
  totalAdvancePayments: {
    type: Number,
    default: 0
  },
  totalExpense: {
    type: Number,
    default: 0
  },
  
  // Weekly Balance Calculation
  weeklyBalance: {
    type: Number,
    default: 0
  },
  advanceFromPreviousWeek: {
    type: Number,
    default: 0
  },
  advanceViaPurchase: {
    type: Number,
    default: 0
  },
  advanceViaPayments: {
    type: Number,
    default: 0
  },
  advanceToNextWeek: {
    type: Number,
    default: 0
  },
  
  // Status
  isDue: {
    type: Boolean,
    default: false
  },
  finalAmount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Due', 'Credit', 'Balanced'],
    default: 'Balanced'
  },
  
  // Calculation metadata
  calculatedAt: {
    type: Date,
    default: Date.now
  },
  recalculated: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound index for unique weekly records per user
weeklyBalanceSchema.index({ user: 1, year: 1, month: 1, week: 1 }, { unique: true });

// Index for efficient querying
weeklyBalanceSchema.index({ year: 1, month: 1, week: 1 });
weeklyBalanceSchema.index({ user: 1, weekStart: 1 });

module.exports = mongoose.model('WeeklyBalance', weeklyBalanceSchema);
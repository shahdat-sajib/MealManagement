const mongoose = require('mongoose');

const mealSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  mealType: {
    type: String,
    default: 'breakfast'
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  isScheduled: {
    type: Boolean,
    default: false
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Optional field to track who added the meal (for admin features)
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
mealSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Compound index for user and date to ensure one meal per user per day
mealSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Meal', mealSchema);
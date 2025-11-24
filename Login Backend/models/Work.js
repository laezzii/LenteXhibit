// models/Work.js
const mongoose = require('mongoose');

const workSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    enum: ['Photos', 'Graphics', 'Videos'],
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  // Featured work tracking
  isFeatured: {
    type: Boolean,
    default: false
  },
  featureStartDate: Date,
  featureEndDate: Date,
  // Voting and engagement
  voteCount: {
    type: Number,
    default: 0
  },
  // Flag tracking
  flags: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: {
      type: String,
      enum: ['Inappropriate Content', 'Copyright Violation', 'Spam', 'Other']
    },
    explanation: String,
    createdAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'dismissed'],
      default: 'pending'
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

workSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient queries
workSchema.index({ userId: 1, category: 1 });
workSchema.index({ voteCount: -1 });
workSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Work', workSchema);
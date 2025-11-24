// models/VotingTheme.js
const mongoose = require('mongoose');

const votingThemeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['Photos', 'Graphics', 'Videos', 'All'],
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['upcoming', 'active', 'closed'],
    default: 'upcoming'
  },
  winnerWorkId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Work',
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Automatically update status based on dates
votingThemeSchema.methods.updateStatus = function() {
  const now = new Date();
  if (now < this.startDate) {
    this.status = 'upcoming';
  } else if (now >= this.startDate && now <= this.endDate) {
    this.status = 'active';
  } else {
    this.status = 'closed';
  }
  return this.save();
};

module.exports = mongoose.model('VotingTheme', votingThemeSchema);
// models/Vote.js
const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  workId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Work',
    required: true
  },
  themeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VotingTheme',
    default: null // null for general voting, specific ID for theme voting
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure one vote per user per work per theme
voteSchema.index({ userId: 1, workId: 1, themeId: 1 }, { unique: true });

module.exports = mongoose.model('Vote', voteSchema);
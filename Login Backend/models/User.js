// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  userType: {
    type: String,
    enum: ['guest', 'member'],
    required: true
  },
  // Member-specific fields
  batchName: {
    type: String,
    required: function() { return this.userType === 'member'; }
  },
  cluster: {
    type: String,
    required: function() { return this.userType === 'member'; }
  },
  position: {
    type: String,
    required: function() { return this.userType === 'member'; }
  },
  // Member verification status
  isApproved: {
    type: Boolean,
    default: function() { return this.userType === 'guest'; } // Auto-approve guests
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Update lastLogin on each login
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = Date.now();
  return this.save();
};

module.exports = mongoose.model('User', userSchema);
/**
 * MongoDB Models for LenteXhibit
 * Defines schemas for User, Work, Portfolio, Theme, and Vote
 */

const mongoose = require('mongoose');

// User Schema
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
        enum: ['guest', 'member', 'admin'],
        default: 'guest'
    },
    // Member-specific fields
    batchName: {
        type: String,
        trim: true
    },
    cluster: {
        type: String,
        enum: ['Photography', 'Graphics', 'Videography', ''],
        default: ''
    },
    position: {
        type: String,
        trim: true
    },
    // Admin approval for members
    isApproved: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Work Schema
const workSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        enum: ['Photos', 'Graphics', 'Videos'],
        required: true
    },
    fileUrl: {
        type: String,
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    featured: {
        type: Boolean,
        default: false
    },
    voteCount: {
        type: Number,
        default: 0
    },
    themeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Theme'
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

// Update timestamp on save
workSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Portfolio Schema
const portfolioSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    title: {
        type: String,
        trim: true
    },
    bio: {
        type: String,
        trim: true
    },
    socialMedia: {
        type: String,
        trim: true
    },
    works: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Work'
    }],
    totalVotes: {
        type: Number,
        default: 0
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

// Theme Schema (for voting themes)
const themeSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
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
        enum: ['Upcoming', 'Active', 'Ended'],
        default: 'Upcoming'
    },
    submissions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Work'
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Vote Schema
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
        ref: 'Theme'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Ensure a user can only vote once per work
voteSchema.index({ userId: 1, workId: 1 }, { unique: true });

// Export models
module.exports = {
    User: mongoose.model('User', userSchema),
    Work: mongoose.model('Work', workSchema),
    Portfolio: mongoose.model('Portfolio', portfolioSchema),
    Theme: mongoose.model('Theme', themeSchema),
    Vote: mongoose.model('Vote', voteSchema)
};
// routes/portfolios.js - Portfolio management routes
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Portfolio = require('../models/Portfolio');
const Work = require('../models/Work');
const User = require('../models/User');
const { isAuthenticated } = require('./auth');

// Configure multer for profile photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/profiles/';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (['.jpg', '.jpeg', '.png'].includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file format. Please use JPG, JPEG, or PNG.'));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max for profile photos
  }
});

// GET /api/portfolios - Get all portfolios
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};

    // Search by member name
    if (search) {
      const users = await User.find({
        name: { $regex: search, $options: 'i' },
        userType: 'member',
        isApproved: true
      }).select('_id');
      
      const userIds = users.map(u => u._id);
      query.userId = { $in: userIds };
    }

    const portfolios = await Portfolio.find(query)
      .populate('userId', 'name email cluster position batchName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: portfolios.length,
      portfolios
    });

  } catch (error) {
    console.error('Fetch portfolios error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching portfolios' 
    });
  }
});

// GET /api/portfolios/:userId - Get member portfolio (B10_View_Member_Portfolio)
router.get('/:userId', async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ userId: req.params.userId })
      .populate('userId', 'name email cluster position batchName');

    if (!portfolio) {
      return res.status(404).json({ 
        success: false, 
        message: 'Portfolio not found' 
      });
    }

    // Get user's works
    const { category } = req.query;
    let workQuery = { userId: req.params.userId };
    
    if (category && category !== 'All') {
      workQuery.category = category;
    }

    const works = await Work.find(workQuery)
      .sort({ createdAt: -1 });

    // Get featured works for this user
    const now = new Date();
    const featuredWorks = await Work.find({
      userId: req.params.userId,
      isFeatured: true,
      featureStartDate: { $lte: now },
      featureEndDate: { $gte: now }
    });

    res.json({
      success: true,
      portfolio,
      works,
      featuredWorks
    });

  } catch (error) {
    console.error('Fetch portfolio error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching portfolio' 
    });
  }
});

// POST /api/portfolios - Create portfolio (B24_Create_Portfolio_Profile)
router.post('/', isAuthenticated, upload.single('profilePhoto'), async (req, res) => {
  try {
    // Check if portfolio already exists
    const existingPortfolio = await Portfolio.findOne({ userId: req.session.userId });
    if (existingPortfolio) {
      return res.status(400).json({ 
        success: false, 
        message: 'Portfolio already exists' 
      });
    }

    const { bio, specialization, contactInfo } = req.body;

    const portfolioData = {
      userId: req.session.userId,
      bio: bio || '',
      specialization: specialization ? JSON.parse(specialization) : [],
      contactInfo: contactInfo ? JSON.parse(contactInfo) : {}
    };

    if (req.file) {
      portfolioData.profilePhoto = req.file.path;
    }

    const portfolio = new Portfolio(portfolioData);
    await portfolio.save();

    res.status(201).json({
      success: true,
      message: 'Portfolio created successfully',
      portfolio
    });

  } catch (error) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Create portfolio error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error creating portfolio' 
    });
  }
});

// PUT /api/portfolios - Update portfolio (B26_Edit_Profile_Information)
router.put('/', isAuthenticated, upload.single('profilePhoto'), async (req, res) => {
  try {
    let portfolio = await Portfolio.findOne({ userId: req.session.userId });

    if (!portfolio) {
      return res.status(404).json({ 
        success: false, 
        message: 'Portfolio not found. Please create one first.' 
      });
    }

    const { bio, specialization, contactInfo } = req.body;

    // Update fields
    if (bio !== undefined) portfolio.bio = bio;
    if (specialization) {
      portfolio.specialization = typeof specialization === 'string' 
        ? JSON.parse(specialization) 
        : specialization;
    }
    if (contactInfo) {
      portfolio.contactInfo = typeof contactInfo === 'string' 
        ? JSON.parse(contactInfo) 
        : contactInfo;
    }

    // Handle profile photo update
    if (req.file) {
      // Delete old profile photo if exists
      if (portfolio.profilePhoto && fs.existsSync(portfolio.profilePhoto)) {
        fs.unlinkSync(portfolio.profilePhoto);
      }
      portfolio.profilePhoto = req.file.path;
    }

    await portfolio.save();

    res.json({
      success: true,
      message: 'Portfolio updated successfully',
      portfolio
    });

  } catch (error) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Update portfolio error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error updating portfolio' 
    });
  }
});

// GET /api/portfolios/me/featured - Get user's featured works status (B34_View_Featured_Works_Status)
router.get('/me/featured', isAuthenticated, async (req, res) => {
  try {
    const now = new Date();
    const featuredWorks = await Work.find({
      userId: req.session.userId,
      isFeatured: true,
      featureStartDate: { $lte: now },
      featureEndDate: { $gte: now }
    });

    res.json({
      success: true,
      count: featuredWorks.length,
      works: featuredWorks
    });

  } catch (error) {
    console.error('Fetch featured works error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching featured works' 
    });
  }
});

module.exports = router;
// routes/users.js - User management routes
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Portfolio = require('../models/Portfolio');

// POST /api/users/register - User registration (B1_Guest, B22_Member)
router.post('/register', async (req, res) => {
  try {
    const { name, email, userType, batchName, cluster, position } = req.body;

    // Validation
    if (!name || !email || !userType) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, email, and user type are required' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email format' 
      });
    }

    // For members, validate UP Mail
    if (userType === 'member') {
      if (!email.endsWith('@up.edu.ph')) {
        return res.status(400).json({ 
          success: false, 
          message: 'Members must use a valid UP Mail address (@up.edu.ph)' 
        });
      }

      // Validate member-specific fields
      if (!batchName || !cluster || !position) {
        return res.status(400).json({ 
          success: false, 
          message: 'Batch, cluster, and position are required for members' 
        });
      }
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ 
        success: false, 
        message: 'Email already registered. Please log in instead.' 
      });
    }

    // Create new user
    const userData = {
      name,
      email: email.toLowerCase(),
      userType
    };

    // Add member-specific data
    if (userType === 'member') {
      userData.batchName = batchName;
      userData.cluster = cluster;
      userData.position = position;
      userData.isApproved = false; // Requires admin approval
    }

    const user = new User(userData);
    await user.save();

    // For guests, create session immediately
    if (userType === 'guest') {
      req.session.userId = user._id;
      req.session.userType = user.userType;
    }

    res.status(201).json({
      success: true,
      message: userType === 'member' 
        ? 'Member registration successful. Your account is pending approval.' 
        : 'Guest account created successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        isApproved: user.isApproved
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during registration' 
    });
  }
});

// GET /api/users/pending - Get pending member approvals (Admin only)
router.get('/pending', async (req, res) => {
  try {
    // Check admin access
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const admin = await User.findById(req.session.userId);
    if (!admin || admin.position !== 'President') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const pendingUsers = await User.find({ 
      userType: 'member', 
      isApproved: false,
      isActive: true 
    }).select('-__v').sort({ createdAt: -1 });

    res.json({
      success: true,
      count: pendingUsers.length,
      users: pendingUsers
    });

  } catch (error) {
    console.error('Fetch pending users error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching pending users' 
    });
  }
});

// PUT /api/users/:userId/approve - Approve member (B35_Approve_Membership)
router.put('/:userId/approve', async (req, res) => {
  try {
    // Check admin access
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const admin = await User.findById(req.session.userId);
    if (!admin || admin.position !== 'President') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { userId } = req.params;
    const { approved } = req.body; // true for approve, false for reject

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.userType !== 'member') {
      return res.status(400).json({ success: false, message: 'Only members require approval' });
    }

    if (approved) {
      user.isApproved = true;
      await user.save();

      // Create portfolio for approved member
      const portfolio = new Portfolio({ userId: user._id });
      await portfolio.save();

      res.json({
        success: true,
        message: 'Member approved successfully',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          isApproved: user.isApproved
        }
      });
    } else {
      // Reject - delete the user account
      await User.findByIdAndDelete(userId);
      res.json({
        success: true,
        message: 'Member registration rejected'
      });
    }

  } catch (error) {
    console.error('Approve member error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during approval' 
    });
  }
});

// GET /api/users/inactive - Get inactive members (B36_View_Inactive_Members)
router.get('/inactive', async (req, res) => {
  try {
    // Check admin access
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const admin = await User.findById(req.session.userId);
    if (!admin || admin.position !== 'President') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const inactivityMonths = parseInt(req.query.months) || 6;
    const inactivityDate = new Date();
    inactivityDate.setMonth(inactivityDate.getMonth() - inactivityMonths);

    const inactiveUsers = await User.find({
      userType: 'member',
      isActive: true,
      lastLogin: { $lt: inactivityDate }
    }).select('-__v').sort({ lastLogin: 1 });

    res.json({
      success: true,
      inactivityPeriod: `${inactivityMonths} months`,
      count: inactiveUsers.length,
      users: inactiveUsers
    });

  } catch (error) {
    console.error('Fetch inactive users error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching inactive users' 
    });
  }
});

// PUT /api/users/:userId/reactivate - Reactivate member (B38_Reactivate_Member)
router.put('/:userId/reactivate', async (req, res) => {
  try {
    // Check admin access
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const admin = await User.findById(req.session.userId);
    if (!admin || admin.position !== 'President') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.isActive = true;
    await user.save();

    res.json({
      success: true,
      message: 'Member reactivated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isActive: user.isActive
      }
    });

  } catch (error) {
    console.error('Reactivate member error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error reactivating member' 
    });
  }
});

// PUT /api/users/:userId/archive - Archive member (B39_Archive_Member)
router.put('/:userId/archive', async (req, res) => {
  try {
    // Check admin access
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const admin = await User.findById(req.session.userId);
    if (!admin || admin.position !== 'President') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.isActive = false;
    await user.save();

    res.json({
      success: true,
      message: 'Member archived successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isActive: user.isActive
      }
    });

  } catch (error) {
    console.error('Archive member error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error archiving member' 
    });
  }
});

module.exports = router;
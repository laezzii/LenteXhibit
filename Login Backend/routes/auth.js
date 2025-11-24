// routes/auth.js - Authentication routes
const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ success: false, message: 'Not authenticated' });
};

// Middleware to check if user is admin (President)
const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.session.userId);
    if (user && user.position === 'President') {
      return next();
    }
    return res.status(403).json({ success: false, message: 'Admin access required' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Authorization error' });
  }
};

// POST /api/auth/login - User login
router.post('/login', async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email || !name) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and name are required' 
      });
    }

    // Find user by email
    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found. Please sign up first.' 
      });
    }

    // Check if member account is approved
    if (user.userType === 'member' && !user.isApproved) {
      return res.status(403).json({ 
        success: false, 
        message: 'Your account is pending approval from the administrator.' 
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({ 
        success: false, 
        message: 'Your account has been deactivated. Please contact the administrator.' 
      });
    }

    // Update last login
    await user.updateLastLogin();

    // Create session
    req.session.userId = user._id;
    req.session.userType = user.userType;

    // Return user data (excluding sensitive info)
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        batchName: user.batchName,
        cluster: user.cluster,
        position: user.position
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login' 
    });
  }
});

// POST /api/auth/logout - User logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: 'Logout failed' 
      });
    }
    res.clearCookie('connect.sid');
    res.json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
  });
});

// GET /api/auth/verify - Check authentication status
router.get('/verify', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('-__v');
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      authenticated: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        batchName: user.batchName,
        cluster: user.cluster,
        position: user.position,
        isApproved: user.isApproved
      }
    });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Verification error' 
    });
  }
});

// Export middleware for use in other routes
module.exports = router;
module.exports.isAuthenticated = isAuthenticated;
module.exports.isAdmin = isAdmin;
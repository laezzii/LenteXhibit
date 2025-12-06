/**
 * Authentication Routes - FULLY FIXED
 * Handles signup, login, logout, and session verification.
 */

const express = require('express');
const router = express.Router();
const { User, Portfolio } = require('../models');

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.status(401).json({
            success: false,
            message: 'Not authenticated'
        });
    }
};

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
    try {
        const user = await User.findById(req.session.userId);
        if (user && user.userType === 'admin') {
            next();
        } else {
            res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error checking admin status'
        });
    }
};

// Sign up - FIXED with explicit session save
router.post('/signup', async (req, res) => {
    try {
        const {name, email, userType, batchName, cluster, position} = req.body;

        console.log('📝 Signup attempt:', { email, userType });

        // Validate required fields
        if (!name || !email || !userType) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, and userType are required'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({email});
        if (existingUser) {
            console.log('⚠️ User already exists:', email);
            return res.status(409).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Validate member email domain
        if (userType === 'member' && !email.endsWith('@up.edu.ph')) {
            return res.status(400).json({
                success: false,
                message: 'Member email must be a valid UP address'
            });
        }

        // Create new user
        const userData = {
            name,
            email,
            userType,
            isApproved: (userType === 'guest' || userType === 'member')
        };

        // Add member-specific fields
        if (userType === 'member') {
            userData.batchName = batchName;
            userData.cluster = cluster;
            userData.position = position;
        }
        
        const newUser = new User(userData);
        await newUser.save();

        console.log('✅ User created:', newUser._id);

        // Auto-login guests and members
        if (userType === 'guest' || userType === 'member') {
            req.session.userId = newUser._id;
            req.session.userType = newUser.userType;

            console.log('💾 Saving session for new user:', newUser._id);

            // Save session explicitly before responding
            try {
                await new Promise((resolve, reject) => {
                    req.session.save((err) => {
                        if (err) {
                            console.error('❌ Session save error:', err);
                            reject(err);
                        } else {
                            console.log('✅ Session saved successfully');
                            resolve();
                        }
                    });
                });
            } catch (sessionError) {
                console.error('❌ Failed to save session:', sessionError);
                return res.status(500).json({
                    success: false,
                    message: 'Account created but failed to log in automatically',
                    error: sessionError.message
                });
            }

            return res.json({
                success: true,
                message: `${userType.charAt(0).toUpperCase() + userType.slice(1)} account created and logged in`,
                user: {
                    _id: newUser._id,
                    name: newUser.name,
                    email: newUser.email,
                    userType: newUser.userType,
                    isApproved: newUser.isApproved
                }
            });
        }

        // For other types
        res.json({
            success: true,
            message: 'Account created',
            user: {
                _id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                userType: newUser.userType,
                isApproved: newUser.isApproved
            }
        });
    } catch (error) {
        console.error('❌ Signup error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Error during signup',
            error: error.message
        });
    }
});

// Log In - FIXED with proper error handling
router.post('/login', async (req, res) => {
    try {
        const {email} = req.body;

        console.log('🔐 Login attempt for:', email);

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        // Find user by email
        const user = await User.findOne({email});
        
        console.log('👤 User found:', user ? user._id : 'null');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if member is approved
        if (user.userType === 'member' && !user.isApproved) {
            return res.status(403).json({
                success: false,
                message: 'Member account not approved yet'
            });
        }

        // Create session
        req.session.userId = user._id;
        req.session.userType = user.userType;

        console.log('💾 Saving session for user:', user._id);

        // Save session explicitly before responding
        try {
            await new Promise((resolve, reject) => {
                req.session.save((err) => {
                    if (err) {
                        console.error('❌ Session save error:', err);
                        reject(err);
                    } else {
                        console.log('✅ Session saved successfully for user:', user._id);
                        resolve();
                    }
                });
            });
        } catch (sessionError) {
            console.error('❌ Failed to save session:', sessionError);
            return res.status(500).json({
                success: false,
                message: 'Failed to create session',
                error: sessionError.message
            });
        }

        // Build response user object safely
        const responseUser = {
            _id: user._id,
            name: user.name,
            email: user.email,
            userType: user.userType
        };

        // Add optional fields only if they exist
        if (user.cluster) responseUser.cluster = user.cluster;
        if (user.batchName) responseUser.batchName = user.batchName;
        if (user.position) responseUser.position = user.position;

        console.log('✅ Login successful for:', user.email);

        res.json({
            success: true,
            message: 'Login successful',
            user: responseUser
        });
    } catch (error) {
        console.error('❌ Login error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Error during login',
            error: error.message
        });
    }
});

// Verify Session
router.get('/verify', async (req, res) => {
    try {
        console.log('🔍 Verifying session, userId:', req.session.userId);

        if (!req.session.userId) {
            return res.json({
                success: false,
                message: 'Not authenticated'
            });
        }

        const user = await User.findById(req.session.userId).select('-__v');
        if (!user) {
            console.log('⚠️ User not found, destroying session');
            req.session.destroy();
            return res.json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if member has a portfolio
        let hasPortfolio = false;
        let portfolioId = null;
        if (user.userType === 'member') {
            const portfolio = await Portfolio.findOne({ userId: user._id });
            if (portfolio) {
                hasPortfolio = true;
                portfolioId = portfolio._id.toString();
            }
        }

        console.log('✅ Session verified for:', user.email);

        res.json({
            success: true,
            user: {
                _id: user._id.toString(),
                name: user.name,
                email: user.email,
                userType: user.userType,
                isApproved: user.isApproved,
                cluster: user.cluster,
                batchName: user.batchName,
                position: user.position,
                hasPortfolio: hasPortfolio,
                portfolioId: portfolioId
            }
        });
    } catch (error) {
        console.error('❌ Verify error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Error verifying session',
            error: error.message
        });
    }
});

// Log Out
router.post('/logout', (req, res) => {
    console.log('🚪 Logout request');
    req.session.destroy((err) => {
        if (err) {
            console.error('❌ Logout error:', err);
            return res.status(500).json({
                success: false,
                message: 'Error logging out'
            });
        }
        res.clearCookie('lentexhibit.sid');
        console.log('✅ Logged out successfully');
        res.json({
            success: true,
            message: 'Logout successful'
        });
    });
});

// Admin: Approve Member
router.put('/approve/:userId', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.userType !== 'member') {
            return res.status(400).json({
                success: false,
                message: 'Only members need approval'
            });
        }

        user.isApproved = true;
        await user.save();

        res.json({
            success: true,
            message: 'Member approved successfully',
            user
        });

    } catch (error) {
        console.error('Approve error:', error);
        res.status(500).json({
            success: false,
            message: 'Error approving member',
            error: error.message
        });
    }
});

// Admin: Get Pending Approvals
router.get('/pending', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const pendingUsers = await User.find({ 
            userType: 'member', 
            isApproved: false 
        }).select('-__v');

        res.json({
            success: true,
            users: pendingUsers
        });

    } catch (error) {
        console.error('Error fetching pending users:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching pending approvals',
            error: error.message
        });
    }
});

module.exports = router;
module.exports.isAuthenticated = isAuthenticated;
module.exports.isAdmin = isAdmin;
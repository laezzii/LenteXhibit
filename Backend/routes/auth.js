/**
 * Authentication Routes - FIXED SESSION PERSISTENCE
 * Handles signup, login, logout, and session verification.
 */

const express = require('express');
const router = express.Router();
const { User, Portfolio } = require('../models');

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    console.log('🔐 Auth check - Session ID:', req.sessionID);
    console.log('🔐 Auth check - User ID:', req.session?.userId);
    
    if (req.session && req.session.userId) {
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

// Sign up - FIXED SESSION CREATION
router.post('/signup', async (req, res) => {
    try {
        const {name, email, userType, batchName, cluster, position} = req.body;

        console.log('📝 Signup request:', { name, email, userType });

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
            return res.status(409).json({
                success: false,
                message: 'User with this email already exists. Would you like to log in instead?'
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
            // CRITICAL: Force session regeneration for security
            req.session.regenerate((err) => {
                if (err) {
                    console.error('❌ Session regeneration error:', err);
                    return res.status(500).json({
                        success: false,
                        message: 'Error creating session'
                    });
                }

                // Set session data
                req.session.userId = newUser._id.toString();
                req.session.userType = newUser.userType;
                req.session.userName = newUser.name;

                // CRITICAL: Force save session before responding
                req.session.save((err) => {
                    if (err) {
                        console.error('❌ Session save error:', err);
                        return res.status(500).json({
                            success: false,
                            message: 'Error saving session'
                        });
                    }

                    console.log('✅ Session created:', {
                        sessionID: req.sessionID,
                        userId: req.session.userId,
                        userType: req.session.userType
                    });

                    res.json({
                        success: true,
                        message: `${userType.charAt(0).toUpperCase() + userType.slice(1)} account created and logged in`,
                        user: {
                            _id: newUser._id.toString(),
                            name: newUser.name,
                            email: newUser.email,
                            userType: newUser.userType,
                            isApproved: newUser.isApproved,
                            cluster: newUser.cluster,
                            batchName: newUser.batchName,
                            position: newUser.position
                        },
                        sessionID: req.sessionID
                    });
                });
            });
        } else {
            // For other types (shouldn't happen), return created info
            res.json({
                success: true,
                message: 'Account created',
                user: {
                    _id: newUser._id.toString(),
                    name: newUser.name,
                    email: newUser.email,
                    userType: newUser.userType,
                    isApproved: newUser.isApproved
                }
            });
        }
    } catch (error) {
        console.error('❌ Signup error:', error);
        res.status(500).json({
            success: false,
            message: 'Error during signup',
            error: error.message
        });
    }
});

// Log In - FIXED SESSION CREATION
router.post('/login', async (req, res) => {
    try {
        const {email} = req.body;

        console.log('🔑 Login request for:', email);

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        // Find user by email
        const user = await User.findOne({email});
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

        console.log('✅ User found:', user._id);

        // CRITICAL: Regenerate session for security
        req.session.regenerate((err) => {
            if (err) {
                console.error('❌ Session regeneration error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Error creating session'
                });
            }

            // Set session data
            req.session.userId = user._id.toString();
            req.session.userType = user.userType;
            req.session.userName = user.name;

            // CRITICAL: Force save session before responding
            req.session.save((err) => {
                if (err) {
                    console.error('❌ Session save error:', err);
                    return res.status(500).json({
                        success: false,
                        message: 'Error saving session'
                    });
                }

                console.log('✅ Session created:', {
                    sessionID: req.sessionID,
                    userId: req.session.userId,
                    userType: req.session.userType
                });

                res.json({
                    success: true,
                    message: 'Login successful',
                    user: {
                        _id: user._id.toString(),
                        name: user.name,
                        email: user.email,
                        userType: user.userType,
                        cluster: user.cluster,
                        batchName: user.batchName,
                        position: user.position
                    },
                    sessionID: req.sessionID
                });
            });
        });
    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Error during login',
            error: error.message
        });
    }
});

// Verify Session - ENHANCED LOGGING
router.get('/verify', async (req, res) => {
    try {
        console.log('🔍 Verify request - Session ID:', req.sessionID);
        console.log('🔍 Verify request - Session data:', req.session);
        console.log('🔍 Verify request - Cookies:', req.headers.cookie);

        if (!req.session || !req.session.userId) {
            console.log('❌ No session or userId found');
            return res.json({
                success: false,
                message: 'Not authenticated',
                debug: {
                    hasSession: !!req.session,
                    sessionID: req.sessionID,
                    hasCookie: !!req.headers.cookie
                }
            });
        }

        const user = await User.findById(req.session.userId).select('-__v');
        if (!user) {
            console.log('❌ User not found in database');
            req.session.destroy();
            return res.json({
                success: false,
                message: 'User not found'
            });
        }

        console.log('✅ User verified:', user._id);

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
            },
            sessionID: req.sessionID
        });
    } catch (error) {
        console.error('❌ Verify error:', error);
        res.status(500).json({
            success: false,
            message: 'Error verifying session',
            error: error.message
        });
    }
});

// Log Out - PROPER SESSION CLEANUP
router.post('/logout', (req, res) => {
    console.log('👋 Logout request for session:', req.sessionID);

    if (!req.session) {
        return res.json({
            success: true,
            message: 'Already logged out'
        });
    }

    req.session.destroy((err) => {
        if (err) {
            console.error('❌ Logout error:', err);
            return res.status(500).json({
                success: false,
                message: 'Error logging out'
            });
        }
        
        res.clearCookie('lentexhibit.sid');
        console.log('✅ Session destroyed and cookie cleared');
        
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
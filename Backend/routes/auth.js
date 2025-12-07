/**
 * Authentication Routes - FIXED SESSION HANDLING
 * Handles signup, login, logout, and session verification.
 */

const express = require('express');
const router = express.Router();
const { User, Portfolio } = require('../models');

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    console.log('🔒 isAuthenticated check - Session:', req.session);
    console.log('🔒 Session ID:', req.sessionID);
    console.log('🔒 User ID in session:', req.session.userId);
    
    if (req.session && req.session.userId) {
        console.log('✅ User is authenticated');
        next();
    } else {
        console.log('❌ User not authenticated');
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

// Sign up
router.post('/signup', async (req, res) => {
    try {
        const {name, email, userType, batchName, cluster, position} = req.body;

        console.log('📝 Signup attempt:', { name, email, userType });

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
            // CRITICAL: Ensure session is saved before responding
            req.session.userId = newUser._id.toString();
            req.session.userType = newUser.userType;
            
            // Force session save and wait for it
            await new Promise((resolve, reject) => {
                req.session.save((err) => {
                    if (err) {
                        console.error('❌ Session save error:', err);
                        reject(err);
                    } else {
                        console.log('✅ Session saved successfully');
                        console.log('📋 Session data after save:', req.session);
                        console.log('🆔 Session ID:', req.sessionID);
                        resolve();
                    }
                });
            });

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

        // For any other types (e.g., admin), return created info
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
        res.status(500).json({
            success: false,
            message: 'Error during signup',
            error: error.message
        });
    }
});

// Log In
router.post('/login', async (req, res) => {
    try {
        const {email} = req.body;

        console.log('🔑 Login attempt:', email);

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

        console.log('👤 User found:', user._id);

        // Check if member is approved
        if (user.userType === 'member' && !user.isApproved) {
            return res.status(403).json({
                success: false,
                message: 'Member account not approved yet'
            });
        }

        // CRITICAL: Set session and force save
        req.session.userId = user._id.toString();
        req.session.userType = user.userType;
        
        // Force session save and wait for it
        await new Promise((resolve, reject) => {
            req.session.save((err) => {
                if (err) {
                    console.error('❌ Session save error:', err);
                    reject(err);
                } else {
                    console.log('✅ Session saved successfully');
                    console.log('📋 Session data after save:', req.session);
                    console.log('🆔 Session ID:', req.sessionID);
                    resolve();
                }
            });
        });

        res.json({
            success: true,
            message: 'Login successful',
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                userType: user.userType,
                cluster: user.cluster,
                batchName: user.batchName,
                position: user.position
            }
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

// Verify Session - CRITICAL ENDPOINT
router.get('/verify', async (req, res) => {
    try {
        console.log('🔍 ========== VERIFY ENDPOINT CALLED ==========');
        console.log('🆔 Session ID:', req.sessionID);
        console.log('📦 Full Session Object:', JSON.stringify(req.session, null, 2));
        console.log('👤 User ID in session:', req.session.userId);
        console.log('🍪 Cookies:', req.headers.cookie);
        console.log('================================================');
        
        // Check if session exists and has userId
        if (!req.session) {
            console.log('❌ No session object');
            return res.json({
                success: false,
                message: 'No session found'
            });
        }

        if (!req.session.userId) {
            console.log('❌ No userId in session');
            return res.json({
                success: false,
                message: 'Not authenticated'
            });
        }

        console.log('✅ Session exists with userId:', req.session.userId);

        // Find user in database
        const user = await User.findById(req.session.userId).select('-__v');
        
        if (!user) {
            console.log('❌ User not found in database for ID:', req.session.userId);
            // Destroy invalid session
            req.session.destroy();
            return res.json({
                success: false,
                message: 'User not found'
            });
        }

        console.log('✅ User verified:', user.name, '(', user.email, ')');

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

        // Touch session to keep it alive
        req.session.touch();

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
        console.error('Stack trace:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Error verifying session',
            error: error.message
        });
    }
});

// Log Out
router.post('/logout', (req, res) => {
    console.log('👋 Logout called for session:', req.sessionID);
    
    req.session.destroy((err) => {
        if (err) {
            console.error('❌ Logout error:', err);
            return res.status(500).json({
                success: false,
                message: 'Error logging out'
            });
        }
        
        console.log('✅ Session destroyed');
        
        res.clearCookie('lentexhibit.sid', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
        });
        
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
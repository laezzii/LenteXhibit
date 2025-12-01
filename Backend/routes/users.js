/**
 * User Routes
 * Handles user profile operations and admin user management
 */

const express = require('express');
const router = express.Router();
const { User, Portfolio, Work } = require('../models');
const { isAuthenticated, isAdmin } = require('./auth');

// Get All Users (Admin only)
router.get('/', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { userType, cluster, isApproved, search, limit = 50, skip = 0 } = req.query;

        // Build query
        const query = {};
        
        if (userType && userType !== 'all') {
            query.userType = userType;
        }
        
        if (cluster) {
            query.cluster = cluster;
        }
        
        if (isApproved !== undefined) {
            query.isApproved = isApproved === 'true';
        }
        
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const users = await User.find(query)
            .select('-__v')
            .sort('-createdAt')
            .limit(parseInt(limit))
            .skip(parseInt(skip));

        const totalUsers = await User.countDocuments(query);

        res.json({
            success: true,
            users,
            count: users.length,
            total: totalUsers
        });

    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching users',
            error: error.message
        });
    }
});

// Get User by ID
router.get('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-__v');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get user's portfolio if they're a member
        let portfolio = null;
        if (user.userType === 'member') {
            portfolio = await Portfolio.findOne({ userId: user._id })
                .populate('works', 'title category voteCount featured');
        }

        res.json({
            success: true,
            user,
            portfolio
        });

    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user',
            error: error.message
        });
    }
});

// Get Current User Profile
router.get('/profile/me', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId).select('-__v');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get user's portfolio and works
        let portfolio = null;
        let works = [];
        
        if (user.userType === 'member') {
            portfolio = await Portfolio.findOne({ userId: user._id });
            works = await Work.find({ userId: user._id })
                .sort('-createdAt')
                .limit(10);
        }

        res.json({
            success: true,
            user,
            portfolio,
            works,
            worksCount: works.length
        });

    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching profile',
            error: error.message
        });
    }
});

// Update User Profile
router.put('/profile/me', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const { name, batchName, cluster, position } = req.body;

        // Update allowed fields
        if (name) user.name = name;
        
        // Only members can update these fields
        if (user.userType === 'member') {
            if (batchName) user.batchName = batchName;
            if (cluster) user.cluster = cluster;
            if (position) user.position = position;
        }

        await user.save();

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user
        });

    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating profile',
            error: error.message
        });
    }
});

// Delete User Account
router.delete('/profile/me', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;

        // Delete user's portfolio
        await Portfolio.deleteOne({ userId });

        // Delete user's works
        await Work.deleteMany({ userId });

        // Delete user
        await User.findByIdAndDelete(userId);

        // Destroy session
        req.session.destroy();

        res.json({
            success: true,
            message: 'Account deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting account:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting account',
            error: error.message
        });
    }
});

// Admin: Update User
router.put('/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const { name, email, userType, batchName, cluster, position, isApproved } = req.body;

        if (name) user.name = name;
        if (email) user.email = email;
        if (userType) user.userType = userType;
        if (batchName !== undefined) user.batchName = batchName;
        if (cluster !== undefined) user.cluster = cluster;
        if (position !== undefined) user.position = position;
        if (isApproved !== undefined) user.isApproved = isApproved;

        await user.save();

        res.json({
            success: true,
            message: 'User updated successfully',
            user
        });

    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating user',
            error: error.message
        });
    }
});

// Admin: Delete User
router.delete('/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Don't allow deleting admin users
        if (user.userType === 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Cannot delete admin users'
            });
        }

        // Delete user's portfolio
        await Portfolio.deleteOne({ userId: user._id });

        // Delete user's works
        await Work.deleteMany({ userId: user._id });

        // Delete user
        await User.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'User deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting user',
            error: error.message
        });
    }
});

// Get User Statistics
router.get('/stats/overview', async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalMembers = await User.countDocuments({ userType: 'member', isApproved: true });
        const totalGuests = await User.countDocuments({ userType: 'guest' });
        const pendingApprovals = await User.countDocuments({ userType: 'member', isApproved: false });

        // Get cluster distribution
        const photographyCount = await User.countDocuments({ cluster: 'Photography' });
        const graphicsCount = await User.countDocuments({ cluster: 'Graphics' });
        const videographyCount = await User.countDocuments({ cluster: 'Videography' });

        // Get recent members
        const recentMembers = await User.find({ userType: 'member', isApproved: true })
            .sort('-createdAt')
            .limit(5)
            .select('name email cluster batchName createdAt');

        res.json({
            success: true,
            stats: {
                totalUsers,
                totalMembers,
                totalGuests,
                pendingApprovals,
                clusterDistribution: {
                    Photography: photographyCount,
                    Graphics: graphicsCount,
                    Videography: videographyCount
                },
                recentMembers
            }
        });

    } catch (error) {
        console.error('Error fetching user stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user statistics',
            error: error.message
        });
    }
});

module.exports = router;
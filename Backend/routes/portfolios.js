/**
 * Portfolio Routes
 * Handles portfolio CRUD operations for members
 */

const express = require('express');
const router = express.Router();
const { Portfolio, User, Work } = require('../models');
const { isAuthenticated } = require('./auth');

// Get All Portfolios (with filters)
router.get('/', async (req, res) => {
    try {
        const { cluster, search, limit = 50, skip = 0 } = req.query;

        // Build query for users
        const userQuery = { 
            userType: 'member',
            isApproved: true
        };
        
        if (cluster && cluster !== 'All') {
            userQuery.cluster = cluster;
        }
        
        if (search) {
            userQuery.name = { $regex: search, $options: 'i' };
        }

        // Find matching users
        const users = await User.find(userQuery).select('_id');
        const userIds = users.map(u => u._id);

        // Find portfolios for these users
        const portfolios = await Portfolio.find({ userId: { $in: userIds } })
            .populate('userId', 'name email cluster position batchName')
            .populate({
                path: 'works',
                select: 'title category voteCount featured createdAt',
                options: { limit: 5, sort: '-createdAt' }
            })
            .limit(parseInt(limit))
            .skip(parseInt(skip))
            .sort('-createdAt');

        res.json({
            success: true,
            portfolios,
            count: portfolios.length
        });

    } catch (error) {
        console.error('Error fetching portfolios:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching portfolios',
            error: error.message
        });
    }
});

// Get Portfolio by ID
router.get('/:id', async (req, res) => {
    try {
        const portfolio = await Portfolio.findById(req.params.id)
            .populate('userId', 'name email cluster position batchName')
            .populate({
                path: 'works',
                populate: {
                    path: 'userId',
                    select: 'name'
                }
            });

        if (!portfolio) {
            return res.status(404).json({
                success: false,
                message: 'Portfolio not found'
            });
        }

        res.json({
            success: true,
            portfolio
        });

    } catch (error) {
        console.error('Error fetching portfolio:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching portfolio',
            error: error.message
        });
    }
});

// Get Portfolio by User ID
router.get('/user/:userId', async (req, res) => {
    try {
        const portfolio = await Portfolio.findOne({ userId: req.params.userId })
            .populate('userId', 'name email cluster position batchName')
            .populate({
                path: 'works',
                populate: {
                    path: 'userId',
                    select: 'name'
                }
            });

        if (!portfolio) {
            return res.status(404).json({
                success: false,
                message: 'Portfolio not found'
            });
        }

        res.json({
            success: true,
            portfolio
        });

    } catch (error) {
        console.error('Error fetching portfolio:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching portfolio',
            error: error.message
        });
    }
});

// Create Portfolio (Members only)
router.post('/', isAuthenticated, async (req, res) => {
    try {
        // Check if user is a member
        const user = await User.findById(req.session.userId);
        if (user.userType !== 'member') {
            return res.status(403).json({
                success: false,
                message: 'Only members can create portfolios'
            });
        }

        // Check if portfolio already exists
        const existingPortfolio = await Portfolio.findOne({ userId: req.session.userId });
        if (existingPortfolio) {
            return res.status(400).json({
                success: false,
                message: 'Portfolio already exists for this user'
            });
        }

        const { title, bio, socialMedia } = req.body;

        const newPortfolio = new Portfolio({
            userId: req.session.userId,
            title: title || `${user.name}'s Portfolio`,
            bio: bio || '',
            socialMedia: socialMedia || ''
        });

        await newPortfolio.save();
        await newPortfolio.populate('userId', 'name email cluster position batchName');

        res.status(201).json({
            success: true,
            message: 'Portfolio created successfully',
            portfolio: newPortfolio
        });

    } catch (error) {
        console.error('Error creating portfolio:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating portfolio',
            error: error.message
        });
    }
});

// Update Portfolio (Owner only)
router.put('/:id', isAuthenticated, async (req, res) => {
    try {
        const portfolio = await Portfolio.findById(req.params.id);
        
        if (!portfolio) {
            return res.status(404).json({
                success: false,
                message: 'Portfolio not found'
            });
        }

        // Check if user is owner
        if (portfolio.userId.toString() !== req.session.userId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this portfolio'
            });
        }

        const { title, bio, socialMedia } = req.body;
        
        if (title) portfolio.title = title;
        if (bio !== undefined) portfolio.bio = bio;
        if (socialMedia !== undefined) portfolio.socialMedia = socialMedia;
        
        portfolio.updatedAt = Date.now();

        await portfolio.save();
        await portfolio.populate('userId', 'name email cluster position batchName');

        res.json({
            success: true,
            message: 'Portfolio updated successfully',
            portfolio
        });

    } catch (error) {
        console.error('Error updating portfolio:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating portfolio',
            error: error.message
        });
    }
});

// Delete Portfolio (Owner only)
router.delete('/:id', isAuthenticated, async (req, res) => {
    try {
        const portfolio = await Portfolio.findById(req.params.id);
        
        if (!portfolio) {
            return res.status(404).json({
                success: false,
                message: 'Portfolio not found'
            });
        }

        // Check if user is owner
        if (portfolio.userId.toString() !== req.session.userId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this portfolio'
            });
        }

        await Portfolio.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'Portfolio deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting portfolio:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting portfolio',
            error: error.message
        });
    }
});

// Update Total Votes (called internally when votes change)
router.patch('/:id/votes', async (req, res) => {
    try {
        const portfolio = await Portfolio.findById(req.params.id).populate('works');
        
        if (!portfolio) {
            return res.status(404).json({
                success: false,
                message: 'Portfolio not found'
            });
        }

        // Calculate total votes from all works
        const totalVotes = portfolio.works.reduce((sum, work) => sum + (work.voteCount || 0), 0);
        portfolio.totalVotes = totalVotes;
        
        await portfolio.save();

        res.json({
            success: true,
            totalVotes
        });

    } catch (error) {
        console.error('Error updating portfolio votes:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating portfolio votes',
            error: error.message
        });
    }
});

module.exports = router;
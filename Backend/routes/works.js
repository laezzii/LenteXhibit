/**
 * Work Routes
 * Handles CRUD operations for works (photos, graphics, videos)
 */

const express = require('express');
const router = express.Router();
const { Work, Portfolio, User } = require('../models');
const { isAuthenticated, isAdmin } = require('./auth');

// Get All Works (with filters)
router.get('/', async (req, res) => {
    try {
        const { 
            category, 
            featured, 
            search, 
            userId,
            themeId,
            limit = 50,
            skip = 0,
            sort = '-createdAt'
        } = req.query;

        // Build query
        const query = {};
        
        if (category && category !== 'All') {
            query.category = category;
        }
        
        if (featured === 'true') {
            query.featured = true;
        }
        
        if (userId) {
            query.userId = userId;
        }

        if (themeId) {
            query.themeId = themeId;
        }
        
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Execute query
        const works = await Work.find(query)
            .populate('userId', 'name email cluster position batchName')
            .populate('themeId', 'title')
            .sort(sort)
            .limit(parseInt(limit))
            .skip(parseInt(skip));

        res.json({
            success: true,
            works,
            count: works.length
        });

    } catch (error) {
        console.error('Error fetching works:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching works',
            error: error.message
        });
    }
});

// Get Work by ID
router.get('/:id', async (req, res) => {
    try {
        const work = await Work.findById(req.params.id)
            .populate('userId', 'name email cluster position batchName')
            .populate('themeId', 'title description startDate endDate');

        if (!work) {
            return res.status(404).json({
                success: false,
                message: 'Work not found'
            });
        }

        res.json({
            success: true,
            work
        });

    } catch (error) {
        console.error('Error fetching work:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching work',
            error: error.message
        });
    }
});

// Get Rankings by Category
router.get('/rankings/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const { limit = 10 } = req.query;

        const query = category === 'All' ? {} : { category };

        const works = await Work.find(query)
            .populate('userId', 'name email cluster')
            .sort({ voteCount: -1, createdAt: -1 })
            .limit(parseInt(limit));

        res.json({
            success: true,
            works
        });

    } catch (error) {
        console.error('Error fetching rankings:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching rankings',
            error: error.message
        });
    }
});

// Create Work (Members only)
router.post('/', isAuthenticated, async (req, res) => {
    try {
        const { title, description, category, fileUrl, themeId } = req.body;

        // Validate required fields
        if (!title || !description || !category || !fileUrl) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // Validate category
        if (!['Photos', 'Graphics', 'Videos'].includes(category)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid category'
            });
        }

        // Check if user is a member
        const user = await User.findById(req.session.userId);
        if (user.userType !== 'member') {
            return res.status(403).json({
                success: false,
                message: 'Only members can upload works'
            });
        }

        // Create work
        const newWork = new Work({
            title,
            description,
            category,
            fileUrl,
            userId: req.session.userId,
            themeId: themeId || null
        });

        await newWork.save();

        // Add to user's portfolio
        let portfolio = await Portfolio.findOne({ userId: req.session.userId });
        if (!portfolio) {
            portfolio = new Portfolio({
                userId: req.session.userId,
                title: `${user.name}'s Portfolio`,
                works: [newWork._id]
            });
        } else {
            portfolio.works.push(newWork._id);
        }
        await portfolio.save();

        // Populate before sending response
        await newWork.populate('userId', 'name email cluster');

        res.status(201).json({
            success: true,
            message: 'Work uploaded successfully',
            work: newWork
        });

    } catch (error) {
        console.error('Error creating work:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating work',
            error: error.message
        });
    }
});

// Update Work (Owner or Admin)
router.put('/:id', isAuthenticated, async (req, res) => {
    try {
        const work = await Work.findById(req.params.id);
        
        if (!work) {
            return res.status(404).json({
                success: false,
                message: 'Work not found'
            });
        }

        // Check if user is owner or admin
        const user = await User.findById(req.session.userId);
        const isOwner = work.userId.toString() === req.session.userId;
        const isAdminUser = user.userType === 'admin';

        if (!isOwner && !isAdminUser) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this work'
            });
        }

        // Update fields
        const { title, description, category, fileUrl, featured } = req.body;
        
        if (title) work.title = title;
        if (description) work.description = description;
        if (category) work.category = category;
        if (fileUrl) work.fileUrl = fileUrl;
        
        // Only admin can set featured
        if (isAdminUser && featured !== undefined) {
            work.featured = featured;
        }

        await work.save();
        await work.populate('userId', 'name email cluster');

        res.json({
            success: true,
            message: 'Work updated successfully',
            work
        });

    } catch (error) {
        console.error('Error updating work:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating work',
            error: error.message
        });
    }
});

// Delete Work (Owner or Admin)
router.delete('/:id', isAuthenticated, async (req, res) => {
    try {
        const work = await Work.findById(req.params.id);
        
        if (!work) {
            return res.status(404).json({
                success: false,
                message: 'Work not found'
            });
        }

        // Check if user is owner or admin
        const user = await User.findById(req.session.userId);
        const isOwner = work.userId.toString() === req.session.userId;
        const isAdminUser = user.userType === 'admin';

        if (!isOwner && !isAdminUser) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this work'
            });
        }

        // Remove from portfolio
        await Portfolio.updateOne(
            { userId: work.userId },
            { $pull: { works: work._id } }
        );

        await Work.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'Work deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting work:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting work',
            error: error.message
        });
    }
});

// Admin: Toggle Featured Status
router.patch('/:id/featured', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const work = await Work.findById(req.params.id);
        
        if (!work) {
            return res.status(404).json({
                success: false,
                message: 'Work not found'
            });
        }

        work.featured = !work.featured;
        await work.save();

        res.json({
            success: true,
            message: `Work ${work.featured ? 'featured' : 'unfeatured'} successfully`,
            work
        });

    } catch (error) {
        console.error('Error toggling featured status:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating featured status',
            error: error.message
        });
    }
});

module.exports = router;
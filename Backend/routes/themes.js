/**
 * Theme Routes
 * Handles voting theme CRUD operations (admin only for create/update)
 */

const express = require('express');
const router = express.Router();
const { Theme, Work } = require('../models');
const { isAuthenticated, isAdmin } = require('./auth');

// Get All Themes (with filters)
router.get('/', async (req, res) => {
    try {
        const { status, category, search } = req.query;

        // Build query
        const query = {};
        
        if (status && status !== 'All') {
            query.status = status;
        }
        
        if (category && category !== 'All') {
            query.category = category;
        }
        
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const themes = await Theme.find(query)
            .populate('createdBy', 'name email')
            .populate({
                path: 'submissions',
                populate: {
                    path: 'userId',
                    select: 'name cluster'
                },
                options: { limit: 10, sort: '-voteCount' }
            })
            .sort('-createdAt');

        // Update theme statuses based on dates
        const now = new Date();
        for (const theme of themes) {
            let newStatus = theme.status;
            
            if (now < new Date(theme.startDate)) {
                newStatus = 'Upcoming';
            } else if (now >= new Date(theme.startDate) && now <= new Date(theme.endDate)) {
                newStatus = 'Active';
            } else if (now > new Date(theme.endDate)) {
                newStatus = 'Ended';
            }
            
            if (newStatus !== theme.status) {
                theme.status = newStatus;
                await theme.save();
            }
        }

        res.json({
            success: true,
            themes,
            count: themes.length
        });

    } catch (error) {
        console.error('Error fetching themes:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching themes',
            error: error.message
        });
    }
});

// Get Active Theme
router.get('/active', async (req, res) => {
    try {
        const now = new Date();
        
        const activeTheme = await Theme.findOne({
            startDate: { $lte: now },
            endDate: { $gte: now }
        })
        .populate('createdBy', 'name email')
        .populate({
            path: 'submissions',
            populate: {
                path: 'userId',
                select: 'name cluster'
            },
            options: { sort: '-voteCount' }
        });

        if (!activeTheme) {
            return res.json({
                success: true,
                theme: null,
                message: 'No active theme at the moment'
            });
        }

        // Update status if needed
        if (activeTheme.status !== 'Active') {
            activeTheme.status = 'Active';
            await activeTheme.save();
        }

        res.json({
            success: true,
            theme: activeTheme
        });

    } catch (error) {
        console.error('Error fetching active theme:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching active theme',
            error: error.message
        });
    }
});

// Get Theme by ID
router.get('/:id', async (req, res) => {
    try {
        const theme = await Theme.findById(req.params.id)
            .populate('createdBy', 'name email')
            .populate({
                path: 'submissions',
                populate: {
                    path: 'userId',
                    select: 'name cluster'
                }
            });

        if (!theme) {
            return res.status(404).json({
                success: false,
                message: 'Theme not found'
            });
        }

        res.json({
            success: true,
            theme
        });

    } catch (error) {
        console.error('Error fetching theme:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching theme',
            error: error.message
        });
    }
});

// Create Theme (Admin only)
router.post('/', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { title, description, category, startDate, endDate } = req.body;

        // Validate required fields
        if (!title || !description || !category || !startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // Validate dates
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (start >= end) {
            return res.status(400).json({
                success: false,
                message: 'End date must be after start date'
            });
        }

        // Determine initial status
        const now = new Date();
        let status = 'Upcoming';
        if (now >= start && now <= end) {
            status = 'Active';
        } else if (now > end) {
            status = 'Ended';
        }

        const newTheme = new Theme({
            title,
            description,
            category,
            startDate: start,
            endDate: end,
            status,
            createdBy: req.session.userId
        });

        await newTheme.save();
        await newTheme.populate('createdBy', 'name email');

        res.status(201).json({
            success: true,
            message: 'Theme created successfully',
            theme: newTheme
        });

    } catch (error) {
        console.error('Error creating theme:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating theme',
            error: error.message
        });
    }
});

// Update Theme (Admin only)
router.put('/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const theme = await Theme.findById(req.params.id);
        
        if (!theme) {
            return res.status(404).json({
                success: false,
                message: 'Theme not found'
            });
        }

        const { title, description, category, startDate, endDate, status } = req.body;
        
        if (title) theme.title = title;
        if (description) theme.description = description;
        if (category) theme.category = category;
        
        if (startDate) {
            const start = new Date(startDate);
            theme.startDate = start;
        }
        
        if (endDate) {
            const end = new Date(endDate);
            theme.endDate = end;
        }

        // Validate dates if both are present
        if (theme.startDate >= theme.endDate) {
            return res.status(400).json({
                success: false,
                message: 'End date must be after start date'
            });
        }

        if (status) theme.status = status;

        await theme.save();
        await theme.populate('createdBy', 'name email');

        res.json({
            success: true,
            message: 'Theme updated successfully',
            theme
        });

    } catch (error) {
        console.error('Error updating theme:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating theme',
            error: error.message
        });
    }
});

// Delete Theme (Admin only)
router.delete('/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const theme = await Theme.findById(req.params.id);
        
        if (!theme) {
            return res.status(404).json({
                success: false,
                message: 'Theme not found'
            });
        }

        // Remove themeId from all submissions
        await Work.updateMany(
            { themeId: theme._id },
            { $unset: { themeId: '' } }
        );

        await Theme.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'Theme deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting theme:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting theme',
            error: error.message
        });
    }
});

// Submit Work to Theme (Members only)
router.post('/:id/submit', isAuthenticated, async (req, res) => {
    try {
        const theme = await Theme.findById(req.params.id);
        
        if (!theme) {
            return res.status(404).json({
                success: false,
                message: 'Theme not found'
            });
        }

        // Check if theme is active
        if (theme.status !== 'Active') {
            return res.status(400).json({
                success: false,
                message: 'This theme is not currently accepting submissions'
            });
        }

        const { workId } = req.body;
        
        if (!workId) {
            return res.status(400).json({
                success: false,
                message: 'Work ID is required'
            });
        }

        // Find the work
        const work = await Work.findById(workId);
        
        if (!work) {
            return res.status(404).json({
                success: false,
                message: 'Work not found'
            });
        }

        // Check if user owns the work
        if (work.userId.toString() !== req.session.userId) {
            return res.status(403).json({
                success: false,
                message: 'You can only submit your own works'
            });
        }

        // Check if work category matches theme category
        if (theme.category !== 'All' && work.category !== theme.category) {
            return res.status(400).json({
                success: false,
                message: `This theme only accepts ${theme.category}`
            });
        }

        // Check if work is already submitted
        if (theme.submissions.includes(workId)) {
            return res.status(400).json({
                success: false,
                message: 'Work already submitted to this theme'
            });
        }

        // Add work to theme submissions
        theme.submissions.push(workId);
        work.themeId = theme._id;
        
        await theme.save();
        await work.save();

        res.json({
            success: true,
            message: 'Work submitted successfully',
            theme
        });

    } catch (error) {
        console.error('Error submitting work:', error);
        res.status(500).json({
            success: false,
            message: 'Error submitting work',
            error: error.message
        });
    }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const VotingTheme = require('../models/VotingTheme');
const Work = require('../models/Work');
const Vote = require('../models/Vote');
const { isAuthenticated, isAdmin } = require('./auth');

router.get('/', async (req, res) => {
    try {
        const { status, limit } = req.query;
        let query = {};

        // Build query based on status filter
        if (status && status !== 'all') {
            query.status = status;
        }

        // Fetch themes
        const themes = await VotingTheme.find(query)
            .populate('createdBy', 'name position')
            .populate('winnerWorkId', 'title userId')
            .sort({ startDate: -1 }) // Newest first
            .limit(limit ? parseInt(limit) : 0);

        // Update status for each theme based on current date
        const now = new Date();
        for (let theme of themes) {
            let needsUpdate = false;

            if (now < theme.startDate && theme.status !== 'upcoming') {
                theme.status = 'upcoming';
                needsUpdate = true;
            } else if (now >= theme.startDate && now <= theme.endDate && theme.status !== 'active') {
                theme.status = 'active';
                needsUpdate = true;
            } else if (now > theme.endDate && theme.status !== 'closed') {
                theme.status = 'closed';
                needsUpdate = true;
                
                // Determine winner if not already set
                if (!theme.winnerWorkId) {
                    await determineWinner(theme);
                }
            }

            if (needsUpdate) {
                await theme.save();
            }
        }

        res.json({
            success: true,
            count: themes.length,
            themes
        });

    } catch (error) {
        console.error('Error fetching themes:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching themes'
        });
    }
});

router.get('/:themeId', async (req, res) => {
    try {
        const theme = await VotingTheme.findById(req.params.themeId)
            .populate('createdBy', 'name position')
            .populate('winnerWorkId');

        if (!theme) {
            return res.status(404).json({
                success: false,
                message: 'Theme not found'
            });
        }

        // Update theme status
        await theme.updateStatus();

        // Get works that have votes in this theme
        const votes = await Vote.find({ themeId: theme._id })
            .populate({
                path: 'workId',
                populate: { path: 'userId', select: 'name cluster' }
            });

        // Count votes per work
        const workVotes = {};
        votes.forEach(vote => {
            if (vote.workId) {
                const workId = vote.workId._id.toString();
                workVotes[workId] = (workVotes[workId] || 0) + 1;
            }
        });

        // Get unique works
        const works = [];
        const seenWorks = new Set();
        votes.forEach(vote => {
            if (vote.workId) {
                const workId = vote.workId._id.toString();
                if (!seenWorks.has(workId)) {
                    seenWorks.add(workId);
                    const work = vote.workId.toObject();
                    work.themeVoteCount = workVotes[workId] || 0;
                    works.push(work);
                }
            }
        });

        // Sort works by vote count
        works.sort((a, b) => b.themeVoteCount - a.themeVoteCount);

        res.json({
            success: true,
            theme,
            works,
            totalVotes: votes.length
        });

    } catch (error) {
        console.error('Error fetching theme details:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching theme details'
        });
    }
});

router.post('/', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { title, description, category, startDate, endDate } = req.body;

        // Validation
        if (!title || !description || !category || !startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // Validate dates
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (end <= start) {
            return res.status(400).json({
                success: false,
                message: 'End date must be after start date'
            });
        }

        // Determine initial status
        const now = new Date();
        let status = 'upcoming';
        if (now >= start && now <= end) {
            status = 'active';
        } else if (now > end) {
            status = 'closed';
        }

        // Create theme
        const theme = new VotingTheme({
            title,
            description,
            category,
            startDate: start,
            endDate: end,
            status,
            createdBy: req.session.userId
        });

        await theme.save();

        res.status(201).json({
            success: true,
            message: 'Theme created successfully',
            theme
        });

    } catch (error) {
        console.error('Error creating theme:', error);
        res.status(500).json({
            success: false,
            message: 'Server error creating theme'
        });
    }
});

router.put('/:themeId', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const theme = await VotingTheme.findById(req.params.themeId);

        if (!theme) {
            return res.status(404).json({
                success: false,
                message: 'Theme not found'
            });
        }

        const { title, description, category, startDate, endDate } = req.body;

        // Update fields if provided
        if (title) theme.title = title;
        if (description) theme.description = description;
        if (category) theme.category = category;
        if (startDate) theme.startDate = new Date(startDate);
        if (endDate) theme.endDate = new Date(endDate);

        // Validate dates if changed
        if (theme.endDate <= theme.startDate) {
            return res.status(400).json({
                success: false,
                message: 'End date must be after start date'
            });
        }

        // Update status based on new dates
        await theme.updateStatus();

        res.json({
            success: true,
            message: 'Theme updated successfully',
            theme
        });

    } catch (error) {
        console.error('Error updating theme:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating theme'
        });
    }
});

router.delete('/:themeId', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const theme = await VotingTheme.findById(req.params.themeId);

        if (!theme) {
            return res.status(404).json({
                success: false,
                message: 'Theme not found'
            });
        }

        // Delete all votes for this theme
        await Vote.deleteMany({ themeId: theme._id });

        // Delete theme
        await VotingTheme.findByIdAndDelete(req.params.themeId);

        res.json({
            success: true,
            message: 'Theme and associated votes deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting theme:', error);
        res.status(500).json({
            success: false,
            message: 'Server error deleting theme'
        });
    }
});

async function determineWinner(theme) {
    try {
        // Get all votes for this theme
        const votes = await Vote.find({ themeId: theme._id });

        if (votes.length === 0) {
            return; // No votes, no winner
        }

        // Count votes per work
        const voteCounts = {};
        votes.forEach(vote => {
            const workId = vote.workId.toString();
            voteCounts[workId] = (voteCounts[workId] || 0) + 1;
        });

        // Find work with most votes
        let maxVotes = 0;
        let winnerWorkId = null;

        for (const [workId, count] of Object.entries(voteCounts)) {
            if (count > maxVotes) {
                maxVotes = count;
                winnerWorkId = workId;
            }
        }

        // Update theme with winner
        if (winnerWorkId) {
            theme.winnerWorkId = winnerWorkId;
            await theme.save();
        }

    } catch (error) {
        console.error('Error determining winner:', error);
    }
}

module.exports = router;

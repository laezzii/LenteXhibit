/**
 * Vote Routes
 * Handles voting functionality for works
 */

const express = require('express');
const router = express.Router();
const { Vote, Work, Portfolio } = require('../models');
const { isAuthenticated } = require('./auth');

// Vote for a Work
router.post('/', isAuthenticated, async (req, res) => {
    try {
        const { workId, themeId } = req.body;

        if (!workId) {
            return res.status(400).json({
                success: false,
                message: 'Work ID is required'
            });
        }

        // Check if work exists
        const work = await Work.findById(workId);
        if (!work) {
            return res.status(404).json({
                success: false,
                message: 'Work not found'
            });
        }

        // Check if user has already voted for this work
        const existingVote = await Vote.findOne({
            userId: req.session.userId,
            workId: workId
        });

        if (existingVote) {
            return res.status(400).json({
                success: false,
                message: 'You have already voted for this work'
            });
        }

        // Create new vote
        const newVote = new Vote({
            userId: req.session.userId,
            workId: workId,
            themeId: themeId || null
        });

        await newVote.save();

        // Update work vote count
        work.voteCount = (work.voteCount || 0) + 1;
        await work.save();

        // Update portfolio total votes
        const portfolio = await Portfolio.findOne({ userId: work.userId });
        if (portfolio) {
            portfolio.totalVotes = (portfolio.totalVotes || 0) + 1;
            await portfolio.save();
        }

        res.json({
            success: true,
            message: 'Vote recorded successfully',
            voteCount: work.voteCount
        });

    } catch (error) {
        console.error('Error voting:', error);
        res.status(500).json({
            success: false,
            message: 'Error recording vote',
            error: error.message
        });
    }
});

// Unvote (Remove Vote)
router.delete('/:workId', isAuthenticated, async (req, res) => {
    try {
        const { workId } = req.params;

        // Find and delete the vote
        const vote = await Vote.findOneAndDelete({
            userId: req.session.userId,
            workId: workId
        });

        if (!vote) {
            return res.status(404).json({
                success: false,
                message: 'Vote not found'
            });
        }

        // Update work vote count
        const work = await Work.findById(workId);
        if (work) {
            work.voteCount = Math.max((work.voteCount || 0) - 1, 0);
            await work.save();

            // Update portfolio total votes
            const portfolio = await Portfolio.findOne({ userId: work.userId });
            if (portfolio) {
                portfolio.totalVotes = Math.max((portfolio.totalVotes || 0) - 1, 0);
                await portfolio.save();
            }

            return res.json({
                success: true,
                message: 'Vote removed successfully',
                voteCount: work.voteCount
            });
        }

        res.json({
            success: true,
            message: 'Vote removed'
        });

    } catch (error) {
        console.error('Error removing vote:', error);
        res.status(500).json({
            success: false,
            message: 'Error removing vote',
            error: error.message
        });
    }
});

// Check if User has Voted for a Work
router.get('/check/:workId', isAuthenticated, async (req, res) => {
    try {
        const vote = await Vote.findOne({
            userId: req.session.userId,
            workId: req.params.workId
        });

        res.json({
            success: true,
            hasVoted: !!vote
        });

    } catch (error) {
        console.error('Error checking vote:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking vote status',
            error: error.message
        });
    }
});

// Get User's Votes
router.get('/my-votes', isAuthenticated, async (req, res) => {
    try {
        const { limit = 50, skip = 0 } = req.query;

        const votes = await Vote.find({ userId: req.session.userId })
            .populate({
                path: 'workId',
                populate: {
                    path: 'userId',
                    select: 'name cluster'
                }
            })
            .populate('themeId', 'title')
            .sort('-createdAt')
            .limit(parseInt(limit))
            .skip(parseInt(skip));

        res.json({
            success: true,
            votes,
            count: votes.length
        });

    } catch (error) {
        console.error('Error fetching votes:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching votes',
            error: error.message
        });
    }
});

// Get Votes for a Work
router.get('/work/:workId', async (req, res) => {
    try {
        const { limit = 50, skip = 0 } = req.query;

        const votes = await Vote.find({ workId: req.params.workId })
            .populate('userId', 'name userType cluster')
            .sort('-createdAt')
            .limit(parseInt(limit))
            .skip(parseInt(skip));

        const totalVotes = await Vote.countDocuments({ workId: req.params.workId });

        res.json({
            success: true,
            votes,
            count: votes.length,
            totalVotes
        });

    } catch (error) {
        console.error('Error fetching work votes:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching work votes',
            error: error.message
        });
    }
});

// Get Votes by Theme
router.get('/theme/:themeId', async (req, res) => {
    try {
        const votes = await Vote.find({ themeId: req.params.themeId })
            .populate({
                path: 'workId',
                populate: {
                    path: 'userId',
                    select: 'name cluster'
                }
            })
            .populate('userId', 'name userType')
            .sort('-createdAt');

        res.json({
            success: true,
            votes,
            count: votes.length
        });

    } catch (error) {
        console.error('Error fetching theme votes:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching theme votes',
            error: error.message
        });
    }
});

// Get Voting Statistics
router.get('/stats/overview', async (req, res) => {
    try {
        const totalVotes = await Vote.countDocuments();
        const uniqueVoters = await Vote.distinct('userId');
        const uniqueWorksVoted = await Vote.distinct('workId');

        // Get most voted work
        const mostVotedWork = await Work.findOne()
            .sort('-voteCount')
            .populate('userId', 'name cluster');

        // Get recent votes
        const recentVotes = await Vote.find()
            .populate({
                path: 'workId',
                select: 'title category',
                populate: {
                    path: 'userId',
                    select: 'name'
                }
            })
            .sort('-createdAt')
            .limit(10);

        res.json({
            success: true,
            stats: {
                totalVotes,
                uniqueVoters: uniqueVoters.length,
                uniqueWorksVoted: uniqueWorksVoted.length,
                mostVotedWork,
                recentVotes
            }
        });

    } catch (error) {
        console.error('Error fetching voting stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching voting statistics',
            error: error.message
        });
    }
});

module.exports = router;
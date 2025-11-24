// routes/works.js - Work management routes
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Work = require('../models/Work');
const Vote = require('../models/Vote');
const { isAuthenticated, isAdmin } = require('./auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const category = req.body.category;
    let uploadPath = 'uploads/';
    
    if (category === 'Photos') uploadPath += 'photos/';
    else if (category === 'Graphics') uploadPath += 'graphics/';
    else if (category === 'Videos') uploadPath += 'videos/';
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for validation (B28_Display_Upload_Requirements)
const fileFilter = (req, file, cb) => {
  const category = req.body.category;
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (category === 'Photos' || category === 'Graphics') {
    if (['.jpg', '.jpeg', '.png', '.pdf'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Please use JPG, JPEG, PNG, or PDF.'));
    }
  } else if (category === 'Videos') {
    if (['.mp4', '.mov'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Please use MP4 or MOV.'));
    }
  } else {
    cb(new Error('Invalid category specified.'));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB max
  }
});

// POST /api/works - Upload new work (B27_Upload_Works_By_Category)
router.post('/', isAuthenticated, upload.single('file'), async (req, res) => {
  try {
    const { title, description, category, tags } = req.body;

    // Validation
    if (!title || !category) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title and category are required' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'File is required' 
      });
    }

    // Parse tags (comma-separated string to array)
    const tagArray = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

    // Create work document
    const work = new Work({
      userId: req.session.userId,
      title,
      description: description || '',
      category,
      filePath: req.file.path,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      tags: tagArray
    });

    await work.save();

    res.status(201).json({
      success: true,
      message: 'Work uploaded successfully',
      work: {
        id: work._id,
        title: work.title,
        category: work.category,
        filePath: work.filePath
      }
    });

  } catch (error) {
    // Delete uploaded file if database save fails
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    
    console.error('Upload error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error during upload' 
    });
  }
});

// GET /api/works - Get all works (B3_Browse_Homepage_Anonymously)
router.get('/', async (req, res) => {
  try {
    const { category, userId, featured, limit, page, search } = req.query;
    
    let query = {};
    
    // Filter by category
    if (category && category !== 'All') {
      query.category = category;
    }
    
    // Filter by user
    if (userId) {
      query.userId = userId;
    }
    
    // Filter featured works
    if (featured === 'true') {
      const now = new Date();
      query.isFeatured = true;
      query.featureStartDate = { $lte: now };
      query.featureEndDate = { $gte: now };
    }

    // Search by title or tags
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Pagination
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    const works = await Work.find(query)
      .populate('userId', 'name email cluster')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Work.countDocuments(query);

    res.json({
      success: true,
      count: works.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      works
    });

  } catch (error) {
    console.error('Fetch works error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching works' 
    });
  }
});

// GET /api/works/:workId - Get work details (B4_View_Work_Details)
router.get('/:workId', async (req, res) => {
  try {
    const work = await Work.findById(req.params.workId)
      .populate('userId', 'name email cluster position batchName');

    if (!work) {
      return res.status(404).json({ 
        success: false, 
        message: 'Work not found' 
      });
    }

    // Check if current user has voted (if authenticated)
    let hasVoted = false;
    if (req.session.userId) {
      const vote = await Vote.findOne({
        userId: req.session.userId,
        workId: work._id
      });
      hasVoted = !!vote;
    }

    res.json({
      success: true,
      work,
      hasVoted
    });

  } catch (error) {
    console.error('Fetch work error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching work details' 
    });
  }
});

// PUT /api/works/:workId - Edit work (B32_Edit_Work)
router.put('/:workId', isAuthenticated, async (req, res) => {
  try {
    const work = await Work.findById(req.params.workId);

    if (!work) {
      return res.status(404).json({ 
        success: false, 
        message: 'Work not found' 
      });
    }

    // Check ownership
    if (work.userId.toString() !== req.session.userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only edit your own works' 
      });
    }

    const { title, description, category, tags } = req.body;

    // Update fields
    if (title) work.title = title;
    if (description !== undefined) work.description = description;
    if (category) work.category = category;
    if (tags) {
      work.tags = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    }

    await work.save();

    res.json({
      success: true,
      message: 'Work updated successfully',
      work
    });

  } catch (error) {
    console.error('Update work error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error updating work' 
    });
  }
});

// DELETE /api/works/:workId - Delete work (B33_Delete_Work)
router.delete('/:workId', isAuthenticated, async (req, res) => {
  try {
    const work = await Work.findById(req.params.workId);

    if (!work) {
      return res.status(404).json({ 
        success: false, 
        message: 'Work not found' 
      });
    }

    // Check ownership
    if (work.userId.toString() !== req.session.userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only delete your own works' 
      });
    }

    // Delete file from filesystem
    if (fs.existsSync(work.filePath)) {
      fs.unlinkSync(work.filePath);
    }

    // Delete associated votes
    await Vote.deleteMany({ workId: work._id });

    // Delete work document
    await Work.findByIdAndDelete(req.params.workId);

    res.json({
      success: true,
      message: 'Work deleted successfully'
    });

  } catch (error) {
    console.error('Delete work error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error deleting work' 
    });
  }
});

// POST /api/works/:workId/vote - Vote for work (B12_Vote_for_Work)
router.post('/:workId/vote', isAuthenticated, async (req, res) => {
  try {
    const { themeId } = req.body;
    const work = await Work.findById(req.params.workId);

    if (!work) {
      return res.status(404).json({ 
        success: false, 
        message: 'Work not found' 
      });
    }

    // Check if user already voted for this work in this theme
    const existingVote = await Vote.findOne({
      userId: req.session.userId,
      workId: work._id,
      themeId: themeId || null
    });

    if (existingVote) {
      return res.status(400).json({ 
        success: false, 
        message: 'You have already voted for this work' 
      });
    }

    // Create vote
    const vote = new Vote({
      userId: req.session.userId,
      workId: work._id,
      themeId: themeId || null
    });

    await vote.save();

    // Increment vote count
    work.voteCount += 1;
    await work.save();

    res.json({
      success: true,
      message: 'Vote recorded successfully',
      voteCount: work.voteCount
    });

  } catch (error) {
    console.error('Vote error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error recording vote' 
    });
  }
});

// DELETE /api/works/:workId/vote - Remove vote (B13_Remove_Vote)
router.delete('/:workId/vote', isAuthenticated, async (req, res) => {
  try {
    const { themeId } = req.body;
    const work = await Work.findById(req.params.workId);

    if (!work) {
      return res.status(404).json({ 
        success: false, 
        message: 'Work not found' 
      });
    }

    // Find and delete vote
    const vote = await Vote.findOneAndDelete({
      userId: req.session.userId,
      workId: work._id,
      themeId: themeId || null
    });

    if (!vote) {
      return res.status(400).json({ 
        success: false, 
        message: 'You have not voted for this work' 
      });
    }

    // Decrement vote count
    work.voteCount = Math.max(0, work.voteCount - 1);
    await work.save();

    res.json({
      success: true,
      message: 'Vote removed successfully',
      voteCount: work.voteCount
    });

  } catch (error) {
    console.error('Remove vote error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error removing vote' 
    });
  }
});

// GET /api/works/rankings/:category - Get work rankings (B18_View_Ranking)
router.get('/rankings/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const query = category !== 'All' ? { category } : {};

    const works = await Work.find(query)
      .populate('userId', 'name cluster')
      .sort({ voteCount: -1, createdAt: 1 })
      .limit(50);

    res.json({
      success: true,
      category,
      count: works.length,
      works
    });

  } catch (error) {
    console.error('Fetch rankings error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching rankings' 
    });
  }
});

// POST /api/works/:workId/flag - Flag work (B20_Flag_Inappropriate_Work)
router.post('/:workId/flag', isAuthenticated, async (req, res) => {
  try {
    const { reason, explanation } = req.body;
    const work = await Work.findById(req.params.workId);

    if (!work) {
      return res.status(404).json({ 
        success: false, 
        message: 'Work not found' 
      });
    }

    // Check if user already flagged this work
    const existingFlag = work.flags.find(
      flag => flag.userId.toString() === req.session.userId && flag.status === 'pending'
    );

    if (existingFlag) {
      return res.status(400).json({ 
        success: false, 
        message: 'You have already flagged this work' 
      });
    }

    // Add flag
    work.flags.push({
      userId: req.session.userId,
      reason,
      explanation: explanation || '',
      status: 'pending'
    });

    await work.save();

    res.json({
      success: true,
      message: 'Work flagged successfully'
    });

  } catch (error) {
    console.error('Flag work error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error flagging work' 
    });
  }
});

// DELETE /api/works/:workId/flag - Remove flag (B21_Remove_Flag)
router.delete('/:workId/flag', isAuthenticated, async (req, res) => {
  try {
    const work = await Work.findById(req.params.workId);

    if (!work) {
      return res.status(404).json({ 
        success: false, 
        message: 'Work not found' 
      });
    }

    // Find and remove user's flag
    const flagIndex = work.flags.findIndex(
      flag => flag.userId.toString() === req.session.userId && flag.status === 'pending'
    );

    if (flagIndex === -1) {
      return res.status(400).json({ 
        success: false, 
        message: 'No pending flag found from you' 
      });
    }

    work.flags.splice(flagIndex, 1);
    await work.save();

    res.json({
      success: true,
      message: 'Flag removed successfully'
    });

  } catch (error) {
    console.error('Remove flag error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error removing flag' 
    });
  }
});

// GET /api/works/flagged/all - Get all flagged works (Admin only) (B40_Review_Flagged_Works)
router.get('/flagged/all', isAdmin, async (req, res) => {
  try {
    const flaggedWorks = await Work.find({
      'flags.status': 'pending'
    }).populate('userId', 'name email cluster');

    res.json({
      success: true,
      count: flaggedWorks.length,
      works: flaggedWorks
    });

  } catch (error) {
    console.error('Fetch flagged works error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching flagged works' 
    });
  }
});

// PUT /api/works/:workId/feature - Feature work (Admin only) (B41_Feature_Works)
router.put('/:workId/feature', isAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    const work = await Work.findById(req.params.workId);

    if (!work) {
      return res.status(404).json({ 
        success: false, 
        message: 'Work not found' 
      });
    }

    work.isFeatured = true;
    work.featureStartDate = new Date(startDate);
    work.featureEndDate = new Date(endDate);

    await work.save();

    res.json({
      success: true,
      message: 'Work featured successfully',
      work
    });

  } catch (error) {
    console.error('Feature work error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error featuring work' 
    });
  }
});

// DELETE /api/works/:workId/feature - Unfeature work (Admin only) (B42_Manage_Featured_Works)
router.delete('/:workId/feature', isAdmin, async (req, res) => {
  try {
    const work = await Work.findById(req.params.workId);

    if (!work) {
      return res.status(404).json({ 
        success: false, 
        message: 'Work not found' 
      });
    }

    work.isFeatured = false;
    work.featureStartDate = null;
    work.featureEndDate = null;

    await work.save();

    res.json({
      success: true,
      message: 'Work unfeatured successfully',
      work
    });

  } catch (error) {
    console.error('Unfeature work error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error unfeaturing work' 
    });
  }
});

module.exports = router;
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const Announcement = require('../models/Announcement');
const Course = require('../models/Course');
const { auth, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/announcements';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/plain'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed. Only PDF, DOC, DOCX, TXT, and image files are allowed.'), false);
    }
  }
});

// @route   GET /api/announcements/course/:courseId
// @desc    Get all announcements for a course
// @access  Private
router.get('/course/:courseId', auth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check access
    const isStudentEnrolled = course.students.some(student => 
      student.toString() === req.user._id.toString()
    );
    
    if (req.user.role === 'student' && !isStudentEnrolled) {
      return res.status(403).json({ message: 'Access denied. You are not enrolled in this course.' });
    }

    if (req.user.role === 'teacher' && course.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { type, priority, search, page = 1, limit = 10 } = req.query;
    
    // Build filter
    let filter = { 
      course: req.params.courseId,
      isPublished: true
    };
    
    if (type) filter.type = type;
    if (priority) filter.priority = priority;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const announcements = await Announcement.find(filter)
      .populate('teacher', 'firstName lastName teacherId')
      .populate('comments.author', 'firstName lastName studentId teacherId role')
      .populate('course', 'title subject')
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Announcement.countDocuments(filter);

    res.json({
      announcements,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/announcements/:id
// @desc    Get single announcement
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id)
      .populate('teacher', 'firstName lastName teacherId')
      .populate('comments.author', 'firstName lastName studentId teacherId role')
      .populate('course', 'title subject');

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    // Check access
    const isStudentEnrolled = announcement.course.students.some(student => 
      student.toString() === req.user._id.toString()
    );
    
    if (req.user.role === 'student' && !isStudentEnrolled) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (req.user.role === 'teacher' && announcement.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Mark as read for students
    if (req.user.role === 'student') {
      const alreadyRead = announcement.readBy.some(read => 
        read.user.toString() === req.user._id.toString()
      );
      
      if (!alreadyRead) {
        announcement.readBy.push({
          user: req.user._id,
          readAt: new Date()
        });
        await announcement.save();
      }
    }

    res.json({ announcement });
  } catch (error) {
    console.error('Get announcement error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/announcements
// @desc    Create a new announcement
// @access  Private (Teacher)
router.post('/', [
  auth,
  authorizeRoles('teacher'),
  upload.array('attachments', 5),
  body('title').notEmpty().withMessage('Title is required'),
  body('content').notEmpty().withMessage('Content is required'),
  body('courseId').isMongoId().withMessage('Valid course ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      title, 
      content, 
      courseId, 
      priority = 'medium', 
      type = 'general',
      tags = [],
      isPinned = false,
      targetAudience = 'all',
      targetStudents = [],
      scheduledFor,
      expiresAt
    } = req.body;

    // Check if teacher owns the course
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied. You are not the teacher of this course.' });
    }

    // Handle file attachments
    const attachments = req.files ? req.files.map(file => ({
      fileName: file.filename,
      originalName: file.originalname,
      fileUrl: `/uploads/announcements/${file.filename}`,
      fileSize: file.size,
      fileType: file.mimetype
    })) : [];

    const announcement = new Announcement({
      title,
      content,
      course: courseId,
      teacher: req.user._id,
      priority,
      type,
      tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
      isPinned,
      targetAudience,
      targetStudents: targetStudents.split(',').map(id => id.trim()).filter(id => id),
      scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      attachments
    });

    await announcement.save();

    const populatedAnnouncement = await Announcement.findById(announcement._id)
      .populate('teacher', 'firstName lastName teacherId')
      .populate('course', 'title subject');

    res.status(201).json({
      message: 'Announcement created successfully',
      announcement: populatedAnnouncement
    });
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/announcements/:id
// @desc    Update an announcement
// @access  Private (Teacher)
router.put('/:id', [
  auth,
  authorizeRoles('teacher'),
  upload.array('attachments', 5),
  body('title').optional().notEmpty().withMessage('Title cannot be empty'),
  body('content').optional().notEmpty().withMessage('Content cannot be empty')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    // Check if teacher owns this announcement
    if (announcement.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { 
      title, 
      content, 
      priority, 
      type, 
      tags, 
      isPinned, 
      targetAudience,
      targetStudents,
      scheduledFor,
      expiresAt,
      isPublished
    } = req.body;

    // Update announcement fields
    if (title) announcement.title = title;
    if (content) announcement.content = content;
    if (priority) announcement.priority = priority;
    if (type) announcement.type = type;
    if (tags) announcement.tags = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    if (isPinned !== undefined) announcement.isPinned = isPinned;
    if (targetAudience) announcement.targetAudience = targetAudience;
    if (targetStudents) announcement.targetStudents = targetStudents.split(',').map(id => id.trim()).filter(id => id);
    if (scheduledFor) announcement.scheduledFor = new Date(scheduledFor);
    if (expiresAt) announcement.expiresAt = new Date(expiresAt);
    if (isPublished !== undefined) announcement.isPublished = isPublished;

    // Handle new file attachments
    if (req.files && req.files.length > 0) {
      const newAttachments = req.files.map(file => ({
        fileName: file.filename,
        originalName: file.originalname,
        fileUrl: `/uploads/announcements/${file.filename}`,
        fileSize: file.size,
        fileType: file.mimetype
      }));
      announcement.attachments.push(...newAttachments);
    }

    await announcement.save();

    const populatedAnnouncement = await Announcement.findById(announcement._id)
      .populate('teacher', 'firstName lastName teacherId')
      .populate('comments.author', 'firstName lastName studentId teacherId role');

    res.json({
      message: 'Announcement updated successfully',
      announcement: populatedAnnouncement
    });
  } catch (error) {
    console.error('Update announcement error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/announcements/:id
// @desc    Delete an announcement
// @access  Private (Teacher)
router.delete('/:id', [
  auth,
  authorizeRoles('teacher')
], async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    // Check if teacher owns this announcement
    if (announcement.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Delete associated files
    announcement.attachments.forEach(attachment => {
      const filePath = path.join(__dirname, '..', 'uploads', 'announcements', attachment.fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

    await Announcement.findByIdAndDelete(req.params.id);

    res.json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/announcements/:id/comment
// @desc    Add a comment to an announcement
// @access  Private
router.post('/:id/comment', [
  auth,
  body('content').notEmpty().withMessage('Comment content is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    // Check access
    const isStudentEnrolled = announcement.course.students.some(student => 
      student.toString() === req.user._id.toString()
    );
    
    if (req.user.role === 'student' && !isStudentEnrolled) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (req.user.role === 'teacher' && announcement.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { content } = req.body;

    const comment = {
      author: req.user._id,
      content
    };

    announcement.comments.push(comment);
    await announcement.save();

    const populatedAnnouncement = await Announcement.findById(announcement._id)
      .populate('teacher', 'firstName lastName teacherId')
      .populate('comments.author', 'firstName lastName studentId teacherId role');

    res.json({
      message: 'Comment added successfully',
      announcement: populatedAnnouncement
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/announcements/:id/comment/:commentId
// @desc    Update a comment
// @access  Private
router.put('/:id/comment/:commentId', [
  auth,
  body('content').notEmpty().withMessage('Comment content is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    const comment = announcement.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if user can update this comment
    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { content } = req.body;

    comment.content = content;
    comment.updatedAt = new Date();
    comment.isEdited = true;

    await announcement.save();

    const populatedAnnouncement = await Announcement.findById(announcement._id)
      .populate('teacher', 'firstName lastName teacherId')
      .populate('comments.author', 'firstName lastName studentId teacherId role');

    res.json({
      message: 'Comment updated successfully',
      announcement: populatedAnnouncement
    });
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/announcements/:id/comment/:commentId
// @desc    Delete a comment
// @access  Private
router.delete('/:id/comment/:commentId', auth, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    const comment = announcement.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if user can delete this comment
    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    announcement.comments.pull(req.params.commentId);
    await announcement.save();

    const populatedAnnouncement = await Announcement.findById(announcement._id)
      .populate('teacher', 'firstName lastName teacherId')
      .populate('comments.author', 'firstName lastName studentId teacherId role');

    res.json({
      message: 'Comment deleted successfully',
      announcement: populatedAnnouncement
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/announcements/:id/reaction
// @desc    Add a reaction to an announcement
// @access  Private
router.post('/:id/reaction', [
  auth,
  body('type').isIn(['like', 'love', 'helpful', 'important']).withMessage('Invalid reaction type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    // Check access
    const isStudentEnrolled = announcement.course.students.some(student => 
      student.toString() === req.user._id.toString()
    );
    
    if (req.user.role === 'student' && !isStudentEnrolled) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (req.user.role === 'teacher' && announcement.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { type } = req.body;
    const userId = req.user._id;

    // Remove existing reaction from this user
    announcement.reactions = announcement.reactions.filter(
      reaction => reaction.user.toString() !== userId.toString()
    );

    // Add new reaction
    announcement.reactions.push({
      user: userId,
      type
    });

    await announcement.save();

    res.json({
      message: 'Reaction added successfully',
      reactionCount: announcement.reactions.length
    });
  } catch (error) {
    console.error('Add reaction error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

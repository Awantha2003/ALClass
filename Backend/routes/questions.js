const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const Question = require('../models/Question');
const Course = require('../models/Course');
const { auth, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/questions';
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

// @route   GET /api/questions/course/:courseId
// @desc    Get all questions for a course
// @access  Private
router.get('/course/:courseId', auth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId).populate('students', '_id');
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check access
    const isStudentEnrolled = course.students.some(student => 
      student._id.toString() === req.user._id.toString()
    );
    
    if (req.user.role === 'student' && !isStudentEnrolled) {
      return res.status(403).json({ message: 'Access denied. You are not enrolled in this course.' });
    }

    if (req.user.role === 'teacher' && course.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { status, priority, search, page = 1, limit = 10 } = req.query;
    
    // Build filter
    let filter = { course: req.params.courseId };
    
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const questions = await Question.find(filter)
      .populate('student', 'firstName lastName studentId')
      .populate('teacher', 'firstName lastName teacherId')
      .populate('replies.author', 'firstName lastName studentId teacherId role')
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Question.countDocuments(filter);

    res.json({
      questions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/questions/:id
// @desc    Get single question
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id)
      .populate('student', 'firstName lastName studentId')
      .populate('teacher', 'firstName lastName teacherId')
      .populate('replies.author', 'firstName lastName studentId teacherId role')
      .populate('course', 'title subject students');

    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Check access
    const isStudentEnrolled = question.course.students.some(student => 
      student.toString() === req.user._id.toString()
    );
    
    if (req.user.role === 'student' && !isStudentEnrolled) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (req.user.role === 'teacher' && question.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ question });
  } catch (error) {
    console.error('Get question error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/questions
// @desc    Create a new question
// @access  Private (Student)
router.post('/', [
  auth,
  authorizeRoles('student'),
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

    const { title, content, courseId, priority = 'medium', tags = [], isAnonymous = false } = req.body;

    // Check if student is enrolled in the course
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const isStudentEnrolled = course.students.some(student => 
      student.toString() === req.user._id.toString()
    );
    
    if (!isStudentEnrolled) {
      return res.status(403).json({ message: 'Access denied. You are not enrolled in this course.' });
    }

    // Handle file attachments
    const attachments = req.files ? req.files.map(file => ({
      fileName: file.filename,
      originalName: file.originalname,
      fileUrl: `/uploads/questions/${file.filename}`,
      fileSize: file.size,
      fileType: file.mimetype
    })) : [];

    const question = new Question({
      title,
      content,
      course: courseId,
      student: req.user._id,
      teacher: course.teacher,
      priority,
      tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
      isAnonymous,
      attachments
    });

    await question.save();

    const populatedQuestion = await Question.findById(question._id)
      .populate('student', 'firstName lastName studentId')
      .populate('teacher', 'firstName lastName teacherId')
      .populate('course', 'title subject');

    res.status(201).json({
      message: 'Question created successfully',
      question: populatedQuestion
    });
  } catch (error) {
    console.error('Create question error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/questions/:id
// @desc    Update a question
// @access  Private
router.put('/:id', [
  auth,
  upload.array('attachments', 5),
  body('title').optional().notEmpty().withMessage('Title cannot be empty'),
  body('content').optional().notEmpty().withMessage('Content cannot be empty')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Check if user can update this question
    if (req.user.role === 'student' && question.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (req.user.role === 'teacher' && question.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { title, content, priority, tags, isAnonymous } = req.body;

    // Update question fields
    if (title) question.title = title;
    if (content) question.content = content;
    if (priority) question.priority = priority;
    if (tags) question.tags = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    if (isAnonymous !== undefined) question.isAnonymous = isAnonymous;

    // Handle new file attachments
    if (req.files && req.files.length > 0) {
      const newAttachments = req.files.map(file => ({
        fileName: file.filename,
        originalName: file.originalname,
        fileUrl: `/uploads/questions/${file.filename}`,
        fileSize: file.size,
        fileType: file.mimetype
      }));
      question.attachments.push(...newAttachments);
    }

    await question.save();

    const populatedQuestion = await Question.findById(question._id)
      .populate('student', 'firstName lastName studentId')
      .populate('teacher', 'firstName lastName teacherId')
      .populate('replies.author', 'firstName lastName studentId teacherId role');

    res.json({
      message: 'Question updated successfully',
      question: populatedQuestion
    });
  } catch (error) {
    console.error('Update question error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/questions/:id
// @desc    Delete a question
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Check if user can delete this question
    if (req.user.role === 'student' && question.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (req.user.role === 'teacher' && question.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Delete associated files
    question.attachments.forEach(attachment => {
      const filePath = path.join(__dirname, '..', 'uploads', 'questions', attachment.fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

    await Question.findByIdAndDelete(req.params.id);

    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/questions/:id/reply
// @desc    Add a reply to a question
// @access  Private
router.post('/:id/reply', [
  auth,
  body('content').notEmpty().withMessage('Reply content is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Check access
    const isStudentEnrolled = question.course.students.some(student => 
      student.toString() === req.user._id.toString()
    );
    
    if (req.user.role === 'student' && !isStudentEnrolled) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (req.user.role === 'teacher' && question.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { content } = req.body;

    const reply = {
      author: req.user._id,
      content,
      isTeacherReply: req.user.role === 'teacher'
    };

    question.replies.push(reply);

    // Update question status if teacher replies
    if (req.user.role === 'teacher') {
      question.status = 'answered';
    }

    await question.save();

    const populatedQuestion = await Question.findById(question._id)
      .populate('student', 'firstName lastName studentId')
      .populate('teacher', 'firstName lastName teacherId')
      .populate('replies.author', 'firstName lastName studentId teacherId role');

    res.json({
      message: 'Reply added successfully',
      question: populatedQuestion
    });
  } catch (error) {
    console.error('Add reply error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/questions/:id/reply/:replyId
// @desc    Update a reply
// @access  Private
router.put('/:id/reply/:replyId', [
  auth,
  body('content').notEmpty().withMessage('Reply content is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    const reply = question.replies.id(req.params.replyId);
    if (!reply) {
      return res.status(404).json({ message: 'Reply not found' });
    }

    // Check if user can update this reply
    if (reply.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { content } = req.body;

    reply.content = content;
    reply.updatedAt = new Date();
    reply.isEdited = true;

    await question.save();

    const populatedQuestion = await Question.findById(question._id)
      .populate('student', 'firstName lastName studentId')
      .populate('teacher', 'firstName lastName teacherId')
      .populate('replies.author', 'firstName lastName studentId teacherId role');

    res.json({
      message: 'Reply updated successfully',
      question: populatedQuestion
    });
  } catch (error) {
    console.error('Update reply error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/questions/:id/reply/:replyId
// @desc    Delete a reply
// @access  Private
router.delete('/:id/reply/:replyId', auth, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    const reply = question.replies.id(req.params.replyId);
    if (!reply) {
      return res.status(404).json({ message: 'Reply not found' });
    }

    // Check if user can delete this reply
    if (reply.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    question.replies.pull(req.params.replyId);
    await question.save();

    const populatedQuestion = await Question.findById(question._id)
      .populate('student', 'firstName lastName studentId')
      .populate('teacher', 'firstName lastName teacherId')
      .populate('replies.author', 'firstName lastName studentId teacherId role');

    res.json({
      message: 'Reply deleted successfully',
      question: populatedQuestion
    });
  } catch (error) {
    console.error('Delete reply error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/questions/:id/vote
// @desc    Vote on a question
// @access  Private
router.post('/:id/vote', [
  auth,
  body('type').isIn(['upvote', 'downvote']).withMessage('Vote type must be upvote or downvote')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Check access
    const isStudentEnrolled = question.course.students.some(student => 
      student.toString() === req.user._id.toString()
    );
    
    if (req.user.role === 'student' && !isStudentEnrolled) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (req.user.role === 'teacher' && question.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { type } = req.body;
    const userId = req.user._id;

    // Remove existing votes
    question.upvotes.pull(userId);
    question.downvotes.pull(userId);

    // Add new vote
    if (type === 'upvote') {
      question.upvotes.push(userId);
    } else {
      question.downvotes.push(userId);
    }

    await question.save();

    res.json({
      message: 'Vote recorded successfully',
      voteCount: question.upvotes.length - question.downvotes.length
    });
  } catch (error) {
    console.error('Vote error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

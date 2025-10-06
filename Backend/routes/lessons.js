const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const Lesson = require('../models/Lesson');
const Course = require('../models/Course');
const { auth, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Configure multer for lesson files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/lessons';
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
    fileSize: 100 * 1024 * 1024 // 100MB limit for videos
  },
  fileFilter: (req, file, cb) => {
    // Allow videos and documents
    const allowedTypes = [
      'video/mp4', 'video/avi', 'video/mov', 'video/wmv',
      'application/pdf', 'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'image/jpeg', 'image/png'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  }
});

// @route   GET /api/lessons/course/:courseId
// @desc    Get all lessons for a course
// @access  Private
router.get('/course/:courseId', auth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check access
    if (req.user.role === 'student' && !course.students.includes(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (req.user.role === 'teacher' && course.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const lessons = await Lesson.find({ course: req.params.courseId })
      .populate('teacher', 'firstName lastName teacherId')
      .sort({ lessonOrder: 1 });

    res.json({ lessons });
  } catch (error) {
    console.error('Get lessons error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/lessons/:id
// @desc    Get single lesson
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id)
      .populate('course', 'title subject')
      .populate('teacher', 'firstName lastName teacherId');

    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    }

    // Check access
    if (req.user.role === 'student' && !lesson.course.students.includes(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (req.user.role === 'teacher' && lesson.teacher._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Increment view count for students
    if (req.user.role === 'student') {
      lesson.views += 1;
      await lesson.save();
    }

    res.json({ lesson });
  } catch (error) {
    console.error('Get lesson error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/lessons
// @desc    Create a new lesson (Teacher only)
// @access  Private (Teacher)
router.post('/', [
  auth,
  authorizeRoles('teacher'),
  body('title').notEmpty().withMessage('Lesson title is required'),
  body('description').notEmpty().withMessage('Lesson description is required'),
  body('course').isMongoId().withMessage('Valid course ID is required'),
  body('lessonOrder').isInt({ min: 1 }).withMessage('Lesson order must be a positive integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, course, lessonOrder, tags, difficulty } = req.body;

    // Verify course ownership
    const courseDoc = await Course.findById(course);
    if (!courseDoc) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (courseDoc.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const lesson = new Lesson({
      title,
      description,
      course,
      teacher: req.user._id,
      lessonOrder,
      tags: tags || [],
      difficulty: difficulty || 'beginner'
    });

    await lesson.save();

    // Update course lesson count
    await Course.findByIdAndUpdate(course, { $inc: { totalLessons: 1 } });

    const populatedLesson = await Lesson.findById(lesson._id)
      .populate('course', 'title subject')
      .populate('teacher', 'firstName lastName teacherId');

    res.status(201).json({
      message: 'Lesson created successfully',
      lesson: populatedLesson
    });
  } catch (error) {
    console.error('Create lesson error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/lessons/:id
// @desc    Update lesson (Teacher only)
// @access  Private (Teacher)
router.put('/:id', [
  auth,
  authorizeRoles('teacher'),
  body('title').optional().notEmpty().withMessage('Lesson title cannot be empty'),
  body('description').optional().notEmpty().withMessage('Lesson description cannot be empty')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    }

    if (lesson.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { title, description, lessonOrder, tags, difficulty, isPublished } = req.body;

    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (lessonOrder) updateData.lessonOrder = lessonOrder;
    if (tags) updateData.tags = tags;
    if (difficulty) updateData.difficulty = difficulty;
    if (typeof isPublished === 'boolean') {
      updateData.isPublished = isPublished;
      if (isPublished && !lesson.publishedAt) {
        updateData.publishedAt = new Date();
      }
    }

    const updatedLesson = await Lesson.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('course', 'title subject')
     .populate('teacher', 'firstName lastName teacherId');

    res.json({
      message: 'Lesson updated successfully',
      lesson: updatedLesson
    });
  } catch (error) {
    console.error('Update lesson error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/lessons/:id/video
// @desc    Upload lesson video (Teacher only)
// @access  Private (Teacher)
router.post('/:id/video', [
  auth,
  authorizeRoles('teacher'),
  upload.single('video')
], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No video file uploaded' });
    }

    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    }

    if (lesson.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Delete old video if exists
    if (lesson.videoUrl) {
      const oldFilePath = path.join(__dirname, '..', lesson.videoUrl);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    const videoPath = `/uploads/lessons/${req.file.filename}`;

    const updatedLesson = await Lesson.findByIdAndUpdate(
      req.params.id,
      { 
        videoUrl: videoPath,
        videoThumbnail: '', // Will be generated later
        videoDuration: 0 // Will be calculated later
      },
      { new: true }
    ).populate('course', 'title subject')
     .populate('teacher', 'firstName lastName teacherId');

    res.json({
      message: 'Video uploaded successfully',
      lesson: updatedLesson
    });
  } catch (error) {
    console.error('Upload video error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/lessons/:id/attachments
// @desc    Upload lesson attachments (Teacher only)
// @access  Private (Teacher)
router.post('/:id/attachments', [
  auth,
  authorizeRoles('teacher'),
  upload.array('attachments', 10) // Max 10 files
], async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    }

    if (lesson.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const attachments = req.files.map(file => ({
      fileName: file.filename,
      originalName: file.originalname,
      fileUrl: `/uploads/lessons/${file.filename}`,
      fileSize: file.size,
      fileType: file.mimetype
    }));

    lesson.attachments.push(...attachments);
    await lesson.save();

    const updatedLesson = await Lesson.findById(lesson._id)
      .populate('course', 'title subject')
      .populate('teacher', 'firstName lastName teacherId');

    res.json({
      message: 'Attachments uploaded successfully',
      lesson: updatedLesson
    });
  } catch (error) {
    console.error('Upload attachments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/lessons/:id
// @desc    Delete lesson (Teacher only)
// @access  Private (Teacher)
router.delete('/:id', [
  auth,
  authorizeRoles('teacher')
], async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    }

    if (lesson.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Delete video file if exists
    if (lesson.videoUrl) {
      const videoPath = path.join(__dirname, '..', lesson.videoUrl);
      if (fs.existsSync(videoPath)) {
        fs.unlinkSync(videoPath);
      }
    }

    // Delete attachment files
    lesson.attachments.forEach(attachment => {
      const filePath = path.join(__dirname, '..', attachment.fileUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

    // Update course lesson count
    await Course.findByIdAndUpdate(lesson.course, { $inc: { totalLessons: -1 } });

    await Lesson.findByIdAndDelete(req.params.id);

    res.json({ message: 'Lesson deleted successfully' });
  } catch (error) {
    console.error('Delete lesson error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

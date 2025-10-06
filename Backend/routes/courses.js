const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const Course = require('../models/Course');
const Lesson = require('../models/Lesson');
const Quiz = require('../models/Quiz');
const Assignment = require('../models/Assignment');
const { auth, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Configure multer for course thumbnails
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/courses';
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
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// @route   GET /api/courses
// @desc    Get all courses (Teachers see their courses, Students see enrolled courses)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    let courses;
    
    if (req.user.role === 'teacher') {
      courses = await Course.find({ teacher: req.user._id })
        .populate('teacher', 'firstName lastName email')
        .populate('students', 'firstName lastName studentId')
        .sort({ createdAt: -1 });
    } else {
      courses = await Course.find({ students: req.user._id })
        .populate('teacher', 'firstName lastName email')
        .sort({ createdAt: -1 });
    }

    res.json({ courses });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/courses/available
// @desc    Get all available courses for students to browse and enroll
// @access  Private (Student)
router.get('/available', [
  auth,
  authorizeRoles('student')
], async (req, res) => {
  try {
    const courses = await Course.find({ isActive: true })
      .populate('teacher', 'firstName lastName email')
      .populate('students', 'firstName lastName studentId')
      .sort({ createdAt: -1 });

    // Add enrollment status for each course
    const coursesWithEnrollmentStatus = courses.map(course => ({
      ...course.toObject(),
      isEnrolled: course.students.some(student => student._id.toString() === req.user._id.toString())
    }));

    res.json({ courses: coursesWithEnrollmentStatus });
  } catch (error) {
    console.error('Get available courses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/courses/:id
// @desc    Get single course with details
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    // Validate course ID format
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid course ID format' });
    }

    const course = await Course.findById(req.params.id)
      .populate('teacher', 'firstName lastName email teacherId')
      .populate('students', 'firstName lastName studentId email');

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if user has access to this course
    const isStudentEnrolled = course.students.some(student => 
      student._id.toString() === req.user._id.toString()
    );
    
    if (req.user.role === 'student' && !isStudentEnrolled) {
      return res.status(403).json({ message: 'Access denied. You are not enrolled in this course.' });
    }

    if (req.user.role === 'teacher' && course.teacher._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ course });
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/courses
// @desc    Create a new course (Teacher only)
// @access  Private (Teacher)
router.post('/', [
  auth,
  authorizeRoles('teacher'),
  body('title').notEmpty().withMessage('Course title is required'),
  body('description').notEmpty().withMessage('Course description is required'),
  body('subject').notEmpty().withMessage('Subject is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, subject, startDate, endDate } = req.body;

    const course = new Course({
      title,
      description,
      subject,
      teacher: req.user._id,
      startDate: startDate || new Date(),
      endDate
    });

    await course.save();

    const populatedCourse = await Course.findById(course._id)
      .populate('teacher', 'firstName lastName email teacherId');

    res.status(201).json({
      message: 'Course created successfully',
      course: populatedCourse
    });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/courses/:id
// @desc    Update course (Teacher only)
// @access  Private (Teacher)
router.put('/:id', [
  auth,
  authorizeRoles('teacher'),
  body('title').optional().notEmpty().withMessage('Course title cannot be empty'),
  body('description').optional().notEmpty().withMessage('Course description cannot be empty')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { title, description, subject, startDate, endDate, isActive } = req.body;

    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (subject) updateData.subject = subject;
    if (startDate) updateData.startDate = startDate;
    if (endDate) updateData.endDate = endDate;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;

    const updatedCourse = await Course.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('teacher', 'firstName lastName email teacherId')
     .populate('students', 'firstName lastName studentId');

    res.json({
      message: 'Course updated successfully',
      course: updatedCourse
    });
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/courses/:id/thumbnail
// @desc    Upload course thumbnail (Teacher only)
// @access  Private (Teacher)
router.post('/:id/thumbnail', [
  auth,
  authorizeRoles('teacher'),
  upload.single('thumbnail')
], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Delete old thumbnail if exists
    if (course.thumbnail) {
      const oldFilePath = path.join(__dirname, '..', course.thumbnail);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    const thumbnailPath = `/uploads/courses/${req.file.filename}`;

    const updatedCourse = await Course.findByIdAndUpdate(
      req.params.id,
      { thumbnail: thumbnailPath },
      { new: true }
    ).populate('teacher', 'firstName lastName email teacherId')
     .populate('students', 'firstName lastName studentId');

    res.json({
      message: 'Thumbnail uploaded successfully',
      course: updatedCourse
    });
  } catch (error) {
    console.error('Upload thumbnail error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/courses/:id/enroll
// @desc    Enroll student in course
// @access  Private (Student)
router.post('/:id/enroll', [
  auth,
  authorizeRoles('student')
], async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const isAlreadyEnrolled = course.students.some(student => 
      student.toString() === req.user._id.toString()
    );
    
    if (isAlreadyEnrolled) {
      return res.status(400).json({ message: 'Already enrolled in this course' });
    }

    course.students.push(req.user._id);
    await course.save();

    const updatedCourse = await Course.findById(course._id)
      .populate('teacher', 'firstName lastName email teacherId')
      .populate('students', 'firstName lastName studentId');

    res.json({
      message: 'Successfully enrolled in course',
      course: updatedCourse
    });
  } catch (error) {
    console.error('Enroll in course error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/courses/:id
// @desc    Delete course (Teacher only)
// @access  Private (Teacher)
router.delete('/:id', [
  auth,
  authorizeRoles('teacher')
], async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Delete associated lessons, quizzes, and assignments
    await Lesson.deleteMany({ course: course._id });
    await Quiz.deleteMany({ course: course._id });
    await Assignment.deleteMany({ course: course._id });

    // Delete course thumbnail if exists
    if (course.thumbnail) {
      const thumbnailPath = path.join(__dirname, '..', course.thumbnail);
      if (fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath);
      }
    }

    await Course.findByIdAndDelete(req.params.id);

    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const Course = require('../models/Course');
const { auth, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Configure multer for assignment files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/assignments';
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
    fileSize: 50 * 1024 * 1024 // 50MB limit for assignments
  },
  fileFilter: (req, file, cb) => {
    // Allow common document formats
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/gif'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed. Please upload PDF, DOCX, PPT, or image files.'), false);
    }
  }
});

// @route   GET /api/assignments/course/:courseId
// @desc    Get all assignments for a course
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

    const assignments = await Assignment.find({ course: req.params.courseId })
      .populate('teacher', 'firstName lastName teacherId')
      .sort({ dueDate: 1 });

    // For students, also get their submission status
    if (req.user.role === 'student') {
      const assignmentsWithSubmissions = await Promise.all(
        assignments.map(async (assignment) => {
          const submission = await Submission.findOne({
            assignment: assignment._id,
            student: req.user._id
          });
          return {
            ...assignment.toObject(),
            submission: submission || null,
            isSubmitted: !!submission,
            isLate: submission ? submission.isLate : false
          };
        })
      );
      return res.json({ assignments: assignmentsWithSubmissions });
    }

    res.json({ assignments });
  } catch (error) {
    console.error('Get assignments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/assignments/:id
// @desc    Get single assignment
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate('course', 'title subject students')
      .populate('teacher', 'firstName lastName teacherId');

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Check access
    const isStudentEnrolled = assignment.course.students.some(student => 
      student.toString() === req.user._id.toString()
    );
    
    if (req.user.role === 'student' && !isStudentEnrolled) {
      return res.status(403).json({ message: 'Access denied. You are not enrolled in this course.' });
    }

    if (req.user.role === 'teacher' && assignment.teacher._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get student's submission if they're a student
    let submission = null;
    if (req.user.role === 'student') {
      submission = await Submission.findOne({
        assignment: assignment._id,
        student: req.user._id
      });
    }

    res.json({ assignment, submission });
  } catch (error) {
    console.error('Get assignment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/assignments
// @desc    Create a new assignment (Teacher only)
// @access  Private (Teacher)
router.post('/', [
  auth,
  authorizeRoles('teacher'),
  body('title').notEmpty().withMessage('Assignment title is required'),
  body('description').notEmpty().withMessage('Assignment description is required'),
  body('instructions').notEmpty().withMessage('Assignment instructions are required'),
  body('course').isMongoId().withMessage('Valid course ID is required'),
  body('dueDate').isISO8601().withMessage('Valid due date is required'),
  body('maxPoints').isInt({ min: 1 }).withMessage('Max points must be a positive integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, instructions, course, dueDate, maxPoints, allowLateSubmission, latePenalty, submissionType } = req.body;

    // Verify course ownership
    const courseDoc = await Course.findById(course);
    if (!courseDoc) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (courseDoc.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const assignment = new Assignment({
      title,
      description,
      instructions,
      course,
      teacher: req.user._id,
      dueDate: new Date(dueDate),
      maxPoints: parseInt(maxPoints),
      allowLateSubmission: allowLateSubmission === 'true',
      latePenalty: parseFloat(latePenalty) || 0,
      submissionType: submissionType || 'both'
    });

    await assignment.save();

    // Update course assignment count
    await Course.findByIdAndUpdate(course, { $inc: { totalAssignments: 1 } });

    const populatedAssignment = await Assignment.findById(assignment._id)
      .populate('course', 'title subject')
      .populate('teacher', 'firstName lastName teacherId');

    res.status(201).json({
      message: 'Assignment created successfully',
      assignment: populatedAssignment
    });
  } catch (error) {
    console.error('Create assignment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/assignments/:id/attachments
// @desc    Upload assignment attachments (Teacher only)
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

    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    if (assignment.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const attachments = req.files.map(file => ({
      fileName: file.filename,
      originalName: file.originalname,
      fileUrl: `/uploads/assignments/${file.filename}`,
      fileSize: file.size,
      fileType: file.mimetype
    }));

    assignment.attachments.push(...attachments);
    await assignment.save();

    const updatedAssignment = await Assignment.findById(assignment._id)
      .populate('course', 'title subject')
      .populate('teacher', 'firstName lastName teacherId');

    res.json({
      message: 'Attachments uploaded successfully',
      assignment: updatedAssignment
    });
  } catch (error) {
    console.error('Upload attachments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/assignments/:id/submit
// @desc    Submit assignment (Student only) - Redirects to new submission system
// @access  Private (Student)
router.post('/:id/submit', [
  auth,
  authorizeRoles('student')
], async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Check if student is enrolled in the course
    const course = await Course.findById(assignment.course);
    const isStudentEnrolled = course.students.some(student => 
      student.toString() === req.user._id.toString()
    );
    
    if (!isStudentEnrolled) {
      return res.status(403).json({ message: 'Access denied. You are not enrolled in this course.' });
    }

    // Check if assignment is published
    if (!assignment.isPublished) {
      return res.status(400).json({ message: 'Assignment is not yet published' });
    }

    // Redirect to new submission system
    res.status(200).json({
      message: 'Please use the new submission system at /api/submissions',
      redirectTo: `/submissions/${req.params.id}`
    });
  } catch (error) {
    console.error('Submit assignment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/assignments/:id/submissions
// @desc    Get all submissions for an assignment (Teacher only)
// @access  Private (Teacher)
router.get('/:id/submissions', [
  auth,
  authorizeRoles('teacher')
], async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    if (assignment.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const submissions = await Submission.find({ assignment: assignment._id })
      .populate('student', 'firstName lastName studentId email')
      .sort({ submittedAt: -1 });

    res.json({ submissions });
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/assignments/:id
// @desc    Update assignment (Teacher only)
// @access  Private (Teacher)
router.put('/:id', [
  auth,
  authorizeRoles('teacher'),
  body('title').optional().notEmpty().withMessage('Assignment title cannot be empty'),
  body('description').optional().notEmpty().withMessage('Assignment description cannot be empty')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    if (assignment.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { title, description, instructions, dueDate, maxPoints, allowLateSubmission, latePenalty, isPublished } = req.body;

    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (instructions) updateData.instructions = instructions;
    if (dueDate) updateData.dueDate = new Date(dueDate);
    if (maxPoints) updateData.maxPoints = parseInt(maxPoints);
    if (typeof allowLateSubmission === 'boolean') updateData.allowLateSubmission = allowLateSubmission;
    if (latePenalty !== undefined) updateData.latePenalty = parseFloat(latePenalty);
    if (typeof isPublished === 'boolean') {
      updateData.isPublished = isPublished;
      if (isPublished && !assignment.publishedAt) {
        updateData.publishedAt = new Date();
      }
    }

    const updatedAssignment = await Assignment.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('course', 'title subject')
     .populate('teacher', 'firstName lastName teacherId');

    res.json({
      message: 'Assignment updated successfully',
      assignment: updatedAssignment
    });
  } catch (error) {
    console.error('Update assignment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/assignments/:id
// @desc    Delete assignment (Teacher only)
// @access  Private (Teacher)
router.delete('/:id', [
  auth,
  authorizeRoles('teacher')
], async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    if (assignment.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Delete attachment files
    assignment.attachments.forEach(attachment => {
      const filePath = path.join(__dirname, '..', attachment.fileUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

    // Delete submission files
    const submissions = await Submission.find({ assignment: assignment._id });
    submissions.forEach(submission => {
      submission.fileSubmissions.forEach(file => {
        const filePath = path.join(__dirname, '..', file.fileUrl);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    });

    // Delete submissions
    await Submission.deleteMany({ assignment: assignment._id });

    // Update course assignment count
    await Course.findByIdAndUpdate(assignment.course, { $inc: { totalAssignments: -1 } });

    await Assignment.findByIdAndDelete(req.params.id);

    res.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    console.error('Delete assignment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

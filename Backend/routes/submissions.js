const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const Submission = require('../models/Submission');
const Assignment = require('../models/Assignment');
const Course = require('../models/Course');
const { auth, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/submissions';
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
    fileSize: 50 * 1024 * 1024 // 50MB limit
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
      cb(new Error('File type not allowed. Only PDF, DOC, DOCX, PPT, PPTX, TXT, and image files are allowed.'), false);
    }
  }
});

// @route   GET /api/submissions/student
// @desc    Get all submissions for a student
// @access  Private (Student)
router.get('/student', [
  auth,
  authorizeRoles('student')
], async (req, res) => {
  try {
    const submissions = await Submission.find({ student: req.user._id })
      .populate('assignment', 'title dueDate maxPoints')
      .populate('course', 'title subject')
      .populate('gradedBy', 'firstName lastName teacherId')
      .sort({ submittedAt: -1 });

    res.json({ submissions });
  } catch (error) {
    console.error('Get student submissions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/submissions/:id
// @desc    Get single submission
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id)
      .populate('assignment', 'title dueDate maxPoints instructions')
      .populate('student', 'firstName lastName studentId email')
      .populate('course', 'title subject')
      .populate('gradedBy', 'firstName lastName teacherId');

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Check access
    if (req.user.role === 'student' && submission.student._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (req.user.role === 'teacher') {
      const assignment = await Assignment.findById(submission.assignment._id);
      if (assignment.teacher.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    res.json({ submission });
  } catch (error) {
    console.error('Get submission error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/submissions/:id/grade
// @desc    Grade a submission (Teacher only)
// @access  Private (Teacher)
router.put('/:id/grade', [
  auth,
  authorizeRoles('teacher'),
  body('grade').isFloat({ min: 0 }).withMessage('Grade must be a non-negative number'),
  body('feedback').optional().isString().withMessage('Feedback must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const submission = await Submission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Verify teacher has access to this assignment
    const assignment = await Assignment.findById(submission.assignment);
    if (assignment.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { grade, feedback } = req.body;

    // Validate grade against max points
    if (grade > assignment.maxPoints) {
      return res.status(400).json({ 
        message: `Grade cannot exceed maximum points (${assignment.maxPoints})` 
      });
    }

    // Apply late penalty if applicable
    let finalGrade = parseFloat(grade);
    if (submission.isLate && assignment.latePenalty > 0) {
      const penalty = (finalGrade * assignment.latePenalty) / 100;
      finalGrade = Math.max(0, finalGrade - penalty);
    }

    submission.grade = finalGrade;
    submission.feedback = feedback || '';
    submission.gradedAt = new Date();
    submission.gradedBy = req.user._id;
    submission.status = 'graded';

    await submission.save();

    const populatedSubmission = await Submission.findById(submission._id)
      .populate('assignment', 'title maxPoints')
      .populate('student', 'firstName lastName studentId email')
      .populate('gradedBy', 'firstName lastName teacherId');

    res.json({
      message: 'Submission graded successfully',
      submission: populatedSubmission
    });
  } catch (error) {
    console.error('Grade submission error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/submissions/:id/return
// @desc    Return graded submission to student (Teacher only)
// @access  Private (Teacher)
router.put('/:id/return', [
  auth,
  authorizeRoles('teacher')
], async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Verify teacher has access to this assignment
    const assignment = await Assignment.findById(submission.assignment);
    if (assignment.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (submission.status !== 'graded') {
      return res.status(400).json({ message: 'Submission must be graded before returning' });
    }

    submission.status = 'returned';
    await submission.save();

    const populatedSubmission = await Submission.findById(submission._id)
      .populate('assignment', 'title')
      .populate('student', 'firstName lastName studentId email')
      .populate('gradedBy', 'firstName lastName teacherId');

    res.json({
      message: 'Submission returned to student successfully',
      submission: populatedSubmission
    });
  } catch (error) {
    console.error('Return submission error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/submissions/course/:courseId/analytics
// @desc    Get submission analytics for a course (Teacher only)
// @access  Private (Teacher)
router.get('/course/:courseId/analytics', [
  auth,
  authorizeRoles('teacher')
], async (req, res) => {
  try {
    const { courseId } = req.params;

    // Get all assignments for this course
    const assignments = await Assignment.find({ course: courseId });
    const assignmentIds = assignments.map(a => a._id);

    // Get all submissions for these assignments
    const submissions = await Submission.find({ 
      assignment: { $in: assignmentIds } 
    }).populate('student', 'firstName lastName studentId');

    // Calculate analytics
    const totalSubmissions = submissions.length;
    const gradedSubmissions = submissions.filter(s => s.status === 'graded' || s.status === 'returned').length;
    const pendingSubmissions = totalSubmissions - gradedSubmissions;
    const lateSubmissions = submissions.filter(s => s.isLate).length;

    // Calculate average grade
    const gradedSubs = submissions.filter(s => s.grade !== undefined);
    const averageGrade = gradedSubs.length > 0 
      ? gradedSubs.reduce((sum, s) => sum + s.grade, 0) / gradedSubs.length 
      : 0;

    // Get grade distribution
    const gradeDistribution = {
      'A (90-100)': gradedSubs.filter(s => s.grade >= 90).length,
      'B (80-89)': gradedSubs.filter(s => s.grade >= 80 && s.grade < 90).length,
      'C (70-79)': gradedSubs.filter(s => s.grade >= 70 && s.grade < 80).length,
      'D (60-69)': gradedSubs.filter(s => s.grade >= 60 && s.grade < 70).length,
      'F (0-59)': gradedSubs.filter(s => s.grade < 60).length
    };

    // Get submission timeline
    const submissionTimeline = submissions.reduce((acc, submission) => {
      const date = submission.submittedAt.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    res.json({
      analytics: {
        totalSubmissions,
        gradedSubmissions,
        pendingSubmissions,
        lateSubmissions,
        averageGrade: Math.round(averageGrade * 100) / 100,
        gradeDistribution,
        submissionTimeline
      }
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/submissions/student/:studentId/course/:courseId
// @desc    Get student's submissions for a specific course (Teacher only)
// @access  Private (Teacher)
router.get('/student/:studentId/course/:courseId', [
  auth,
  authorizeRoles('teacher')
], async (req, res) => {
  try {
    const { studentId, courseId } = req.params;

    // Verify teacher has access to this course
    const course = await Course.findById(courseId);
    if (!course || course.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const submissions = await Submission.find({ 
      student: studentId, 
      course: courseId 
    })
      .populate('assignment', 'title dueDate maxPoints')
      .populate('student', 'firstName lastName studentId email')
      .sort({ submittedAt: -1 });

    res.json({ submissions });
  } catch (error) {
    console.error('Get student submissions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/submissions
// @desc    Create a new submission (Student only)
// @access  Private (Student)
router.post('/', [
  auth,
  authorizeRoles('student'),
  upload.array('files', 10), // Max 10 files
  body('assignmentId').notEmpty().withMessage('Assignment ID is required'),
  body('textSubmission').optional().isString().withMessage('Text submission must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { assignmentId, textSubmission, comments } = req.body;

    // Get assignment details
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Check if student is enrolled in the course
    const course = await Course.findById(assignment.course);
    if (!course.students.includes(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if assignment is published
    if (!assignment.isPublished) {
      return res.status(400).json({ message: 'Assignment is not yet published' });
    }

    // Check if due date has passed
    const now = new Date();
    const isLate = now > assignment.dueDate;
    
    if (isLate && !assignment.allowLateSubmission) {
      return res.status(400).json({ message: 'Assignment deadline has passed' });
    }

    // Validate submission type
    if (assignment.submissionType === 'file-upload' && (!req.files || req.files.length === 0)) {
      return res.status(400).json({ message: 'File upload is required for this assignment' });
    }

    if (assignment.submissionType === 'text' && !textSubmission) {
      return res.status(400).json({ message: 'Text submission is required for this assignment' });
    }

    // Check if submission already exists
    let submission = await Submission.findOne({
      assignment: assignmentId,
      student: req.user._id
    });

    const fileSubmissions = req.files ? req.files.map(file => ({
      fileName: file.filename,
      originalName: file.originalname,
      fileUrl: `/uploads/submissions/${file.filename}`,
      fileSize: file.size,
      fileType: file.mimetype,
      uploadedAt: new Date()
    })) : [];

    if (submission) {
      // Update existing submission (resubmission)
      if (!submission.allowResubmission) {
        return res.status(400).json({ message: 'Resubmission is not allowed for this assignment' });
      }

      if (submission.currentVersion >= submission.maxResubmissions) {
        return res.status(400).json({ message: 'Maximum resubmissions reached' });
      }

      // Save current version to history
      submission.submissionHistory.push({
        version: submission.currentVersion,
        textSubmission: submission.textSubmission,
        fileSubmissions: submission.fileSubmissions,
        submittedAt: submission.submittedAt,
        isLate: submission.isLate,
        comments: comments || ''
      });

      // Update current submission
      submission.textSubmission = textSubmission || '';
      submission.fileSubmissions = fileSubmissions;
      submission.submittedAt = new Date();
      submission.isLate = isLate;
      submission.status = 'resubmitted';
      submission.currentVersion += 1;

      await submission.save();
    } else {
      // Create new submission
      submission = new Submission({
        assignment: assignmentId,
        student: req.user._id,
        course: assignment.course,
        textSubmission: textSubmission || '',
        fileSubmissions: fileSubmissions,
        submittedAt: new Date(),
        isLate: isLate,
        maxPoints: assignment.maxPoints,
        allowResubmission: assignment.allowResubmission,
        resubmissionDeadline: assignment.resubmissionDeadline,
        maxResubmissions: assignment.maxResubmissions || 3
      });

      await submission.save();
    }

    const populatedSubmission = await Submission.findById(submission._id)
      .populate('assignment', 'title dueDate maxPoints')
      .populate('student', 'firstName lastName studentId email')
      .populate('course', 'title subject');

    res.status(201).json({
      message: submission.currentVersion > 1 ? 'Submission updated successfully' : 'Submission created successfully',
      submission: populatedSubmission
    });
  } catch (error) {
    console.error('Create submission error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/submissions/:id
// @desc    Update a submission (Student only)
// @access  Private (Student)
router.put('/:id', [
  auth,
  authorizeRoles('student'),
  upload.array('files', 10),
  body('textSubmission').optional().isString().withMessage('Text submission must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const submission = await Submission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Check if student owns this submission
    if (submission.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if resubmission is allowed
    if (!submission.allowResubmission) {
      return res.status(400).json({ message: 'Resubmission is not allowed for this assignment' });
    }

    if (submission.currentVersion >= submission.maxResubmissions) {
      return res.status(400).json({ message: 'Maximum resubmissions reached' });
    }

    // Check resubmission deadline
    if (submission.resubmissionDeadline && new Date() > submission.resubmissionDeadline) {
      return res.status(400).json({ message: 'Resubmission deadline has passed' });
    }

    const { textSubmission, comments } = req.body;

    // Get assignment details
    const assignment = await Assignment.findById(submission.assignment);
    const now = new Date();
    const isLate = now > assignment.dueDate;

    // Save current version to history
    submission.submissionHistory.push({
      version: submission.currentVersion,
      textSubmission: submission.textSubmission,
      fileSubmissions: submission.fileSubmissions,
      submittedAt: submission.submittedAt,
      isLate: submission.isLate,
      comments: comments || ''
    });

    // Update current submission
    if (textSubmission !== undefined) {
      submission.textSubmission = textSubmission;
    }

    if (req.files && req.files.length > 0) {
      const fileSubmissions = req.files.map(file => ({
        fileName: file.filename,
        originalName: file.originalname,
        fileUrl: `/uploads/submissions/${file.filename}`,
        fileSize: file.size,
        fileType: file.mimetype,
        uploadedAt: new Date()
      }));
      submission.fileSubmissions = fileSubmissions;
    }

    submission.submittedAt = new Date();
    submission.isLate = isLate;
    submission.status = 'resubmitted';
    submission.currentVersion += 1;

    await submission.save();

    const populatedSubmission = await Submission.findById(submission._id)
      .populate('assignment', 'title dueDate maxPoints')
      .populate('student', 'firstName lastName studentId email')
      .populate('course', 'title subject');

    res.json({
      message: 'Submission updated successfully',
      submission: populatedSubmission
    });
  } catch (error) {
    console.error('Update submission error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/submissions/:id
// @desc    Delete a submission (Teacher only)
// @access  Private (Teacher)
router.delete('/:id', [
  auth,
  authorizeRoles('teacher')
], async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Verify teacher has access to this assignment
    const assignment = await Assignment.findById(submission.assignment);
    if (assignment.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Delete uploaded files
    submission.fileSubmissions.forEach(file => {
      const filePath = path.join(__dirname, '..', file.fileUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

    // Delete files from submission history
    submission.submissionHistory.forEach(version => {
      version.fileSubmissions.forEach(file => {
        const filePath = path.join(__dirname, '..', file.fileUrl);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    });

    await Submission.findByIdAndDelete(req.params.id);

    res.json({ message: 'Submission deleted successfully' });
  } catch (error) {
    console.error('Delete submission error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/submissions/:id/history
// @desc    Get submission history
// @access  Private
router.get('/:id/history', auth, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id)
      .populate('assignment', 'title dueDate maxPoints')
      .populate('student', 'firstName lastName studentId email')
      .populate('gradedBy', 'firstName lastName teacherId');

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Check access
    if (req.user.role === 'student' && submission.student._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (req.user.role === 'teacher') {
      const assignment = await Assignment.findById(submission.assignment._id);
      if (assignment.teacher.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    res.json({ 
      submission,
      history: submission.submissionHistory,
      feedbackHistory: submission.feedbackHistory
    });
  } catch (error) {
    console.error('Get submission history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/submissions/assignment/:assignmentId
// @desc    Get all submissions for an assignment (Teacher only)
// @access  Private (Teacher)
router.get('/assignment/:assignmentId', [
  auth,
  authorizeRoles('teacher')
], async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Verify teacher has access to this assignment
    if (assignment.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const submissions = await Submission.find({ assignment: req.params.assignmentId })
      .populate('student', 'firstName lastName studentId email')
      .populate('gradedBy', 'firstName lastName teacherId')
      .sort({ submittedAt: -1 });

    res.json({ submissions });
  } catch (error) {
    console.error('Get assignment submissions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/submissions/:id/feedback
// @desc    Add feedback to a submission (Teacher only)
// @access  Private (Teacher)
router.post('/:id/feedback', [
  auth,
  authorizeRoles('teacher'),
  body('feedback').notEmpty().withMessage('Feedback is required'),
  body('grade').optional().isFloat({ min: 0 }).withMessage('Grade must be a non-negative number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const submission = await Submission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Verify teacher has access to this assignment
    const assignment = await Assignment.findById(submission.assignment);
    if (assignment.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { feedback, grade } = req.body;

    // Add to feedback history
    submission.feedbackHistory.push({
      feedback,
      grade: grade || submission.grade,
      gradedAt: new Date(),
      gradedBy: req.user._id,
      version: submission.currentVersion
    });

    // Update current feedback
    submission.feedback = feedback;
    if (grade !== undefined) {
      submission.grade = grade;
      submission.gradedAt = new Date();
      submission.gradedBy = req.user._id;
      submission.status = 'graded';
    }

    await submission.save();

    const populatedSubmission = await Submission.findById(submission._id)
      .populate('assignment', 'title maxPoints')
      .populate('student', 'firstName lastName studentId email')
      .populate('gradedBy', 'firstName lastName teacherId');

    res.json({
      message: 'Feedback added successfully',
      submission: populatedSubmission
    });
  } catch (error) {
    console.error('Add feedback error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

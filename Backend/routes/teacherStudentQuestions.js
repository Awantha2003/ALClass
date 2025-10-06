const express = require('express');
const router = express.Router();
const StudentQuestion = require('../models/StudentQuestion');
const StudentQuizAttempt = require('../models/StudentQuizAttempt');
const Course = require('../models/Course');
const { auth } = require('../middleware/auth');

// Get all student questions for teacher review
router.get('/questions', auth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Only teachers can access this endpoint' });
    }

    const { courseId, status, page = 1, limit = 10 } = req.query;
    const query = { teacher: req.user.id };
    
    if (courseId) query.course = courseId;
    if (status) query.status = status;

    const questions = await StudentQuestion.find(query)
      .populate('course', 'title subject')
      .populate('student', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await StudentQuestion.countDocuments(query);

    res.json({
      questions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching student questions for review:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Review a student question (approve/reject)
router.put('/questions/:questionId/review', auth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Only teachers can review questions' });
    }

    const { questionId } = req.params;
    const { status, feedback, points, difficulty } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be either approved or rejected' });
    }

    const question = await StudentQuestion.findById(questionId);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    if (question.teacher.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized to review this question' });
    }

    question.status = status;
    question.teacherFeedback = feedback || '';
    question.reviewedAt = new Date();
    question.reviewedBy = req.user.id;

    if (points) question.points = points;
    if (difficulty) question.difficulty = difficulty;

    await question.save();

    res.json({
      message: `Question ${status} successfully`,
      question
    });
  } catch (error) {
    console.error('Error reviewing question:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all quiz attempts for teacher grading
router.get('/quiz-attempts', auth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Only teachers can access this endpoint' });
    }

    const { courseId, page = 1, limit = 10 } = req.query;
    const query = { course: courseId };
    
    if (courseId) {
      // Verify teacher has access to this course
      const course = await Course.findById(courseId);
      if (!course || course.teacher.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Unauthorized to access this course' });
      }
    } else {
      // Get all courses taught by this teacher
      const courses = await Course.find({ teacher: req.user.id });
      const courseIds = courses.map(c => c._id);
      query.course = { $in: courseIds };
    }

    const attempts = await StudentQuizAttempt.find(query)
      .populate('course', 'title subject')
      .populate('student', 'name email')
      .populate('questions', 'question difficulty')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await StudentQuizAttempt.countDocuments(query);

    res.json({
      attempts,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching quiz attempts for grading:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Grade a quiz attempt
router.put('/quiz-attempts/:attemptId/grade', auth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Only teachers can grade quiz attempts' });
    }

    const { attemptId } = req.params;
    const { teacherGrade, teacherFeedback } = req.body;

    const quizAttempt = await StudentQuizAttempt.findById(attemptId)
      .populate('course');

    if (!quizAttempt) {
      return res.status(404).json({ message: 'Quiz attempt not found' });
    }

    // Verify teacher has access to this course
    if (quizAttempt.course.teacher.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized to grade this quiz attempt' });
    }

    quizAttempt.teacherGrade = teacherGrade;
    quizAttempt.teacherFeedback = teacherFeedback || '';
    quizAttempt.gradedAt = new Date();
    quizAttempt.gradedBy = req.user.id;

    await quizAttempt.save();

    res.json({
      message: 'Quiz graded successfully',
      quizAttempt
    });
  } catch (error) {
    console.error('Error grading quiz attempt:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get statistics for teacher dashboard
router.get('/stats', auth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Only teachers can access this endpoint' });
    }

    const { courseId } = req.query;

    // Get courses taught by this teacher
    const courseQuery = courseId ? { _id: courseId, teacher: req.user.id } : { teacher: req.user.id };
    const courses = await Course.find(courseQuery);
    const courseIds = courses.map(c => c._id);

    // Get question statistics
    const totalQuestions = await StudentQuestion.countDocuments({ 
      course: { $in: courseIds } 
    });
    const pendingQuestions = await StudentQuestion.countDocuments({ 
      course: { $in: courseIds }, 
      status: 'pending' 
    });
    const approvedQuestions = await StudentQuestion.countDocuments({ 
      course: { $in: courseIds }, 
      status: 'approved' 
    });
    const rejectedQuestions = await StudentQuestion.countDocuments({ 
      course: { $in: courseIds }, 
      status: 'rejected' 
    });

    // Get quiz attempt statistics
    const totalAttempts = await StudentQuizAttempt.countDocuments({ 
      course: { $in: courseIds } 
    });
    const completedAttempts = await StudentQuizAttempt.countDocuments({ 
      course: { $in: courseIds }, 
      isCompleted: true 
    });
    const gradedAttempts = await StudentQuizAttempt.countDocuments({ 
      course: { $in: courseIds }, 
      teacherGrade: { $exists: true } 
    });

    // Get average scores
    const avgScoreResult = await StudentQuizAttempt.aggregate([
      { $match: { course: { $in: courseIds }, isCompleted: true } },
      { $group: { _id: null, avgPercentage: { $avg: '$percentage' } } }
    ]);

    const avgScore = avgScoreResult.length > 0 ? avgScoreResult[0].avgPercentage : 0;

    res.json({
      questions: {
        total: totalQuestions,
        pending: pendingQuestions,
        approved: approvedQuestions,
        rejected: rejectedQuestions
      },
      quizAttempts: {
        total: totalAttempts,
        completed: completedAttempts,
        graded: gradedAttempts,
        averageScore: Math.round(avgScore * 100) / 100
      }
    });
  } catch (error) {
    console.error('Error fetching teacher stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

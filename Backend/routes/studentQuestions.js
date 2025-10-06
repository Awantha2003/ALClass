const express = require('express');
const router = express.Router();
const StudentQuestion = require('../models/StudentQuestion');
const StudentQuizAttempt = require('../models/StudentQuizAttempt');
const Course = require('../models/Course');
const { auth } = require('../middleware/auth');

// Create a new student question
router.post('/', auth, async (req, res) => {
  try {
    const { question, options, explanation, courseId, difficulty, tags, isAnonymous } = req.body;

    // Validate that user is a student
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can create questions' });
    }

    // Validate required fields
    if (!question || !options || !courseId) {
      return res.status(400).json({ message: 'Question, options, and course are required' });
    }

    // Validate options
    if (!Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ message: 'At least 2 options are required' });
    }

    // Check if at least one option is marked as correct
    const hasCorrectOption = options.some(option => option.isCorrect);
    if (!hasCorrectOption) {
      return res.status(400).json({ message: 'At least one option must be marked as correct' });
    }

    // Get course and teacher
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const studentQuestion = new StudentQuestion({
      question,
      options,
      explanation,
      course: courseId,
      student: req.user.id,
      teacher: course.teacher,
      difficulty,
      tags: tags || [],
      isAnonymous
    });

    await studentQuestion.save();
    await studentQuestion.populate('course', 'title subject');
    await studentQuestion.populate('student', 'name email');

    res.status(201).json({
      message: 'Question created successfully',
      question: studentQuestion
    });
  } catch (error) {
    console.error('Error creating student question:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get student's own questions
router.get('/my-questions', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can access this endpoint' });
    }

    const { courseId, status, page = 1, limit = 10 } = req.query;
    const query = { student: req.user.id };
    
    if (courseId) query.course = courseId;
    if (status) query.status = status;

    const questions = await StudentQuestion.find(query)
      .populate('course', 'title subject')
      .populate('teacher', 'name email')
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
    console.error('Error fetching student questions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get questions for a specific course (for students to answer)
router.get('/course/:courseId', auth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { difficulty, limit = 10 } = req.query;

    const query = { 
      course: courseId, 
      status: 'approved' 
    };
    
    if (difficulty) query.difficulty = difficulty;

    const questions = await StudentQuestion.find(query)
      .populate('student', 'name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({ questions });
  } catch (error) {
    console.error('Error fetching course questions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Start a quiz attempt
router.post('/quiz/start', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can start quiz attempts' });
    }

    const { courseId, questionCount = 5, difficulty } = req.body;

    // Get approved questions for the course
    const query = { 
      course: courseId, 
      status: 'approved' 
    };
    
    if (difficulty) query.difficulty = difficulty;

    const allQuestions = await StudentQuestion.find(query);
    
    if (allQuestions.length === 0) {
      return res.status(404).json({ message: 'No questions available for this course' });
    }

    // Randomly select questions
    const shuffled = allQuestions.sort(() => 0.5 - Math.random());
    const selectedQuestions = shuffled.slice(0, Math.min(questionCount, allQuestions.length));

    const totalPoints = selectedQuestions.reduce((sum, q) => sum + q.points, 0);

    const quizAttempt = new StudentQuizAttempt({
      student: req.user.id,
      course: courseId,
      questions: selectedQuestions.map(q => q._id),
      totalPoints
    });

    await quizAttempt.save();
    await quizAttempt.populate('questions');

    res.status(201).json({
      message: 'Quiz started successfully',
      quizAttempt
    });
  } catch (error) {
    console.error('Error starting quiz:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit quiz answers
router.post('/quiz/:attemptId/submit', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can submit quiz answers' });
    }

    const { attemptId } = req.params;
    const { answers, timeSpent } = req.body;

    const quizAttempt = await StudentQuizAttempt.findById(attemptId)
      .populate('questions');

    if (!quizAttempt) {
      return res.status(404).json({ message: 'Quiz attempt not found' });
    }

    if (quizAttempt.student.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (quizAttempt.isCompleted) {
      return res.status(400).json({ message: 'Quiz already completed' });
    }

    // Calculate score
    let score = 0;
    const studentAnswers = [];

    for (const answer of answers) {
      const question = quizAttempt.questions.find(q => q._id.toString() === answer.questionId);
      if (!question) continue;

      const isCorrect = question.options[answer.selectedOption]?.isCorrect || false;
      const points = isCorrect ? question.points : 0;
      score += points;

      studentAnswers.push({
        questionId: answer.questionId,
        selectedOption: answer.selectedOption,
        isCorrect,
        points
      });
    }

    const percentage = Math.round((score / quizAttempt.totalPoints) * 100);

    quizAttempt.answers = studentAnswers;
    quizAttempt.score = score;
    quizAttempt.percentage = percentage;
    quizAttempt.timeSpent = timeSpent || 0;
    quizAttempt.submittedAt = new Date();
    quizAttempt.isCompleted = true;

    await quizAttempt.save();

    res.json({
      message: 'Quiz submitted successfully',
      quizAttempt: {
        score,
        totalPoints: quizAttempt.totalPoints,
        percentage,
        timeSpent: quizAttempt.timeSpent
      }
    });
  } catch (error) {
    console.error('Error submitting quiz:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get student's quiz attempts
router.get('/quiz/attempts', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can access this endpoint' });
    }

    const { courseId, page = 1, limit = 10 } = req.query;
    const query = { student: req.user.id };
    
    if (courseId) query.course = courseId;

    const attempts = await StudentQuizAttempt.find(query)
      .populate('course', 'title subject')
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
    console.error('Error fetching quiz attempts:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get specific quiz attempt details
router.get('/quiz/:attemptId', auth, async (req, res) => {
  try {
    const { attemptId } = req.params;

    const quizAttempt = await StudentQuizAttempt.findById(attemptId)
      .populate('course', 'title subject')
      .populate('questions')
      .populate('gradedBy', 'name email');

    if (!quizAttempt) {
      return res.status(404).json({ message: 'Quiz attempt not found' });
    }

    if (req.user.role === 'student' && quizAttempt.student.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    res.json({ quizAttempt });
  } catch (error) {
    console.error('Error fetching quiz attempt:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

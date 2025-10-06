const mongoose = require('mongoose');

const studentAnswerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudentQuestion',
    required: true
  },
  selectedOption: {
    type: Number, // Index of selected option
    required: true
  },
  isCorrect: {
    type: Boolean,
    default: false
  },
  points: {
    type: Number,
    default: 0
  }
});

const studentQuizAttemptSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  questions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudentQuestion',
    required: true
  }],
  answers: [studentAnswerSchema],
  score: {
    type: Number,
    default: 0
  },
  totalPoints: {
    type: Number,
    required: true
  },
  percentage: {
    type: Number,
    default: 0
  },
  timeSpent: {
    type: Number, // in seconds
    default: 0
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  submittedAt: {
    type: Date
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  teacherGrade: {
    type: Number
  },
  teacherFeedback: {
    type: String,
    trim: true,
    default: ''
  },
  gradedAt: {
    type: Date
  },
  gradedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for better query performance
studentQuizAttemptSchema.index({ student: 1, course: 1, createdAt: -1 });
studentQuizAttemptSchema.index({ course: 1, isCompleted: 1 });

module.exports = mongoose.model('StudentQuizAttempt', studentQuizAttemptSchema);

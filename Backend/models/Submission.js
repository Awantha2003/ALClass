const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  assignment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment',
    required: true
  },
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
  textSubmission: {
    type: String,
    default: ''
  },
  fileSubmissions: [{
    fileName: String,
    originalName: String,
    fileUrl: String,
    fileSize: Number,
    fileType: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  submittedAt: {
    type: Date,
    default: Date.now
  },
  isLate: {
    type: Boolean,
    default: false
  },
  grade: {
    type: Number,
    min: 0
  },
  maxPoints: {
    type: Number,
    required: true
  },
  feedback: {
    type: String,
    default: ''
  },
  gradedAt: {
    type: Date
  },
  gradedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['submitted', 'graded', 'returned', 'resubmitted'],
    default: 'submitted'
  },
  // Submission history for tracking resubmissions
  submissionHistory: [{
    version: {
      type: Number,
      required: true
    },
    textSubmission: String,
    fileSubmissions: [{
      fileName: String,
      originalName: String,
      fileUrl: String,
      fileSize: Number,
      fileType: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }],
    submittedAt: {
      type: Date,
      default: Date.now
    },
    isLate: {
      type: Boolean,
      default: false
    },
    comments: String // Student's comments for this version
  }],
  // Teacher feedback history
  feedbackHistory: [{
    feedback: String,
    grade: Number,
    gradedAt: {
      type: Date,
      default: Date.now
    },
    gradedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    version: Number // Which submission version this feedback is for
  }],
  // Resubmission settings
  allowResubmission: {
    type: Boolean,
    default: true
  },
  resubmissionDeadline: Date,
  maxResubmissions: {
    type: Number,
    default: 3
  },
  currentVersion: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

// Index for better query performance
submissionSchema.index({ assignment: 1, student: 1 }, { unique: true });
submissionSchema.index({ student: 1 });
submissionSchema.index({ course: 1 });

module.exports = mongoose.model('Submission', submissionSchema);

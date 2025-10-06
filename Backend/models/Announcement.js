const mongoose = require('mongoose');

const AnnouncementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  type: {
    type: String,
    enum: ['general', 'assignment', 'exam', 'course', 'system'],
    default: 'general'
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  isPublished: {
    type: Boolean,
    default: true
  },
  scheduledFor: {
    type: Date
  },
  expiresAt: {
    type: Date
  },
  attachments: [{
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
  tags: [{
    type: String,
    trim: true
  }],
  targetAudience: {
    type: String,
    enum: ['all', 'students', 'specific'],
    default: 'all'
  },
  targetStudents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  comments: [{
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    },
    isEdited: {
      type: Boolean,
      default: false
    }
  }],
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    type: {
      type: String,
      enum: ['like', 'love', 'helpful', 'important'],
      default: 'like'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Index for better query performance
AnnouncementSchema.index({ course: 1, createdAt: -1 });
AnnouncementSchema.index({ teacher: 1, createdAt: -1 });
AnnouncementSchema.index({ isPinned: -1, createdAt: -1 });
AnnouncementSchema.index({ isPublished: 1, createdAt: -1 });
AnnouncementSchema.index({ type: 1, createdAt: -1 });

// Virtual for comment count
AnnouncementSchema.virtual('commentCount').get(function() {
  return this.comments.length;
});

// Virtual for reaction count
AnnouncementSchema.virtual('reactionCount').get(function() {
  return this.reactions.length;
});

// Virtual for read count
AnnouncementSchema.virtual('readCount').get(function() {
  return this.readBy.length;
});

module.exports = mongoose.model('Announcement', AnnouncementSchema);

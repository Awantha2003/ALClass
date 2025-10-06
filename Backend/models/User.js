const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  studentId: {
    type: String,
    unique: true,
    sparse: true
  },
  teacherId: {
    type: String,
    unique: true,
    sparse: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['student', 'teacher'],
    required: true
  },
  profilePicture: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    trim: true
  },
  dateOfBirth: {
    type: Date
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true
});

// Pre-save middleware to generate IDs and hash password
userSchema.pre('save', async function(next) {
  try {
    // Generate student/teacher ID if not exists
    if (this.isNew) {
      if (this.role === 'student') {
        const studentCount = await mongoose.model('User').countDocuments({ role: 'student' });
        this.studentId = `STU${String(studentCount + 1).padStart(4, '0')}`;
      } else if (this.role === 'teacher') {
        const teacherCount = await mongoose.model('User').countDocuments({ role: 'teacher' });
        this.teacherId = `TCH${String(teacherCount + 1).padStart(4, '0')}`;
      }
    }

    // Hash password if it's modified
    if (this.isModified('password')) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Post-save validation to ensure IDs are set
userSchema.post('save', function(doc) {
  if (doc.role === 'student' && !doc.studentId) {
    throw new Error('Student ID was not generated properly');
  }
  if (doc.role === 'teacher' && !doc.teacherId) {
    throw new Error('Teacher ID was not generated properly');
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to get public profile (without sensitive data)
userSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);

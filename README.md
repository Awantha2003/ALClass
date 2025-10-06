# ALClass - Educational Platform (Client Project)

A comprehensive MERN stack application for educational feedback and assessment, featuring student question creation, teacher review system, and interactive MCQ quizzes. This is a client project developed for educational institutions to enhance learning through collaborative question creation and assessment.

## 🚀 Features

### For Students
- **Question Creation**: Create multiple choice questions with explanations and live validation
- **Question Management**: Update and delete your own questions (pending status only)
- **MCQ Quizzes**: Take interactive quizzes with real-time feedback
- **Progress Tracking**: View quiz history and performance analytics
- **Course Management**: Access course materials and assignments
- **Anonymous Submission**: Option to submit questions anonymously
- **Real-time Validation**: Live form validation with immediate feedback
- **Interactive UI**: Modern, responsive interface with smooth animations

### For Teachers
- **Question Review**: Review and approve/reject student-created questions with detailed feedback
- **Quiz Grading**: Grade student quiz attempts with custom scoring and feedback
- **Course Management**: Create and manage courses, lessons, and assignments
- **Analytics Dashboard**: View student performance and statistics
- **Real-time Feedback**: Provide instant feedback to students
- **Question Management**: Bulk operations and filtering for efficient review
- **Performance Tracking**: Monitor student engagement and question quality

## 🛠️ Technology Stack

- **Frontend**: React.js, React Router, Axios, Tailwind CSS
- **Backend**: Node.js, Express.js, MongoDB, Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Database**: MongoDB Atlas
- **Styling**: Tailwind CSS with custom components
- **Validation**: Real-time form validation with debouncing
- **State Management**: React Context API
- **HTTP Client**: Axios for API communication
- **UI Components**: Custom React components with responsive design

## 📁 Project Structure

```
ALClass/
├── Backend/
│   ├── models/                    # Database models (User, Course, StudentQuestion, etc.)
│   ├── routes/                    # API routes (auth, student-questions, teacher-questions)
│   ├── middleware/                # Authentication middleware
│   ├── uploads/                   # File uploads (announcements, assignments, questions)
│   └── server.js                  # Main server file
├── Frontend/
│   ├── src/
│   │   ├── components/            # React components
│   │   │   ├── StudentQuestionCreation.js    # Question creation form
│   │   │   ├── StudentQuestionManagement.js  # Question management
│   │   │   ├── EditQuestionModal.js          # Question editing modal
│   │   │   ├── TeacherQuestionReview.js      # Teacher review interface
│   │   │   ├── StudentMCQQuiz.js             # Quiz taking interface
│   │   │   └── ...                           # Other components
│   │   ├── contexts/              # React contexts (AuthContext)
│   │   └── App.js                 # Main app component
│   └── public/                    # Static files
├── package.json                   # Root package configuration
├── start-dev.bat                  # Windows development script
├── start-dev.sh                   # Linux/Mac development script
└── README.md                      # Project documentation
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Awantha2003/ALClass.git
   cd ALClass
   ```

2. **Install Backend Dependencies**
   ```bash
   cd Backend
   npm install
   ```

3. **Install Frontend Dependencies**
   ```bash
   cd Frontend
   npm install
   ```

4. **Environment Setup**
   - Create a `.env` file in the Backend directory
   - Add your MongoDB connection string and JWT secret:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   PORT=5000
   ```

5. **Start the Application**
   ```bash
   # Start Backend (Terminal 1)
   cd Backend
   npm start

   # Start Frontend (Terminal 2)
   cd Frontend
   npm start
   ```

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Student Questions
- `POST /api/student-questions` - Create a question
- `GET /api/student-questions/my-questions` - Get student's questions
- `GET /api/student-questions/course/:courseId` - Get course questions
- `PUT /api/student-questions/:questionId` - Update a question (students only)
- `DELETE /api/student-questions/:questionId` - Delete a question (students only)
- `POST /api/student-questions/quiz/start` - Start a quiz
- `POST /api/student-questions/quiz/:attemptId/submit` - Submit quiz

### Teacher Management
- `GET /api/teacher/student-questions/questions` - Get questions for review
- `PUT /api/teacher/student-questions/questions/:id/review` - Review question
- `GET /api/teacher/student-questions/quiz-attempts` - Get quiz attempts
- `PUT /api/teacher/student-questions/quiz-attempts/:id/grade` - Grade quiz

## 🎯 Key Features Explained

### Student Question Creation & Management
Students can create and manage comprehensive multiple choice questions with:
- Up to 6 answer options with real-time validation
- Correct answer marking with visual indicators
- Detailed explanations with character limits
- Difficulty levels (Easy, Medium, Hard)
- Tags for categorization (up to 10 tags)
- Anonymous submission option
- **Live Validation**: Real-time form validation with immediate feedback
- **CRUD Operations**: Create, read, update, and delete questions (pending status only)
- **Interactive UI**: Modern modal-based editing interface

### Teacher Review System
Teachers can:
- Review all student-created questions with filtering and pagination
- Approve or reject questions with detailed feedback
- Set points and difficulty levels for questions
- Provide comprehensive feedback to students
- Grade quiz attempts with custom scoring
- Monitor question quality and student engagement
- Track performance metrics and analytics

### Interactive Quiz System
- Real-time quiz taking experience with smooth transitions
- Timer tracking and progress indicators
- Immediate feedback and validation
- Detailed results with explanations and analytics
- Performance tracking and history
- Responsive design for all devices

## 🆕 Latest Features (Client Project Updates)

### Frontend Enhancements
- **Live Form Validation**: Real-time validation with debouncing for optimal performance
- **Student Question CRUD**: Complete create, read, update, delete functionality
- **Modal-based Editing**: Modern editing interface with smooth animations
- **Enhanced UX**: Immediate feedback and error handling
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Performance Optimization**: Debounced validation and efficient state management

### Backend Improvements
- **RESTful API**: Complete CRUD operations for student questions
- **Authentication**: Secure JWT-based authentication system
- **Authorization**: Role-based access control (students vs teachers)
- **Data Validation**: Server-side validation with comprehensive error handling
- **Database Optimization**: Efficient queries and data relationships

### Client Project Benefits
- **Educational Institution Ready**: Designed for schools and universities
- **Scalable Architecture**: Can handle multiple courses and users
- **Modern Technology Stack**: Built with latest web technologies
- **Comprehensive Documentation**: Detailed setup and usage instructions
- **Professional UI/UX**: Clean, intuitive interface for all users

## 🔧 Development

### Running in Development Mode
```bash
# Backend
cd Backend
npm run dev

# Frontend
cd Frontend
npm start
```

### Quick Start (Windows)
```bash
# Use the provided batch file
start-dev.bat
```

### Quick Start (Linux/Mac)
```bash
# Use the provided shell script
chmod +x start-dev.sh
./start-dev.sh
```

### Database Models
- **User**: Student and teacher accounts with role-based access
- **Course**: Course information and enrollment management
- **StudentQuestion**: Student-created questions with status tracking
- **StudentQuizAttempt**: Quiz attempts and scores with analytics
- **Assignment**: Course assignments and submissions
- **Submission**: Student submissions with grading system
- **Announcement**: Course announcements and notifications
- **Lesson**: Course lessons and materials

## 📱 User Interface

The application features a modern, responsive design with:
- Clean and intuitive navigation with role-based menus
- Mobile-friendly interface with responsive breakpoints
- Real-time updates and live validation feedback
- Interactive components with smooth animations
- Professional styling with Tailwind CSS
- Dark/light theme support (ready for implementation)
- Accessibility features and keyboard navigation
- Loading states and error handling

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author & Client

**Awantha Imesha** - Project Developer & Client
- Email: awanthaimesh65@gmail.com
- GitHub: [@Awantha2003](https://github.com/Awantha2003)
- Role: Full-stack Developer & Educational Platform Client
- Project Type: Client Project for Educational Institution

## 🙏 Acknowledgments

- React.js community for excellent documentation and support
- MongoDB for robust database solutions and scalability
- Tailwind CSS for beautiful, responsive styling
- Express.js community for backend framework excellence
- All contributors, testers, and educational institutions
- Open source community for continuous inspiration

## 📞 Support & Contact

For technical support, feature requests, or general inquiries:
- **Email**: awanthaimesh65@gmail.com
- **GitHub Issues**: [Create an issue](https://github.com/Awantha2003/ALClass/issues)
- **Project Repository**: [ALClass on GitHub](https://github.com/Awantha2003/ALClass)

### Client Project Information
This is a client project developed for educational institutions. For commercial use or licensing inquiries, please contact the developer directly.

---

**Happy Learning! 🎓**

*ALClass - Empowering Education Through Technology*
# TestFeedback - Educational Platform

A comprehensive MERN stack application for educational feedback and assessment, featuring student question creation and teacher review system.

## 🚀 Features

### For Students
- **Question Creation**: Create multiple choice questions with explanations
- **MCQ Quizzes**: Take interactive quizzes with real-time feedback
- **Progress Tracking**: View quiz history and performance
- **Course Management**: Access course materials and assignments
- **Anonymous Submission**: Option to submit questions anonymously

### For Teachers
- **Question Review**: Review and approve/reject student-created questions
- **Quiz Grading**: Grade student quiz attempts with detailed feedback
- **Course Management**: Create and manage courses, lessons, and assignments
- **Analytics Dashboard**: View student performance and statistics
- **Real-time Feedback**: Provide instant feedback to students

## 🛠️ Technology Stack

- **Frontend**: React.js, React Router, Axios, Tailwind CSS
- **Backend**: Node.js, Express.js, MongoDB, Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Database**: MongoDB Atlas
- **Styling**: Tailwind CSS with custom components

## 📁 Project Structure

```
TestFeedback/
├── Backend/
│   ├── models/           # Database models
│   ├── routes/           # API routes
│   ├── middleware/       # Authentication middleware
│   ├── uploads/          # File uploads
│   └── server.js         # Main server file
├── Frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── contexts/     # React contexts
│   │   └── App.js        # Main app component
│   └── public/           # Static files
└── README.md
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
- `POST /api/student-questions/quiz/start` - Start a quiz
- `POST /api/student-questions/quiz/:attemptId/submit` - Submit quiz

### Teacher Management
- `GET /api/teacher/student-questions/questions` - Get questions for review
- `PUT /api/teacher/student-questions/questions/:id/review` - Review question
- `GET /api/teacher/student-questions/quiz-attempts` - Get quiz attempts
- `PUT /api/teacher/student-questions/quiz-attempts/:id/grade` - Grade quiz

## 🎯 Key Features Explained

### Student Question Creation
Students can create comprehensive multiple choice questions with:
- Up to 6 answer options
- Correct answer marking
- Detailed explanations
- Difficulty levels (Easy, Medium, Hard)
- Tags for categorization
- Anonymous submission option

### Teacher Review System
Teachers can:
- Review all student-created questions
- Approve or reject questions with feedback
- Set points and difficulty levels
- Provide detailed feedback to students
- Grade quiz attempts with custom scoring

### Interactive Quiz System
- Real-time quiz taking experience
- Timer tracking
- Progress indicators
- Immediate feedback
- Detailed results with explanations

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

### Database Models
- **User**: Student and teacher accounts
- **Course**: Course information and enrollment
- **StudentQuestion**: Student-created questions
- **StudentQuizAttempt**: Quiz attempts and scores
- **Assignment**: Course assignments
- **Submission**: Student submissions

## 📱 User Interface

The application features a modern, responsive design with:
- Clean and intuitive navigation
- Mobile-friendly interface
- Real-time updates
- Interactive components
- Professional styling with Tailwind CSS

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Awantha Imesha**
- Email: awanthaimesh65@gmail.com
- GitHub: [@Awantha2003](https://github.com/Awantha2003)

## 🙏 Acknowledgments

- React.js community for excellent documentation
- MongoDB for robust database solutions
- Tailwind CSS for beautiful styling
- All contributors and testers

## 📞 Support

If you have any questions or need help, please contact:
- Email: awanthaimesh65@gmail.com
- Create an issue in the GitHub repository

---

**Happy Learning! 🎓**
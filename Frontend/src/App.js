import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';
import CourseManagement from './components/CourseManagement';
import LessonManagement from './components/LessonManagement';
import StudentDashboard from './components/StudentDashboard';
import AssignmentSubmission from './components/AssignmentSubmission';
import SubmissionManagement from './components/SubmissionManagement';
import TeacherSubmissionManagement from './components/TeacherSubmissionManagement';
import AssignmentManagement from './components/AssignmentManagement';
import StudentAssignmentView from './components/StudentAssignmentView';
import StudentQA from './components/StudentQA';
import TeacherQA from './components/TeacherQA';
import Announcements from './components/Announcements';
import StudentQuestionCreation from './components/StudentQuestionCreation';
import StudentMCQQuiz from './components/StudentMCQQuiz';
import StudentQuizResults from './components/StudentQuizResults';
import StudentQuestionManagement from './components/StudentQuestionManagement';
import TeacherQuestionReview from './components/TeacherQuestionReview';
import TeacherQuizGrading from './components/TeacherQuizGrading';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <Navbar />
        <main>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/student-dashboard" 
              element={
                <ProtectedRoute>
                  <StudentDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/courses" 
              element={
                <ProtectedRoute>
                  <CourseManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/courses/:courseId/lessons" 
              element={
                <ProtectedRoute>
                  <LessonManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/assignments/:assignmentId" 
              element={
                <ProtectedRoute>
                  <AssignmentSubmission />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/submissions/:assignmentId" 
              element={
                <ProtectedRoute>
                  <SubmissionManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/teacher/submissions/:assignmentId" 
              element={
                <ProtectedRoute>
                  <TeacherSubmissionManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/assignments/course/:courseId" 
              element={
                <ProtectedRoute>
                  <AssignmentManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/student/assignments/course/:courseId" 
              element={
                <ProtectedRoute>
                  <StudentAssignmentView />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/qa/course/:courseId" 
              element={
                <ProtectedRoute>
                  <StudentQA />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/teacher/qa/course/:courseId" 
              element={
                <ProtectedRoute>
                  <TeacherQA />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/announcements/course/:courseId" 
              element={
                <ProtectedRoute>
                  <Announcements />
                </ProtectedRoute>
              } 
            />
            {/* Student Question & Quiz Routes */}
            <Route 
              path="/student/create-question" 
              element={
                <ProtectedRoute>
                  <StudentQuestionCreation />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/student/quiz/course/:courseId" 
              element={
                <ProtectedRoute>
                  <StudentMCQQuiz />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/student/quiz-results/:attemptId" 
              element={
                <ProtectedRoute>
                  <StudentQuizResults />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/student/questions" 
              element={
                <ProtectedRoute>
                  <StudentQuestionManagement />
                </ProtectedRoute>
              } 
            />
            {/* Teacher Question & Quiz Routes */}
            <Route 
              path="/teacher/question-review" 
              element={
                <ProtectedRoute>
                  <TeacherQuestionReview />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/teacher/quiz-grading" 
              element={
                <ProtectedRoute>
                  <TeacherQuizGrading />
                </ProtectedRoute>
              } 
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  );
}

export default App;

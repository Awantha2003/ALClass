import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import EditQuestionModal from './EditQuestionModal';

const StudentQuestionManagement = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('questions');
  const [questions, setQuestions] = useState([]);
  const [quizAttempts, setQuizAttempts] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState({
    courseId: '',
    status: ''
  });
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deletingQuestion, setDeletingQuestion] = useState(null);

  useEffect(() => {
    fetchCourses();
    if (activeTab === 'questions') {
      fetchQuestions();
    } else {
      fetchQuizAttempts();
    }
  }, [activeTab, filter]);

  const fetchCourses = async () => {
    try {
      const response = await axios.get('/api/courses');
      setCourses(response.data.courses);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const fetchQuestions = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const params = new URLSearchParams({
        ...filter
      });

      const response = await axios.get(`/api/student-questions/my-questions?${params}`);
      setQuestions(response.data.questions);
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast.error('Failed to load questions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchQuizAttempts = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const params = new URLSearchParams({
        ...filter
      });

      const response = await axios.get(`/api/student-questions/quiz/attempts?${params}`);
      setQuizAttempts(response.data.attempts);
    } catch (error) {
      console.error('Error fetching quiz attempts:', error);
      toast.error('Failed to load quiz attempts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (percentage) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEditQuestion = (question) => {
    setEditingQuestion(question);
    setShowEditModal(true);
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm('Are you sure you want to delete this question? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingQuestion(questionId);
      await axios.delete(`/api/student-questions/${questionId}`);
      toast.success('Question deleted successfully');
      fetchQuestions();
    } catch (error) {
      console.error('Error deleting question:', error);
      toast.error(error.response?.data?.message || 'Failed to delete question');
    } finally {
      setDeletingQuestion(null);
    }
  };

  const handleUpdateQuestion = async (updatedQuestion) => {
    try {
      await axios.put(`/api/student-questions/${editingQuestion._id}`, updatedQuestion);
      toast.success('Question updated successfully');
      setShowEditModal(false);
      setEditingQuestion(null);
      fetchQuestions();
    } catch (error) {
      console.error('Error updating question:', error);
      toast.error(error.response?.data?.message || 'Failed to update question');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold text-gray-700">Loading...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="card">
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">My Questions & Quizzes</h1>
                <p className="text-gray-600">Manage your questions and view quiz results</p>
              </div>
              <button
                onClick={() => {
                  if (activeTab === 'questions') {
                    fetchQuestions(true);
                  } else {
                    fetchQuizAttempts(true);
                  }
                }}
                disabled={refreshing}
                className="btn btn-secondary"
              >
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('questions')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'questions'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                My Questions
              </button>
              <button
                onClick={() => setActiveTab('quizzes')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'quizzes'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Quiz Attempts
              </button>
            </nav>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Course
              </label>
              <select
                name="courseId"
                value={filter.courseId}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Courses</option>
                {courses.map(course => (
                  <option key={course._id} value={course._id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>

            {activeTab === 'questions' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  name="status"
                  value={filter.status}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            )}
          </div>

          {/* Questions Tab */}
          {activeTab === 'questions' && (
            <div>
              {questions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto h-16 w-16 text-gray-400 mb-4">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No questions found</h3>
                  <p className="text-gray-500 mb-4">You haven't created any questions yet.</p>
                  <a
                    href="/student/create-question"
                    className="btn btn-primary"
                  >
                    Create Your First Question
                  </a>
                </div>
              ) : (
                <div className="space-y-4">
                  {questions.map((question) => (
                    <div key={question._id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {question.question}
                          </h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                            <span>Course: {question.course.title}</span>
                            <span>Created: {new Date(question.createdAt).toLocaleDateString()}</span>
                            <span>Difficulty: {question.difficulty}</span>
                            <span>Points: {question.points}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(question.status)}`}>
                            {question.status}
                          </span>
                          {question.status === 'pending' && (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEditQuestion(question)}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteQuestion(question._id)}
                                disabled={deletingQuestion === question._id}
                                className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
                              >
                                {deletingQuestion === question._id ? 'Deleting...' : 'Delete'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mb-4">
                        <h4 className="font-medium text-gray-900 mb-2">Options:</h4>
                        <div className="space-y-2">
                          {question.options.map((option, index) => (
                            <div key={index} className="flex items-center">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium mr-3 ${
                                option.isCorrect ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700'
                              }`}>
                                {String.fromCharCode(65 + index)}
                              </span>
                              <span className={`${option.isCorrect ? 'text-green-800 font-medium' : 'text-gray-700'}`}>
                                {option.text}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {question.teacherFeedback && (
                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <h4 className="font-medium text-yellow-900 mb-1">Teacher Feedback:</h4>
                          <p className="text-yellow-800 text-sm">{question.teacherFeedback}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quiz Attempts Tab */}
          {activeTab === 'quizzes' && (
            <div>
              {quizAttempts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto h-16 w-16 text-gray-400 mb-4">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No quiz attempts found</h3>
                  <p className="text-gray-500 mb-4">You haven't taken any quizzes yet.</p>
                  <a
                    href="/student/quiz"
                    className="btn btn-primary"
                  >
                    Take a Quiz
                  </a>
                </div>
              ) : (
                <div className="space-y-4">
                  {quizAttempts.map((attempt) => (
                    <div key={attempt._id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Quiz Attempt
                          </h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                            <span>Course: {attempt.course.title}</span>
                            <span>Questions: {attempt.questions.length}</span>
                            <span>Submitted: {new Date(attempt.submittedAt).toLocaleDateString()}</span>
                            <span>Time: {formatTime(attempt.timeSpent)}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-lg font-bold ${getScoreColor(attempt.percentage)}`}>
                            {attempt.percentage}%
                          </span>
                          <span className="text-sm text-gray-600">
                            ({attempt.score}/{attempt.totalPoints})
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{attempt.score}</div>
                          <div className="text-sm text-gray-600">Score</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{attempt.percentage}%</div>
                          <div className="text-sm text-gray-600">Percentage</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">{formatTime(attempt.timeSpent)}</div>
                          <div className="text-sm text-gray-600">Time Spent</div>
                        </div>
                      </div>

                      {attempt.teacherGrade && (
                        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <h4 className="font-medium text-yellow-900 mb-1">Teacher Grade: {attempt.teacherGrade}</h4>
                          {attempt.teacherFeedback && (
                            <p className="text-yellow-800 text-sm">{attempt.teacherFeedback}</p>
                          )}
                        </div>
                      )}

                      <div className="flex justify-end">
                        <a
                          href={`/student/quiz-results/${attempt._id}`}
                          className="btn btn-primary"
                        >
                          View Details
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Question Modal */}
      {showEditModal && editingQuestion && (
        <EditQuestionModal
          question={editingQuestion}
          courses={courses}
          onSave={handleUpdateQuestion}
          onClose={() => {
            setShowEditModal(false);
            setEditingQuestion(null);
          }}
        />
      )}
    </div>
  );
};

export default StudentQuestionManagement;

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';

const TeacherQuizGrading = () => {
  const { user } = useAuth();
  const [quizAttempts, setQuizAttempts] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    courseId: ''
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0
  });
  const [gradingAttempt, setGradingAttempt] = useState(null);
  const [gradeData, setGradeData] = useState({
    teacherGrade: '',
    teacherFeedback: ''
  });

  useEffect(() => {
    if (user && user.role === 'teacher') {
      fetchCourses();
      fetchQuizAttempts();
    }
  }, [filter, pagination.currentPage, user]);

  const fetchCourses = async () => {
    try {
      const response = await axios.get('/api/courses');
      setCourses(response.data.courses);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const fetchQuizAttempts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.currentPage,
        limit: 10,
        ...filter
      });

      const response = await axios.get(`/api/teacher/student-questions/quiz-attempts?${params}`);
      
      setQuizAttempts(response.data.attempts);
      setPagination(prev => ({
        ...prev,
        totalPages: response.data.totalPages,
        total: response.data.total
      }));
    } catch (error) {
      console.error('Error fetching quiz attempts:', error);
      toast.error('Failed to load quiz attempts');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter(prev => ({
      ...prev,
      [name]: value
    }));
    setPagination(prev => ({
      ...prev,
      currentPage: 1
    }));
  };

  const handleGrade = (attempt) => {
    setGradingAttempt(attempt);
    setGradeData({
      teacherGrade: attempt.teacherGrade || '',
      teacherFeedback: attempt.teacherFeedback || ''
    });
  };

  const handleGradeSubmit = async () => {
    try {
      await axios.put(
        `/api/teacher/student-questions/quiz-attempts/${gradingAttempt._id}/grade`,
        gradeData
      );

      toast.success('Quiz graded successfully');
      setGradingAttempt(null);
      fetchQuizAttempts();
    } catch (error) {
      console.error('Error grading quiz:', error);
      toast.error(error.response?.data?.message || 'Failed to grade quiz');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (percentage) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!user || user.role !== 'teacher') {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-700 mb-4">Access Denied</h3>
          <p className="text-gray-600">Only teachers can access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold text-gray-700">Loading quiz attempts...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="card">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Quiz Grading</h1>
            <p className="text-gray-600">Review and grade student quiz attempts</p>
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

            <div className="flex items-end">
              <button
                onClick={fetchQuizAttempts}
                className="btn btn-primary w-full"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Quiz Attempts List */}
          {quizAttempts.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-16 w-16 text-gray-400 mb-4">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No quiz attempts found</h3>
              <p className="text-gray-500">No student quiz attempts match your current filters.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {quizAttempts.map((attempt) => (
                <div key={attempt._id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {attempt.student.name}
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

                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => window.open(`/teacher/quiz-attempt/${attempt._id}`, '_blank')}
                      className="btn btn-secondary"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => handleGrade(attempt)}
                      className="btn btn-primary"
                    >
                      {attempt.teacherGrade ? 'Update Grade' : 'Grade Quiz'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center mt-8">
              <div className="flex space-x-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                  disabled={pagination.currentPage === 1}
                  className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                <span className="flex items-center px-4 py-2 text-gray-700">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </span>
                
                <button
                  onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Grading Modal */}
      {gradingAttempt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Grade Quiz Attempt</h3>
              
              <div className="mb-4">
                <h4 className="font-medium text-gray-900 mb-2">Student: {gradingAttempt.student.name}</h4>
                <p className="text-gray-600">Course: {gradingAttempt.course.title}</p>
                <p className="text-gray-600">Auto Score: {gradingAttempt.score}/{gradingAttempt.totalPoints} ({gradingAttempt.percentage}%)</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teacher Grade (out of {gradingAttempt.totalPoints})
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={gradingAttempt.totalPoints}
                    value={gradeData.teacherGrade}
                    onChange={(e) => setGradeData(prev => ({ ...prev, teacherGrade: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="flex items-end">
                  <div className="text-sm text-gray-600">
                    {gradeData.teacherGrade && (
                      <span>
                        Percentage: {Math.round((gradeData.teacherGrade / gradingAttempt.totalPoints) * 100)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teacher Feedback
                </label>
                <textarea
                  value={gradeData.teacherFeedback}
                  onChange={(e) => setGradeData(prev => ({ ...prev, teacherFeedback: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Provide feedback to the student..."
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setGradingAttempt(null)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGradeSubmit}
                  className="btn btn-primary"
                >
                  Submit Grade
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherQuizGrading;

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';

const StudentQuizResults = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [quizAttempt, setQuizAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchQuizAttempt();
    
    // Auto-refresh every 30 seconds to check for teacher grades
    const interval = setInterval(() => {
      fetchQuizAttempt(true);
    }, 30000);
    
    return () => clearInterval(interval);
  }, [attemptId]);

  const fetchQuizAttempt = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const response = await axios.get(`/api/student-questions/quiz/${attemptId}`);
      setQuizAttempt(response.data.quizAttempt);
    } catch (error) {
      console.error('Error fetching quiz attempt:', error);
      toast.error('Failed to load quiz results');
      navigate('/student-dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
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

  const getScoreBgColor = (percentage) => {
    if (percentage >= 80) return 'bg-green-100';
    if (percentage >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold text-gray-700">Loading results...</h3>
        </div>
      </div>
    );
  }

  if (!quizAttempt) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-700 mb-4">Quiz not found</h3>
          <button
            onClick={() => navigate('/student-dashboard')}
            className="btn btn-primary"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="card">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-between items-center mb-4">
              <div></div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Quiz Results</h1>
                <p className="text-gray-600">{quizAttempt.course.title}</p>
              </div>
              <button
                onClick={() => fetchQuizAttempt(true)}
                disabled={refreshing}
                className="btn btn-secondary text-sm"
              >
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* Score Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="text-center">
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${getScoreBgColor(quizAttempt.percentage)} mb-4`}>
                <span className={`text-2xl font-bold ${getScoreColor(quizAttempt.percentage)}`}>
                  {quizAttempt.percentage}%
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Score</h3>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
                <span className="text-2xl font-bold text-blue-600">
                  {quizAttempt.score}/{quizAttempt.totalPoints}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Points</h3>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 mb-4">
                <span className="text-2xl font-bold text-purple-600">
                  {formatTime(quizAttempt.timeSpent)}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Time Spent</h3>
            </div>
          </div>

          {/* Teacher Grade and Feedback */}
          {(quizAttempt.teacherGrade || quizAttempt.teacherFeedback) && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Teacher Review</h3>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                {quizAttempt.teacherGrade && (
                  <div className="mb-3">
                    <h4 className="font-medium text-yellow-900 mb-1">Teacher Grade:</h4>
                    <p className="text-2xl font-bold text-yellow-800">
                      {quizAttempt.teacherGrade}/{quizAttempt.totalPoints}
                      <span className="text-sm font-normal ml-2">
                        ({Math.round((quizAttempt.teacherGrade / quizAttempt.totalPoints) * 100)}%)
                      </span>
                    </p>
                  </div>
                )}
                {quizAttempt.teacherFeedback && (
                  <div>
                    <h4 className="font-medium text-yellow-900 mb-1">Teacher Feedback:</h4>
                    <p className="text-yellow-800">{quizAttempt.teacherFeedback}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Question Review */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Question Review</h3>
            <div className="space-y-6">
              {quizAttempt.questions.map((question, index) => {
                const answer = quizAttempt.answers.find(a => a.questionId === question._id);
                const isCorrect = answer ? answer.isCorrect : false;
                
                return (
                  <div key={question._id} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <h4 className="text-lg font-medium text-gray-900">
                        Question {index + 1}
                      </h4>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {isCorrect ? 'Correct' : 'Incorrect'}
                      </span>
                    </div>

                    <p className="text-gray-700 mb-4">{question.question}</p>

                    <div className="space-y-2">
                      {question.options.map((option, optionIndex) => {
                        const isSelected = answer && answer.selectedOption === optionIndex;
                        const isCorrectOption = option.isCorrect;
                        
                        return (
                          <div
                            key={optionIndex}
                            className={`p-3 rounded-lg border ${
                              isCorrectOption
                                ? 'bg-green-50 border-green-200'
                                : isSelected && !isCorrectOption
                                ? 'bg-red-50 border-red-200'
                                : 'bg-gray-50 border-gray-200'
                            }`}
                          >
                            <div className="flex items-center">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium mr-3 ${
                                isCorrectOption
                                  ? 'bg-green-500 text-white'
                                  : isSelected && !isCorrectOption
                                  ? 'bg-red-500 text-white'
                                  : 'bg-gray-300 text-gray-700'
                              }`}>
                                {String.fromCharCode(65 + optionIndex)}
                              </span>
                              <span className={`${
                                isCorrectOption ? 'text-green-800 font-medium' : 
                                isSelected && !isCorrectOption ? 'text-red-800 font-medium' : 
                                'text-gray-700'
                              }`}>
                                {option.text}
                              </span>
                              {isCorrectOption && (
                                <span className="ml-auto text-green-600 font-medium">
                                  ✓ Correct Answer
                                </span>
                              )}
                              {isSelected && !isCorrectOption && (
                                <span className="ml-auto text-red-600 font-medium">
                                  ✗ Your Answer
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {question.explanation && (
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <h5 className="font-medium text-blue-900 mb-1">Explanation:</h5>
                        <p className="text-blue-800 text-sm">{question.explanation}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => navigate('/student-dashboard')}
              className="btn btn-primary"
            >
              Back to Dashboard
            </button>
            <button
              onClick={() => navigate(`/student/quiz/course/${quizAttempt.course._id}`)}
              className="btn btn-secondary"
            >
              Take Another Quiz
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentQuizResults;

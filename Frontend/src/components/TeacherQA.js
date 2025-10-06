import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';

const TeacherQA = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    search: ''
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0
  });

  // Reply form state
  const [replyForm, setReplyForm] = useState({
    content: ''
  });
  const [replying, setReplying] = useState(false);

  useEffect(() => {
    fetchQuestions();
  }, [courseId, filters, pagination.currentPage]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      console.log('Fetching questions for course:', courseId);
      console.log('Current user:', user);
      
      const params = new URLSearchParams({
        page: pagination.currentPage,
        limit: 10,
        ...filters
      });

      const response = await axios.get(`/api/questions/course/${courseId}?${params}`);
      console.log('Questions response:', response.data);
      
      setQuestions(response.data.questions);
      setPagination({
        currentPage: response.data.currentPage,
        totalPages: response.data.totalPages,
        total: response.data.total
      });
    } catch (error) {
      console.error('Error fetching questions:', error);
      console.error('Error response:', error.response?.data);
      
      if (error.response?.status === 403) {
        toast.error('Access denied. You are not authorized to view questions for this course.');
      } else if (error.response?.status === 404) {
        toast.error('Course not found.');
      } else {
        toast.error('Failed to load questions');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (questionId) => {
    if (!replyForm.content.trim()) {
      toast.error('Please enter a reply');
      return;
    }

    try {
      setReplying(true);
      const response = await axios.post(`/api/questions/${questionId}/reply`, {
        content: replyForm.content
      });

      toast.success('Reply posted successfully');
      setReplyForm({ content: '' });
      setSelectedQuestion(response.data.question);
      fetchQuestions();
    } catch (error) {
      console.error('Error posting reply:', error);
      toast.error('Failed to post reply');
    } finally {
      setReplying(false);
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm('Are you sure you want to delete this question? This action cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(`/api/questions/${questionId}`);
      toast.success('Question deleted successfully');
      setSelectedQuestion(null);
      fetchQuestions();
    } catch (error) {
      console.error('Error deleting question:', error);
      toast.error('Failed to delete question');
    }
  };

  const handleDeleteReply = async (questionId, replyId) => {
    if (!window.confirm('Are you sure you want to delete this reply?')) {
      return;
    }

    try {
      await axios.delete(`/api/questions/${questionId}/reply/${replyId}`);
      toast.success('Reply deleted successfully');
      fetchQuestions();
      if (selectedQuestion) {
        const updatedQuestion = questions.find(q => q._id === selectedQuestion._id);
        if (updatedQuestion) {
          setSelectedQuestion(updatedQuestion);
        }
      }
    } catch (error) {
      console.error('Error deleting reply:', error);
      toast.error('Failed to delete reply');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'answered': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getFileIcon = (fileType) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('image')) return '🖼️';
    return '📎';
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold text-gray-700">Loading questions...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button 
            onClick={() => navigate(-1)}
            className="text-primary-600 hover:text-primary-700 mb-4 flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Q&A Management</h1>
          <p className="text-gray-600">Manage student questions and provide answers</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Questions List */}
          <div className="lg:col-span-1">
            <div className="card">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Questions</h2>
                
                {/* Filters */}
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="form-label">Status</label>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                      className="form-input"
                    >
                      <option value="all">All Status</option>
                      <option value="open">Open</option>
                      <option value="answered">Answered</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="form-label">Priority</label>
                    <select
                      value={filters.priority}
                      onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                      className="form-input"
                    >
                      <option value="all">All Priority</option>
                      <option value="urgent">Urgent</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="form-label">Search</label>
                    <input
                      type="text"
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      className="form-input"
                      placeholder="Search questions..."
                    />
                  </div>
                </div>

                {/* Questions List */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {questions.map((question) => (
                    <div
                      key={question._id}
                      onClick={() => setSelectedQuestion(question)}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedQuestion?._id === question._id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-gray-900 line-clamp-2">
                          {question.title}
                        </h3>
                        <div className="flex space-x-1 ml-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(question.priority)}`}>
                            {question.priority}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-500 mb-2">
                        {question.isAnonymous ? 'Anonymous' : `${question.student.firstName} ${question.student.lastName}`}
                      </p>
                      
                      <div className="flex justify-between items-center text-sm text-gray-500">
                        <span>{formatDate(question.createdAt)}</span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(question.status)}`}>
                          {question.status}
                        </span>
                      </div>
                      
                      <div className="mt-2 text-sm text-gray-500">
                        {question.replyCount} replies
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Question Details */}
          <div className="lg:col-span-2">
            {selectedQuestion ? (
              <div className="space-y-6">
                {/* Question Header */}
                <div className="card">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                          {selectedQuestion.title}
                        </h2>
                        <div className="flex space-x-2 mb-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(selectedQuestion.priority)}`}>
                            {selectedQuestion.priority}
                          </span>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedQuestion.status)}`}>
                            {selectedQuestion.status}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteQuestion(selectedQuestion._id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    
                    <div className="text-gray-700 mb-4">
                      {selectedQuestion.content}
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                      <div className="flex items-center space-x-4">
                        <span>
                          Asked by {selectedQuestion.isAnonymous ? 'Anonymous' : `${selectedQuestion.student.firstName} ${selectedQuestion.student.lastName}`}
                        </span>
                        <span>•</span>
                        <span>{formatDate(selectedQuestion.createdAt)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-green-600">↑ {selectedQuestion.upvotes?.length || 0}</span>
                        <span className="text-red-600">↓ {selectedQuestion.downvotes?.length || 0}</span>
                      </div>
                    </div>

                    {selectedQuestion.tags && selectedQuestion.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {selectedQuestion.tags.map((tag, index) => (
                          <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {selectedQuestion.attachments && selectedQuestion.attachments.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Attachments:</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedQuestion.attachments.map((file, index) => (
                            <div key={index} className="flex items-center text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                              <span className="mr-1">{getFileIcon(file.fileType)}</span>
                              <span>{file.originalName}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Replies */}
                <div className="card">
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Replies ({selectedQuestion.replies.length})</h3>
                    
                    <div className="space-y-4 mb-6">
                      {selectedQuestion.replies.map((reply) => (
                        <div key={reply._id} className="border-l-4 border-primary-200 pl-4">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-gray-900">
                                {reply.author.firstName} {reply.author.lastName}
                              </span>
                              {reply.isTeacherReply && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  Teacher
                                </span>
                              )}
                              <span className="text-sm text-gray-500">
                                {formatDate(reply.createdAt)}
                              </span>
                              {reply.isEdited && (
                                <span className="text-xs text-gray-400">(edited)</span>
                              )}
                            </div>
                            <button
                              onClick={() => handleDeleteReply(selectedQuestion._id, reply._id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                          <p className="text-gray-700">{reply.content}</p>
                        </div>
                      ))}
                    </div>

                    {/* Reply Form */}
                    <div className="border-t pt-4">
                      <h4 className="text-md font-medium text-gray-900 mb-3">Add Reply</h4>
                      <div className="space-y-3">
                        <textarea
                          value={replyForm.content}
                          onChange={(e) => setReplyForm(prev => ({ ...prev, content: e.target.value }))}
                          className="form-input"
                          rows={4}
                          placeholder="Type your reply here..."
                        />
                        <div className="flex justify-end">
                          <button
                            onClick={() => handleReply(selectedQuestion._id)}
                            disabled={replying}
                            className="btn btn-primary"
                          >
                            {replying ? 'Posting...' : 'Post Reply'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card">
                <div className="p-12 text-center">
                  <div className="mx-auto h-24 w-24 text-gray-400 mb-4">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Question</h3>
                  <p className="text-gray-500">Choose a question from the list to view details and reply</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-8 flex justify-center">
            <div className="flex space-x-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                disabled={pagination.currentPage === 1}
                className="btn btn-secondary"
              >
                Previous
              </button>
              <span className="flex items-center px-4 py-2 text-sm text-gray-700">
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                disabled={pagination.currentPage === pagination.totalPages}
                className="btn btn-secondary"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherQA;

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';

const TeacherSubmissionManagement = () => {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [assignment, setAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [grading, setGrading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [submissionHistory, setSubmissionHistory] = useState([]);
  const [feedbackHistory, setFeedbackHistory] = useState([]);
  const [selectedSubmissions, setSelectedSubmissions] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  
  // Grading form state
  const [gradingForm, setGradingForm] = useState({
    grade: '',
    feedback: ''
  });

  // Filters and search
  const [filters, setFilters] = useState({
    status: 'all',
    search: ''
  });

  useEffect(() => {
    fetchAssignmentAndSubmissions();
  }, [assignmentId]);

  const fetchAssignmentAndSubmissions = async () => {
    try {
      setLoading(true);
      
      // Fetch assignment details
      const assignmentResponse = await axios.get(`/api/assignments/${assignmentId}`);
      setAssignment(assignmentResponse.data.assignment);

      // Fetch submissions
      const submissionsResponse = await axios.get(`/api/submissions/assignment/${assignmentId}`);
      setSubmissions(submissionsResponse.data.submissions);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load assignment data');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissionHistory = async (submissionId) => {
    try {
      const response = await axios.get(`/api/submissions/${submissionId}/history`);
      setSubmissionHistory(response.data.history);
      setFeedbackHistory(response.data.feedbackHistory);
    } catch (error) {
      console.error('Error fetching submission history:', error);
      toast.error('Failed to load submission history');
    }
  };

  const handleGradeSubmission = async (e) => {
    e.preventDefault();
    
    if (!selectedSubmission) return;

    try {
      setGrading(true);
      
      const response = await axios.put(`/api/submissions/${selectedSubmission._id}/grade`, {
        grade: parseFloat(gradingForm.grade),
        feedback: gradingForm.feedback
      });

      toast.success('Submission graded successfully');
      
      // Update the submission in the list
      setSubmissions(prev => prev.map(sub => 
        sub._id === selectedSubmission._id ? response.data.submission : sub
      ));
      
      setSelectedSubmission(response.data.submission);
      setGradingForm({ grade: '', feedback: '' });
    } catch (error) {
      console.error('Error grading submission:', error);
      toast.error(error.response?.data?.message || 'Failed to grade submission');
    } finally {
      setGrading(false);
    }
  };

  const handleAddFeedback = async (e) => {
    e.preventDefault();
    
    if (!selectedSubmission) return;

    try {
      setGrading(true);
      
      const response = await axios.post(`/api/submissions/${selectedSubmission._id}/feedback`, {
        feedback: gradingForm.feedback,
        grade: gradingForm.grade ? parseFloat(gradingForm.grade) : undefined
      });

      toast.success('Feedback added successfully');
      
      // Update the submission in the list
      setSubmissions(prev => prev.map(sub => 
        sub._id === selectedSubmission._id ? response.data.submission : sub
      ));
      
      setSelectedSubmission(response.data.submission);
      setGradingForm({ grade: '', feedback: '' });
    } catch (error) {
      console.error('Error adding feedback:', error);
      toast.error(error.response?.data?.message || 'Failed to add feedback');
    } finally {
      setGrading(false);
    }
  };

  const handleReturnSubmission = async (submissionId) => {
    try {
      const response = await axios.put(`/api/submissions/${submissionId}/return`);
      
      toast.success('Submission returned to student');
      
      // Update the submission in the list
      setSubmissions(prev => prev.map(sub => 
        sub._id === submissionId ? response.data.submission : sub
      ));
      
      if (selectedSubmission && selectedSubmission._id === submissionId) {
        setSelectedSubmission(response.data.submission);
      }
    } catch (error) {
      console.error('Error returning submission:', error);
      toast.error(error.response?.data?.message || 'Failed to return submission');
    }
  };

  const handleDeleteSubmission = async (submissionId) => {
    if (!window.confirm('Are you sure you want to delete this submission? This action cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(`/api/submissions/${submissionId}`);
      
      toast.success('Submission deleted successfully');
      
      // Remove from list
      setSubmissions(prev => prev.filter(sub => sub._id !== submissionId));
      
      if (selectedSubmission && selectedSubmission._id === submissionId) {
        setSelectedSubmission(null);
      }
    } catch (error) {
      console.error('Error deleting submission:', error);
      toast.error(error.response?.data?.message || 'Failed to delete submission');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedSubmissions.length === 0) {
      toast.error('Please select submissions to delete');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedSubmissions.length} submission(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      await Promise.all(selectedSubmissions.map(id => axios.delete(`/api/submissions/${id}`)));
      toast.success(`${selectedSubmissions.length} submission(s) deleted successfully`);
      setSelectedSubmissions([]);
      fetchAssignmentAndSubmissions();
      setSelectedSubmission(null);
    } catch (error) {
      console.error('Error deleting submissions:', error);
      toast.error('Failed to delete some submissions');
    }
  };

  const markAsInvalid = async (submissionId, reason) => {
    try {
      await axios.post(`/api/submissions/${submissionId}/feedback`, {
        feedback: `INVALID SUBMISSION: ${reason}`,
        grade: 0
      });
      toast.success('Submission marked as invalid');
      fetchAssignmentAndSubmissions();
    } catch (error) {
      console.error('Error marking submission as invalid:', error);
      toast.error('Failed to mark submission as invalid');
    }
  };

  const toggleSubmissionSelection = (submissionId) => {
    setSelectedSubmissions(prev => 
      prev.includes(submissionId) 
        ? prev.filter(id => id !== submissionId)
        : [...prev, submissionId]
    );
  };

  const selectAllSubmissions = () => {
    if (selectedSubmissions.length === filteredSubmissions.length) {
      setSelectedSubmissions([]);
    } else {
      setSelectedSubmissions(filteredSubmissions.map(sub => sub._id));
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'graded': return 'bg-green-100 text-green-800';
      case 'returned': return 'bg-purple-100 text-purple-800';
      case 'resubmitted': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('powerpoint') || fileType.includes('presentation')) return '📊';
    if (fileType.includes('image')) return '🖼️';
    return '📎';
  };

  const filteredSubmissions = submissions.filter(submission => {
    const matchesStatus = filters.status === 'all' || submission.status === filters.status;
    const matchesSearch = filters.search === '' || 
      submission.student.firstName.toLowerCase().includes(filters.search.toLowerCase()) ||
      submission.student.lastName.toLowerCase().includes(filters.search.toLowerCase()) ||
      submission.student.studentId.toLowerCase().includes(filters.search.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold text-gray-700">Loading submissions...</h3>
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{assignment?.title}</h1>
          <p className="text-gray-600">{assignment?.course.title} • {assignment?.course.subject}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Submissions List */}
          <div className="lg:col-span-1">
            <div className="card">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Submissions ({filteredSubmissions.length})</h2>
              </div>

              {/* Filters */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="form-label">Filter by Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    className="form-input"
                  >
                    <option value="all">All Statuses</option>
                    <option value="submitted">Submitted</option>
                    <option value="graded">Graded</option>
                    <option value="returned">Returned</option>
                    <option value="resubmitted">Resubmitted</option>
                  </select>
                </div>
                
                <div>
                  <label className="form-label">Search Students</label>
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="form-input"
                    placeholder="Search by name or ID..."
                  />
                </div>
              </div>

              {/* Bulk Actions */}
              {filteredSubmissions.length > 0 && (
                <div className="flex items-center justify-between py-3 border-b border-gray-200">
                  <div className="flex items-center space-x-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedSubmissions.length === filteredSubmissions.length && filteredSubmissions.length > 0}
                        onChange={selectAllSubmissions}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Select all ({selectedSubmissions.length} selected)
                      </span>
                    </label>
                  </div>
                  
                  {selectedSubmissions.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleBulkDelete}
                        className="inline-flex items-center px-3 py-1 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete ({selectedSubmissions.length})
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Submissions List */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredSubmissions.map((submission) => (
                  <div
                    key={submission._id}
                    className={`p-4 border rounded-lg transition-colors ${
                      selectedSubmission?._id === submission._id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedSubmissions.includes(submission._id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSubmissionSelection(submission._id);
                        }}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mt-1"
                      />
                      
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => setSelectedSubmission(submission)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium text-gray-900">
                            {submission.student.firstName} {submission.student.lastName}
                          </h3>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(submission.status)}`}>
                            {submission.status}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-500 mb-2">{submission.student.studentId}</p>
                        
                        <div className="flex justify-between items-center text-sm text-gray-500">
                          <span>Submitted: {formatDate(submission.submittedAt)}</span>
                          {submission.isLate && <span className="text-red-500 font-medium">Late</span>}
                        </div>
                        
                        {submission.grade !== null && (
                          <div className="mt-2 text-sm">
                            <span className="font-medium">Grade: {submission.grade}/{assignment?.maxPoints || 100}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col space-y-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsInvalid(submission._id, prompt('Reason for marking as invalid:') || 'Invalid submission');
                          }}
                          className="text-xs text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded"
                          title="Mark as Invalid"
                        >
                          Invalid
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Submission Details */}
          <div className="lg:col-span-2">
            {selectedSubmission ? (
              <div className="space-y-6">
                {/* Submission Header */}
                <div className="card">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-2xl font-semibold text-gray-900">
                        {selectedSubmission.student.firstName} {selectedSubmission.student.lastName}
                      </h2>
                      <p className="text-gray-600">{selectedSubmission.student.studentId} • {selectedSubmission.student.email}</p>
                    </div>
                    <div className="flex space-x-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedSubmission.status)}`}>
                        {selectedSubmission.status}
                      </span>
                      {selectedSubmission.isLate && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                          Late
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-500">Submitted:</span>
                      <p className="text-gray-900">{formatDate(selectedSubmission.submittedAt)}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-500">Version:</span>
                      <p className="text-gray-900">{selectedSubmission.currentVersion}</p>
                    </div>
                    {selectedSubmission.grade !== undefined && (
                      <div>
                        <span className="font-medium text-gray-500">Grade:</span>
                        <p className="text-gray-900">{selectedSubmission.grade}/{selectedSubmission.maxPoints}</p>
                      </div>
                    )}
                    {selectedSubmission.gradedAt && (
                      <div>
                        <span className="font-medium text-gray-500">Graded:</span>
                        <p className="text-gray-900">{formatDate(selectedSubmission.gradedAt)}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Submission Content */}
                <div className="card">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Submission Content</h3>
                  
                  {selectedSubmission.textSubmission && (
                    <div className="mb-6">
                      <h4 className="font-medium text-gray-900 mb-2">Text Submission</h4>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-gray-700 whitespace-pre-wrap">{selectedSubmission.textSubmission}</p>
                      </div>
                    </div>
                  )}

                  {selectedSubmission.fileSubmissions.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-medium text-gray-900 mb-2">Submitted Files</h4>
                      <div className="space-y-2">
                        {selectedSubmission.fileSubmissions.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center">
                              <span className="text-2xl mr-3">{getFileIcon(file.fileType)}</span>
                              <div>
                                <p className="font-medium text-gray-900">{file.originalName}</p>
                                <p className="text-sm text-gray-500">{formatFileSize(file.fileSize)}</p>
                              </div>
                            </div>
                            <a 
                              href={file.fileUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary-600 hover:text-primary-700"
                            >
                              View
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Current Feedback */}
                {selectedSubmission.feedback && (
                  <div className="card">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Feedback</h3>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-gray-700">{selectedSubmission.feedback}</p>
                    </div>
                  </div>
                )}

                {/* Grading Form */}
                <div className="card">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Grade & Feedback</h3>
                  
                  <form onSubmit={selectedSubmission.grade !== undefined ? handleAddFeedback : handleGradeSubmission} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="form-label">Grade (out of {selectedSubmission.maxPoints})</label>
                        <input
                          type="number"
                          min="0"
                          max={selectedSubmission.maxPoints}
                          step="0.1"
                          value={gradingForm.grade}
                          onChange={(e) => setGradingForm(prev => ({ ...prev, grade: e.target.value }))}
                          className="form-input"
                          placeholder="Enter grade"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => {
                            setShowHistory(true);
                            fetchSubmissionHistory(selectedSubmission._id);
                          }}
                          className="btn btn-secondary w-full"
                        >
                          View History
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="form-label">Feedback</label>
                      <textarea
                        value={gradingForm.feedback}
                        onChange={(e) => setGradingForm(prev => ({ ...prev, feedback: e.target.value }))}
                        className="form-input"
                        rows="4"
                        placeholder="Provide feedback to the student..."
                        required
                      />
                    </div>
                    
                    <div className="flex justify-between">
                      <div className="flex space-x-2">
                        <button
                          type="submit"
                          disabled={grading}
                          className="btn btn-primary"
                        >
                          {grading ? 'Processing...' : selectedSubmission.grade !== undefined ? 'Add Feedback' : 'Grade Submission'}
                        </button>
                        
                        {selectedSubmission.status === 'graded' && (
                          <button
                            type="button"
                            onClick={() => handleReturnSubmission(selectedSubmission._id)}
                            className="btn btn-secondary"
                          >
                            Return to Student
                          </button>
                        )}
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => handleDeleteSubmission(selectedSubmission._id)}
                        className="btn btn-danger"
                      >
                        Delete
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : (
              <div className="card text-center py-12">
                <div className="mx-auto h-16 w-16 text-gray-400 mb-4">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No submission selected</h3>
                <p className="text-gray-500">Select a submission from the list to view and grade it</p>
              </div>
            )}
          </div>
        </div>

        {/* Submission History Modal */}
        {showHistory && selectedSubmission && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-semibold text-gray-900">Submission History</h2>
                  <button
                    onClick={() => setShowHistory(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Current Submission */}
                  <div className="border-l-4 border-primary-500 pl-4">
                    <h3 className="font-semibold text-gray-900 mb-2">Current Version (v{selectedSubmission.currentVersion})</h3>
                    <p className="text-sm text-gray-500 mb-2">Submitted: {formatDate(selectedSubmission.submittedAt)}</p>
                    {selectedSubmission.textSubmission && (
                      <p className="text-gray-700 bg-gray-50 p-3 rounded">{selectedSubmission.textSubmission}</p>
                    )}
                  </div>

                  {/* Submission History */}
                  {submissionHistory.map((version, index) => (
                    <div key={index} className="border-l-4 border-gray-300 pl-4">
                      <h3 className="font-semibold text-gray-900 mb-2">Version {version.version}</h3>
                      <p className="text-sm text-gray-500 mb-2">Submitted: {formatDate(version.submittedAt)}</p>
                      {version.comments && (
                        <p className="text-sm text-gray-600 mb-2 italic">Comments: {version.comments}</p>
                      )}
                      {version.textSubmission && (
                        <p className="text-gray-700 bg-gray-50 p-3 rounded">{version.textSubmission}</p>
                      )}
                    </div>
                  ))}

                  {/* Feedback History */}
                  {feedbackHistory.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-4">Feedback History</h3>
                      <div className="space-y-4">
                        {feedbackHistory.map((feedback, index) => (
                          <div key={index} className="bg-blue-50 p-4 rounded-lg">
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-sm font-medium text-gray-600">Version {feedback.version}</span>
                              <span className="text-sm text-gray-500">{formatDate(feedback.gradedAt)}</span>
                            </div>
                            {feedback.grade !== undefined && (
                              <p className="text-sm text-gray-700 mb-2">Grade: {feedback.grade}/{selectedSubmission.maxPoints}</p>
                            )}
                            <p className="text-gray-700">{feedback.feedback}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherSubmissionManagement;

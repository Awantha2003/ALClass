import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';

const SubmissionManagement = () => {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [assignment, setAssignment] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [submissionHistory, setSubmissionHistory] = useState([]);
  const [feedbackHistory, setFeedbackHistory] = useState([]);
  
  // Form state
  const [formData, setFormData] = useState({
    textSubmission: '',
    comments: ''
  });
  const [files, setFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    fetchAssignmentAndSubmission();
  }, [assignmentId]);

  const fetchAssignmentAndSubmission = async () => {
    try {
      setLoading(true);
      
      // Fetch assignment details
      const assignmentResponse = await axios.get(`/api/assignments/${assignmentId}`);
      setAssignment(assignmentResponse.data.assignment);

      // Try to fetch existing submission
      try {
        const submissionResponse = await axios.get(`/api/submissions/assignment/${assignmentId}`);
        const studentSubmission = submissionResponse.data.submissions.find(
          sub => sub.student._id === user._id
        );
        if (studentSubmission) {
          setSubmission(studentSubmission);
          setFormData({
            textSubmission: studentSubmission.textSubmission || '',
            comments: ''
          });
        }
      } catch (error) {
        // No existing submission, that's okay
        console.log('No existing submission found');
      }
    } catch (error) {
      console.error('Error fetching assignment:', error);
      
      if (error.response?.status === 403) {
        toast.error('You are not enrolled in this course. Please enroll first.');
        navigate('/courses');
      } else if (error.response?.status === 401) {
        toast.error('Please log in again.');
        navigate('/login');
      } else if (error.response?.status === 404) {
        toast.error('Assignment not found.');
        navigate('/courses');
      } else {
        toast.error('Failed to load assignment details. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissionHistory = async () => {
    if (!submission) return;
    
    try {
      const response = await axios.get(`/api/submissions/${submission._id}/history`);
      setSubmissionHistory(response.data.history);
      setFeedbackHistory(response.data.feedbackHistory);
    } catch (error) {
      console.error('Error fetching submission history:', error);
      toast.error('Failed to load submission history');
    }
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      setFiles(prev => [...prev, ...droppedFiles]);
    }
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!assignment) return;

    // Validate submission type
    if (assignment.submissionType === 'file-upload' && files.length === 0) {
      toast.error('Please upload at least one file');
      return;
    }

    if (assignment.submissionType === 'text' && !formData.textSubmission.trim()) {
      toast.error('Please provide a text submission');
      return;
    }

    try {
      setSubmitting(true);
      
      const formDataToSend = new FormData();
      formDataToSend.append('assignmentId', assignmentId);
      formDataToSend.append('textSubmission', formData.textSubmission);
      formDataToSend.append('comments', formData.comments);
      
      files.forEach((file, index) => {
        formDataToSend.append('files', file);
      });

      const response = await axios.post('/api/submissions', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success(response.data.message);
      setSubmission(response.data.submission);
      setFiles([]);
      setFormData(prev => ({ ...prev, comments: '' }));
      
      // Refresh submission data
      fetchAssignmentAndSubmission();
    } catch (error) {
      console.error('Error submitting assignment:', error);
      toast.error(error.response?.data?.message || 'Failed to submit assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResubmit = async (e) => {
    e.preventDefault();
    
    if (!submission) return;

    try {
      setSubmitting(true);
      
      const formDataToSend = new FormData();
      formDataToSend.append('textSubmission', formData.textSubmission);
      formDataToSend.append('comments', formData.comments);
      
      files.forEach((file, index) => {
        formDataToSend.append('files', file);
      });

      const response = await axios.put(`/api/submissions/${submission._id}`, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success(response.data.message);
      setSubmission(response.data.submission);
      setFiles([]);
      setFormData(prev => ({ ...prev, comments: '' }));
      
      // Refresh submission data
      fetchAssignmentAndSubmission();
    } catch (error) {
      console.error('Error resubmitting assignment:', error);
      toast.error(error.response?.data?.message || 'Failed to resubmit assignment');
    } finally {
      setSubmitting(false);
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

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold text-gray-700">Loading assignment...</h3>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Assignment not found</h3>
          <button 
            onClick={() => navigate(-1)}
            className="btn btn-primary"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{assignment.title}</h1>
          <p className="text-gray-600">{assignment.course.title} • {assignment.course.subject}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Assignment Details */}
          <div className="lg:col-span-2">
            <div className="card mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Assignment Details</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Instructions</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{assignment.instructions}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Due Date</span>
                    <p className="text-gray-900">{formatDate(assignment.dueDate)}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Max Points</span>
                    <p className="text-gray-900">{assignment.maxPoints}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Submission Type</span>
                    <p className="text-gray-900 capitalize">{assignment.submissionType.replace('-', ' ')}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Late Submissions</span>
                    <p className="text-gray-900">{assignment.allowLateSubmission ? 'Allowed' : 'Not Allowed'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Current Submission Status */}
            {submission && (
              <div className="card mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-semibold text-gray-900">Current Submission</h2>
                  <div className="flex space-x-2">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(submission.status)}`}>
                      {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                    </span>
                    {submission.isLate && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                        Late
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-500">Submitted:</span>
                      <p className="text-gray-900">{formatDate(submission.submittedAt)}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-500">Version:</span>
                      <p className="text-gray-900">{submission.currentVersion}</p>
                    </div>
                    {submission.grade !== undefined && (
                      <div>
                        <span className="font-medium text-gray-500">Grade:</span>
                        <p className="text-gray-900">{submission.grade}/{submission.maxPoints}</p>
                      </div>
                    )}
                    {submission.gradedAt && (
                      <div>
                        <span className="font-medium text-gray-500">Graded:</span>
                        <p className="text-gray-900">{formatDate(submission.gradedAt)}</p>
                      </div>
                    )}
                  </div>

                  {submission.feedback && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Teacher Feedback</h4>
                      <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{submission.feedback}</p>
                    </div>
                  )}

                  {submission.fileSubmissions.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Submitted Files</h4>
                      <div className="space-y-2">
                        {submission.fileSubmissions.map((file, index) => (
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

                  {submission.textSubmission && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Text Submission</h4>
                      <p className="text-gray-700 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">{submission.textSubmission}</p>
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setShowHistory(true);
                        fetchSubmissionHistory();
                      }}
                      className="btn btn-secondary"
                    >
                      View History
                    </button>
                    {submission.allowResubmission && submission.currentVersion < submission.maxResubmissions && (
                      <button
                        onClick={() => {
                          setFormData(prev => ({ ...prev, textSubmission: submission.textSubmission }));
                        }}
                        className="btn btn-primary"
                      >
                        Resubmit
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Submission Form */}
            <div className="card">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                {submission ? 'Resubmit Assignment' : 'Submit Assignment'}
              </h2>

              <form onSubmit={submission ? handleResubmit : handleSubmit} className="space-y-6">
                {assignment.submissionType === 'text' && (
                  <div>
                    <label className="form-label">Text Submission *</label>
                    <textarea
                      value={formData.textSubmission}
                      onChange={(e) => setFormData(prev => ({ ...prev, textSubmission: e.target.value }))}
                      className="form-input"
                      rows="8"
                      placeholder="Enter your submission here..."
                      required={assignment.submissionType === 'text'}
                    />
                  </div>
                )}

                {assignment.submissionType === 'file-upload' && (
                  <div>
                    <label className="form-label">File Upload *</label>
                    <div
                      className={`border-2 border-dashed rounded-lg p-6 text-center ${
                        dragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300'
                      }`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                    >
                      <input
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        className="hidden"
                        id="file-upload"
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="text-lg font-medium text-gray-900 mb-2">
                          Drop files here or click to browse
                        </p>
                        <p className="text-sm text-gray-500">
                          PDF, DOC, DOCX, PPT, PPTX, TXT, and image files (max 50MB each)
                        </p>
                      </label>
                    </div>

                    {files.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <h4 className="font-medium text-gray-900">Selected Files:</h4>
                        {files.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center">
                              <span className="text-2xl mr-3">{getFileIcon(file.type)}</span>
                              <div>
                                <p className="font-medium text-gray-900">{file.name}</p>
                                <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="form-label">Comments (Optional)</label>
                  <textarea
                    value={formData.comments}
                    onChange={(e) => setFormData(prev => ({ ...prev, comments: e.target.value }))}
                    className="form-input"
                    rows="3"
                    placeholder="Add any comments about your submission..."
                  />
                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn btn-primary"
                  >
                    {submitting ? 'Submitting...' : submission ? 'Resubmit' : 'Submit'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Assignment Info */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Assignment Info</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Points:</span>
                  <span className="font-medium">{assignment.maxPoints}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Type:</span>
                  <span className="font-medium capitalize">{assignment.submissionType.replace('-', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Late Submissions:</span>
                  <span className="font-medium">{assignment.allowLateSubmission ? 'Yes' : 'No'}</span>
                </div>
                {submission && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Resubmissions:</span>
                    <span className="font-medium">{submission.currentVersion}/{submission.maxResubmissions}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Due Date Warning */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Due Date</h3>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 mb-2">
                  {new Date(assignment.dueDate).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-500">
                  {new Date(assignment.dueDate).toLocaleTimeString()}
                </p>
                {new Date() > new Date(assignment.dueDate) && (
                  <p className="text-red-600 text-sm mt-2 font-medium">
                    Deadline has passed
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Submission History Modal */}
        {showHistory && (
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
                    <h3 className="font-semibold text-gray-900 mb-2">Current Version (v{submission?.currentVersion})</h3>
                    <p className="text-sm text-gray-500 mb-2">Submitted: {formatDate(submission?.submittedAt)}</p>
                    {submission?.textSubmission && (
                      <p className="text-gray-700 bg-gray-50 p-3 rounded">{submission.textSubmission}</p>
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
                              <p className="text-sm text-gray-700 mb-2">Grade: {feedback.grade}/{submission?.maxPoints}</p>
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

export default SubmissionManagement;

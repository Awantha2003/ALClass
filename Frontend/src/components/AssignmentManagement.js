import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';

const AssignmentManagement = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructions: '',
    dueDate: '',
    maxPoints: 100,
    allowLateSubmission: false,
    latePenalty: 0,
    submissionType: 'both',
    allowResubmission: true,
    maxResubmissions: 3,
    resubmissionDeadline: ''
  });
  const [files, setFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    fetchCourseAndAssignments();
  }, [courseId]);

  const fetchCourseAndAssignments = async () => {
    try {
      setLoading(true);
      
      // Fetch course details
      const courseResponse = await axios.get(`/api/courses/${courseId}`);
      setCourse(courseResponse.data.course);

      // Fetch assignments for this course
      const assignmentsResponse = await axios.get(`/api/assignments/course/${courseId}`);
      setAssignments(assignmentsResponse.data.assignments);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load course data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
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
    
    try {
      setLoading(true);
      
      const assignmentData = {
        ...formData,
        course: courseId,
        maxPoints: parseInt(formData.maxPoints),
        latePenalty: parseFloat(formData.latePenalty),
        maxResubmissions: parseInt(formData.maxResubmissions)
      };

      let response;
      if (editingAssignment) {
        response = await axios.put(`/api/assignments/${editingAssignment._id}`, assignmentData);
        toast.success('Assignment updated successfully!');
      } else {
        response = await axios.post('/api/assignments', assignmentData);
        toast.success('Assignment created successfully!');
      }

      // Upload files if any
      if (files.length > 0) {
        const formDataToSend = new FormData();
        files.forEach((file, index) => {
          formDataToSend.append('attachments', file);
        });

        await axios.post(`/api/assignments/${response.data.assignment._id}/attachments`, formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }

      setShowCreateForm(false);
      setEditingAssignment(null);
      setFormData({
        title: '',
        description: '',
        instructions: '',
        dueDate: '',
        maxPoints: 100,
        allowLateSubmission: false,
        latePenalty: 0,
        submissionType: 'both',
        allowResubmission: true,
        maxResubmissions: 3,
        resubmissionDeadline: ''
      });
      setFiles([]);
      
      fetchCourseAndAssignments();
    } catch (error) {
      console.error('Error saving assignment:', error);
      toast.error(error.response?.data?.message || 'Failed to save assignment');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (assignment) => {
    setEditingAssignment(assignment);
    setFormData({
      title: assignment.title,
      description: assignment.description,
      instructions: assignment.instructions,
      dueDate: assignment.dueDate ? assignment.dueDate.split('T')[0] + 'T' + assignment.dueDate.split('T')[1].substring(0, 5) : '',
      maxPoints: assignment.maxPoints,
      allowLateSubmission: assignment.allowLateSubmission,
      latePenalty: assignment.latePenalty,
      submissionType: assignment.submissionType,
      allowResubmission: assignment.allowResubmission,
      maxResubmissions: assignment.maxResubmissions,
      resubmissionDeadline: assignment.resubmissionDeadline ? assignment.resubmissionDeadline.split('T')[0] + 'T' + assignment.resubmissionDeadline.split('T')[1].substring(0, 5) : ''
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (assignmentId) => {
    if (window.confirm('Are you sure you want to delete this assignment? This will also delete all submissions.')) {
      try {
        setLoading(true);
        await axios.delete(`/api/assignments/${assignmentId}`);
        toast.success('Assignment deleted successfully!');
        fetchCourseAndAssignments();
      } catch (error) {
        console.error('Error deleting assignment:', error);
        toast.error(error.response?.data?.message || 'Failed to delete assignment');
      } finally {
        setLoading(false);
      }
    }
  };

  const handlePublish = async (assignmentId, isPublished) => {
    try {
      await axios.put(`/api/assignments/${assignmentId}`, {
        isPublished: !isPublished
      });
      toast.success(`Assignment ${!isPublished ? 'published' : 'unpublished'} successfully!`);
      fetchCourseAndAssignments();
    } catch (error) {
      console.error('Error updating assignment:', error);
      toast.error('Failed to update assignment status');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (assignment) => {
    if (!assignment.isPublished) return 'bg-gray-100 text-gray-800';
    const now = new Date();
    const dueDate = new Date(assignment.dueDate);
    if (now > dueDate) return 'bg-red-100 text-red-800';
    return 'bg-green-100 text-green-800';
  };

  const getStatusText = (assignment) => {
    if (!assignment.isPublished) return 'Draft';
    const now = new Date();
    const dueDate = new Date(assignment.dueDate);
    if (now > dueDate) return 'Overdue';
    return 'Active';
  };

  if (loading && !course) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold text-gray-700">Loading course...</h3>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Course not found</h3>
          <button 
            onClick={() => navigate('/courses')}
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Assignment Management</h1>
          <p className="text-gray-600">{course.title} • {course.subject}</p>
        </div>

        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Assignments ({assignments.length})</h2>
            <p className="text-gray-600">Create and manage assignments for your course</p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn btn-primary px-6 py-3"
          >
            Create New Assignment
          </button>
        </div>

        {/* Create/Edit Assignment Form */}
        {showCreateForm && (
          <div className="card mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">
                {editingAssignment ? 'Edit Assignment' : 'Create New Assignment'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingAssignment(null);
                  setFormData({
                    title: '',
                    description: '',
                    instructions: '',
                    dueDate: '',
                    maxPoints: 100,
                    allowLateSubmission: false,
                    latePenalty: 0,
                    submissionType: 'both',
                    allowResubmission: true,
                    maxResubmissions: 3,
                    resubmissionDeadline: ''
                  });
                  setFiles([]);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="form-label">Assignment Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Enter assignment title"
                    required
                  />
                </div>
                
                <div>
                  <label className="form-label">Max Points *</label>
                  <input
                    type="number"
                    name="maxPoints"
                    value={formData.maxPoints}
                    onChange={handleChange}
                    className="form-input"
                    min="1"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Description *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="form-input"
                  rows="3"
                  placeholder="Brief description of the assignment"
                  required
                />
              </div>

              <div>
                <label className="form-label">Instructions *</label>
                <textarea
                  name="instructions"
                  value={formData.instructions}
                  onChange={handleChange}
                  className="form-input"
                  rows="6"
                  placeholder="Detailed instructions for students"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="form-label">Due Date *</label>
                  <input
                    type="datetime-local"
                    name="dueDate"
                    value={formData.dueDate}
                    onChange={handleChange}
                    className="form-input"
                    required
                  />
                </div>
                
                <div>
                  <label className="form-label">Submission Type *</label>
                  <select
                    name="submissionType"
                    value={formData.submissionType}
                    onChange={handleChange}
                    className="form-input"
                    required
                  >
                    <option value="both">Both Text and Files</option>
                    <option value="text">Text Only</option>
                    <option value="file-upload">Files Only</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="allowLateSubmission"
                      checked={formData.allowLateSubmission}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    <label className="form-label mb-0">Allow Late Submissions</label>
                  </div>
                  
                  {formData.allowLateSubmission && (
                    <div>
                      <label className="form-label">Late Penalty (%)</label>
                      <input
                        type="number"
                        name="latePenalty"
                        value={formData.latePenalty}
                        onChange={handleChange}
                        className="form-input"
                        min="0"
                        max="100"
                        step="0.1"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="allowResubmission"
                      checked={formData.allowResubmission}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    <label className="form-label mb-0">Allow Resubmissions</label>
                  </div>
                  
                  {formData.allowResubmission && (
                    <div>
                      <label className="form-label">Max Resubmissions</label>
                      <input
                        type="number"
                        name="maxResubmissions"
                        value={formData.maxResubmissions}
                        onChange={handleChange}
                        className="form-input"
                        min="1"
                        max="10"
                      />
                    </div>
                  )}
                </div>
              </div>

              {formData.allowResubmission && (
                <div>
                  <label className="form-label">Resubmission Deadline (Optional)</label>
                  <input
                    type="datetime-local"
                    name="resubmissionDeadline"
                    value={formData.resubmissionDeadline}
                    onChange={handleChange}
                    className="form-input"
                  />
                </div>
              )}

              {/* File Upload Section */}
              <div>
                <label className="form-label">Assignment Attachments (Optional)</label>
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

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingAssignment(null);
                    setFormData({
                      title: '',
                      description: '',
                      instructions: '',
                      dueDate: '',
                      maxPoints: 100,
                      allowLateSubmission: false,
                      latePenalty: 0,
                      submissionType: 'both',
                      allowResubmission: true,
                      maxResubmissions: 3,
                      resubmissionDeadline: ''
                    });
                    setFiles([]);
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                >
                  {loading ? 'Saving...' : editingAssignment ? 'Update Assignment' : 'Create Assignment'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Assignments List */}
        {assignments.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto h-24 w-24 text-gray-400 mb-4">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments created yet</h3>
            <p className="text-gray-500 mb-4">Create your first assignment to get started</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn btn-primary"
            >
              Create Assignment
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assignments.map((assignment) => (
              <div key={assignment._id} className="card hover:shadow-xl transition-shadow duration-200">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-semibold text-gray-900 line-clamp-2">
                      {assignment.title}
                    </h3>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(assignment)}`}>
                      {getStatusText(assignment)}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {assignment.description}
                  </p>
                  
                  <div className="space-y-2 text-sm text-gray-500 mb-4">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Due: {formatDate(assignment.dueDate)}
                    </div>
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {assignment.maxPoints} points
                    </div>
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      {assignment.submissionType.replace('-', ' ')}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(assignment)}
                      className="btn btn-secondary flex-1 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handlePublish(assignment._id, assignment.isPublished)}
                      className={`btn flex-1 text-sm ${
                        assignment.isPublished ? 'btn-warning' : 'btn-success'
                      }`}
                    >
                      {assignment.isPublished ? 'Unpublish' : 'Publish'}
                    </button>
                    <button
                      onClick={() => navigate(`/teacher/submissions/${assignment._id}`)}
                      className="btn btn-primary flex-1 text-sm"
                    >
                      Grade
                    </button>
                    <button
                      onClick={() => handleDelete(assignment._id)}
                      className="btn btn-danger flex-1 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AssignmentManagement;

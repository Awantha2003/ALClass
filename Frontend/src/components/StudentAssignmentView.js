import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';

const StudentAssignmentView = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEnrollment, setShowEnrollment] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    search: ''
  });

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

      // Fetch student's submissions
      const submissionsResponse = await axios.get('/api/submissions/student');
      setSubmissions(submissionsResponse.data.submissions);
    } catch (error) {
      console.error('Error fetching data:', error);
      
      if (error.response?.status === 403) {
        toast.error('You are not enrolled in this course. Please enroll first.');
        // Show enrollment option instead of redirecting
        setShowEnrollment(true);
      } else if (error.response?.status === 401) {
        toast.error('Please log in again.');
        navigate('/login');
      } else if (error.response?.status === 404) {
        toast.error('Course not found.');
        navigate('/courses');
      } else {
        toast.error('Failed to load course data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    try {
      setEnrolling(true);
      await axios.post(`/api/courses/${courseId}/enroll`);
      toast.success('Successfully enrolled in course!');
      setShowEnrollment(false);
      // Refresh the data
      fetchCourseAndAssignments();
    } catch (error) {
      console.error('Enrollment error:', error);
      toast.error('Failed to enroll in course');
    } finally {
      setEnrolling(false);
    }
  };

  const getSubmissionStatus = (assignment) => {
    const submission = submissions.find(s => s.assignment._id === assignment._id);
    if (!submission) return { status: 'not-submitted', color: 'red', text: 'Not Submitted' };
    
    if (submission.status === 'graded' || submission.status === 'returned') {
      return { 
        status: 'graded', 
        color: 'green', 
        text: `Graded: ${submission.grade}/${assignment.maxPoints}` 
      };
    }
    
    return { status: 'submitted', color: 'blue', text: 'Submitted' };
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getDaysUntilDeadline = (dueDate) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffTime = due - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusColor = (assignment) => {
    if (!assignment.isPublished) return 'bg-gray-100 text-gray-800';
    const now = new Date();
    const dueDate = new Date(assignment.dueDate);
    if (now > dueDate) return 'bg-red-100 text-red-800';
    return 'bg-green-100 text-green-800';
  };

  const getStatusText = (assignment) => {
    if (!assignment.isPublished) return 'Not Published';
    const now = new Date();
    const dueDate = new Date(assignment.dueDate);
    if (now > dueDate) return 'Overdue';
    return 'Active';
  };

  const filteredAssignments = assignments.filter(assignment => {
    const matchesStatus = filters.status === 'all' || 
      (filters.status === 'published' && assignment.isPublished) ||
      (filters.status === 'overdue' && assignment.isPublished && new Date() > new Date(assignment.dueDate)) ||
      (filters.status === 'upcoming' && assignment.isPublished && new Date() <= new Date(assignment.dueDate));
    
    const matchesSearch = filters.search === '' || 
      assignment.title.toLowerCase().includes(filters.search.toLowerCase()) ||
      assignment.description.toLowerCase().includes(filters.search.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  const getFileIcon = (fileType) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('powerpoint') || fileType.includes('presentation')) return '📊';
    if (fileType.includes('image')) return '🖼️';
    return '📎';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold text-gray-700">Loading assignments...</h3>
        </div>
      </div>
    );
  }

  if (showEnrollment) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Course Enrollment Required</h2>
            <p className="text-gray-600 mb-6">
              You need to enroll in this course before you can view assignments.
            </p>
            <div className="space-y-3">
              <button
                onClick={handleEnroll}
                disabled={enrolling}
                className="btn btn-primary w-full"
              >
                {enrolling ? 'Enrolling...' : 'Enroll in Course'}
              </button>
              <button
                onClick={() => navigate('/courses')}
                className="btn btn-secondary w-full"
              >
                Browse All Courses
              </button>
            </div>
          </div>
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Assignments</h1>
          <p className="text-gray-600">{course.title} • {course.subject}</p>
        </div>

        {/* Filters */}
        <div className="card mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Filter by Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="form-input"
              >
                <option value="all">All Assignments</option>
                <option value="published">Published Only</option>
                <option value="upcoming">Upcoming</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
            
            <div>
              <label className="form-label">Search Assignments</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="form-input"
                placeholder="Search by title or description..."
              />
            </div>
          </div>
        </div>

        {/* Assignments List */}
        {filteredAssignments.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto h-24 w-24 text-gray-400 mb-4">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments found</h3>
            <p className="text-gray-500">
              {filters.status === 'all' 
                ? 'No assignments have been created for this course yet'
                : 'No assignments match your current filters'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssignments.map((assignment) => {
              const submissionStatus = getSubmissionStatus(assignment);
              const daysLeft = getDaysUntilDeadline(assignment.dueDate);
              
              return (
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
                      {daysLeft > 0 && daysLeft <= 7 && (
                        <div className="flex items-center text-orange-600">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {daysLeft} days left
                        </div>
                      )}
                    </div>

                    {/* Assignment Attachments */}
                    {assignment.attachments && assignment.attachments.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Attachments:</h4>
                        <div className="space-y-1">
                          {assignment.attachments.slice(0, 3).map((file, index) => (
                            <div key={index} className="flex items-center text-xs text-gray-600">
                              <span className="mr-2">{getFileIcon(file.fileType)}</span>
                              <span className="truncate">{file.originalName}</span>
                            </div>
                          ))}
                          {assignment.attachments.length > 3 && (
                            <p className="text-xs text-gray-500">+{assignment.attachments.length - 3} more files</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Submission Status */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Status:</span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${submissionStatus.color}-100 text-${submissionStatus.color}-800`}>
                          {submissionStatus.text}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => navigate(`/assignments/${assignment._id}`)}
                        className="btn btn-primary flex-1 text-sm"
                        disabled={!assignment.isPublished}
                      >
                        {assignment.isPublished ? 'View Assignment' : 'Not Published'}
                      </button>
                      
                      {assignment.isPublished && (
                        <button
                          onClick={() => navigate(`/submissions/${assignment._id}`)}
                          className="btn btn-secondary flex-1 text-sm"
                        >
                          {submissionStatus.status === 'not-submitted' ? 'Submit' : 'View Submission'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Quick Stats */}
        {assignments.length > 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card text-center">
              <div className="text-2xl font-bold text-primary-600 mb-2">
                {assignments.filter(a => a.isPublished).length}
              </div>
              <p className="text-sm text-gray-600">Published</p>
            </div>
            
            <div className="card text-center">
              <div className="text-2xl font-bold text-green-600 mb-2">
                {submissions.filter(s => s.status === 'graded' || s.status === 'returned').length}
              </div>
              <p className="text-sm text-gray-600">Graded</p>
            </div>
            
            <div className="card text-center">
              <div className="text-2xl font-bold text-blue-600 mb-2">
                {submissions.filter(s => s.status === 'submitted').length}
              </div>
              <p className="text-sm text-gray-600">Submitted</p>
            </div>
            
            <div className="card text-center">
              <div className="text-2xl font-bold text-orange-600 mb-2">
                {assignments.filter(a => a.isPublished && new Date() > new Date(a.dueDate)).length}
              </div>
              <p className="text-sm text-gray-600">Overdue</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentAssignmentView;

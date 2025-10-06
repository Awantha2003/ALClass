import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';

const CourseManagement = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [enrolling, setEnrolling] = useState({});
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    startDate: '',
    endDate: ''
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      let endpoint = '/api/courses';
      
      // For students, fetch available courses to browse and enroll
      if (user.role === 'student') {
        endpoint = '/api/courses/available';
      }
      
      const response = await axios.get(endpoint);
      setCourses(response.data.courses);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to fetch courses');
    } finally {
      setLoading(false);
    }
  };

  const validateField = (name, value) => {
    let error = '';
    
    switch (name) {
      case 'title':
        if (!value.trim()) {
          error = 'Course title is required';
        } else if (value.trim().length < 3) {
          error = 'Title must be at least 3 characters long';
        }
        break;
      case 'description':
        if (!value.trim()) {
          error = 'Description is required';
        } else if (value.trim().length < 10) {
          error = 'Description must be at least 10 characters long';
        }
        break;
      case 'subject':
        if (!value.trim()) {
          error = 'Subject is required';
        } else if (value.trim().length < 2) {
          error = 'Subject must be at least 2 characters long';
        }
        break;
      case 'startDate':
        if (!value) {
          error = 'Start date is required';
        } else {
          const startDate = new Date(value);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (startDate < today) {
            error = 'Start date cannot be in the past';
          }
        }
        break;
      case 'endDate':
        if (!value) {
          error = 'End date is required';
        } else if (formData.startDate) {
          const startDate = new Date(formData.startDate);
          const endDate = new Date(value);
          if (endDate <= startDate) {
            error = 'End date must be after start date';
          }
        }
        break;
      default:
        break;
    }
    
    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Live validation - validate as user types
    if (touched[name]) {
      const error = validateField(name, value);
      setErrors({
        ...errors,
        [name]: error
      });
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched({
      ...touched,
      [name]: true
    });
    
    const error = validateField(name, value);
    setErrors({
      ...errors,
      [name]: error
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all fields
    const newErrors = {};
    const fieldsToValidate = ['title', 'description', 'subject', 'startDate', 'endDate'];
    
    fieldsToValidate.forEach(field => {
      const error = validateField(field, formData[field]);
      if (error) {
        newErrors[field] = error;
      }
    });
    
    setErrors(newErrors);
    setTouched({
      title: true,
      description: true,
      subject: true,
      startDate: true,
      endDate: true
    });
    
    // If there are validation errors, don't submit
    if (Object.keys(newErrors).length > 0) {
      toast.error('Please fix the errors below');
      return;
    }
    
    console.log('Form submitted with data:', formData);
    
    try {
      setLoading(true);
      
      if (editingCourse) {
        console.log('Updating course:', editingCourse._id);
        await axios.put(`/api/courses/${editingCourse._id}`, formData);
        toast.success('Course updated successfully!');
      } else {
        console.log('Creating new course');
        await axios.post('/api/courses', formData);
        toast.success('Course created successfully!');
      }
      
      setShowCreateForm(false);
      setEditingCourse(null);
      setFormData({ title: '', description: '', subject: '', startDate: '', endDate: '' });
      fetchCourses();
    } catch (error) {
      console.error('Error saving course:', error);
      toast.error(error.response?.data?.message || 'Failed to save course');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (course) => {
    setEditingCourse(course);
    setFormData({
      title: course.title,
      description: course.description,
      subject: course.subject,
      startDate: course.startDate ? course.startDate.split('T')[0] : '',
      endDate: course.endDate ? course.endDate.split('T')[0] : ''
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (courseId) => {
    if (window.confirm('Are you sure you want to delete this course? This will also delete all lessons, quizzes, and assignments.')) {
      try {
        setLoading(true);
        await axios.delete(`/api/courses/${courseId}`);
        toast.success('Course deleted successfully!');
        fetchCourses();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to delete course');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleEnroll = async (courseId) => {
    try {
      setEnrolling(prev => ({ ...prev, [courseId]: true }));
      await axios.post(`/api/courses/${courseId}/enroll`);
      toast.success('Successfully enrolled in course!');
      fetchCourses(); // Refresh to update enrollment status
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to enroll in course');
    } finally {
      setEnrolling(prev => ({ ...prev, [courseId]: false }));
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading && courses.length === 0) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold text-gray-700">Loading courses...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {user.role === 'teacher' ? 'Course Management' : 'Browse Courses'}
            </h1>
            <p className="text-gray-600 mt-2">
              {user.role === 'teacher' 
                ? 'Manage your courses and content' 
                : 'Discover and enroll in available courses'
              }
            </p>
          </div>
          {user.role === 'teacher' && (
            <div className="flex flex-col items-end space-y-2">
              <button
                onClick={() => {
                  console.log('Create button clicked');
                  setShowCreateForm(true);
                }}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create New Course
                  </>
                )}
              </button>
              <p className="text-xs text-gray-500">Click to add a new course</p>
            </div>
          )}
        </div>

        {/* Alternative Create Button - Always Visible for Teachers */}
        {user.role === 'teacher' && !showCreateForm && (
          <div className="text-center mb-8">
            <div className="bg-white rounded-lg shadow-md p-6 border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors">
              <div className="flex flex-col items-center">
                <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Create Your First Course</h3>
                <p className="text-gray-500 mb-4">Start building your course content and engage with students</p>
                <button
                  onClick={() => {
                    console.log('Alternative create button clicked');
                    setShowCreateForm(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create New Course
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create/Edit Course Form */}
        {showCreateForm && (
          <div className="card mb-8 border-2 border-primary-200 bg-primary-50">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">
                {editingCourse ? 'Edit Course' : 'Create New Course'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingCourse(null);
                  setFormData({ title: '', description: '', subject: '', startDate: '', endDate: '' });
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
                  <label className="form-label">Course Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`form-input ${touched.title && errors.title ? 'border-red-500 focus:ring-red-500' : ''}`}
                    placeholder="Enter course title"
                    required
                  />
                  {touched.title && errors.title && (
                    <p className="mt-1 text-sm text-red-600">{errors.title}</p>
                  )}
                </div>
                
                <div>
                  <label className="form-label">Subject *</label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`form-input ${touched.subject && errors.subject ? 'border-red-500 focus:ring-red-500' : ''}`}
                    placeholder="e.g., Mathematics, Science, English"
                    required
                  />
                  {touched.subject && errors.subject && (
                    <p className="mt-1 text-sm text-red-600">{errors.subject}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="form-label">Description *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`form-input ${touched.description && errors.description ? 'border-red-500 focus:ring-red-500' : ''}`}
                  rows="4"
                  placeholder="Describe what students will learn in this course"
                  required
                />
                {touched.description && errors.description && (
                  <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="form-label">Start Date</label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`form-input ${touched.startDate && errors.startDate ? 'border-red-500 focus:ring-red-500' : ''}`}
                  />
                  {touched.startDate && errors.startDate && (
                    <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>
                  )}
                </div>
                
                <div>
                  <label className="form-label">End Date</label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`form-input ${touched.endDate && errors.endDate ? 'border-red-500 focus:ring-red-500' : ''}`}
                  />
                  {touched.endDate && errors.endDate && (
                    <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingCourse(null);
                    setFormData({ title: '', description: '', subject: '', startDate: '', endDate: '' });
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : editingCourse ? 'Update Course' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Courses Grid */}
        {courses.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto h-24 w-24 text-gray-400 mb-4">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {user.role === 'teacher' ? 'No courses created yet' : 'No courses available'}
            </h3>
            <p className="text-gray-500">
              {user.role === 'teacher' 
                ? 'Create your first course to start teaching' 
                : 'No courses are currently available for enrollment'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div key={course._id} className="card hover:shadow-xl transition-shadow duration-200">
                {course.thumbnail && (
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-full h-48 object-cover rounded-t-xl mb-4"
                  />
                )}
                
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-semibold text-gray-900 line-clamp-2">
                      {course.title}
                    </h3>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800 ml-2">
                      {course.subject}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {course.description}
                  </p>
                  
                  <div className="space-y-2 text-sm text-gray-500 mb-4">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {course.students?.length || 0} students
                    </div>
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      {course.totalLessons} lessons
                    </div>
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Created {formatDate(course.createdAt)}
                    </div>
                  </div>
                  
                  {user.role === 'teacher' ? (
                    <div className="space-y-3">
                      {/* Edit and Delete Buttons */}
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(course)}
                          className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-3 rounded-lg text-sm transition-colors duration-200 flex items-center justify-center"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(course._id)}
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-3 rounded-lg text-sm transition-colors duration-200 flex items-center justify-center"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </div>
                      
                      {/* Management Buttons */}
                      <div className="grid grid-cols-1 gap-2">
                        <Link
                          to={`/assignments/course/${course._id}`}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-3 rounded-lg text-sm transition-colors duration-200 flex items-center justify-center"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Manage Assignments
                        </Link>
                        <Link
                          to={`/teacher/qa/course/${course._id}`}
                          className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-3 rounded-lg text-sm transition-colors duration-200 flex items-center justify-center"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Q&A Management
                        </Link>
                        <Link
                          to={`/announcements/course/${course._id}`}
                          className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-3 rounded-lg text-sm transition-colors duration-200 flex items-center justify-center"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                          </svg>
                          Announcements
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {course.isEnrolled ? (
                        <div className="space-y-2">
                          <div className="text-center">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 mb-2">
                              ✓ Enrolled
                            </span>
                          </div>
                          <div className="space-y-2">
                            <Link
                              to={`/student/assignments/course/${course._id}`}
                              className="btn btn-primary w-full text-sm"
                            >
                              Assignments
                            </Link>
                            <Link
                              to={`/courses/${course._id}/lessons`}
                              className="btn btn-secondary w-full text-sm"
                            >
                              Lessons
                            </Link>
                            <Link
                              to={`/qa/course/${course._id}`}
                              className="btn btn-secondary w-full text-sm"
                            >
                              Q&A
                            </Link>
                            <Link
                              to={`/announcements/course/${course._id}`}
                              className="btn btn-secondary w-full text-sm"
                            >
                              Announcements
                            </Link>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEnroll(course._id)}
                          disabled={enrolling[course._id]}
                          className="btn btn-primary w-full text-sm"
                        >
                          {enrolling[course._id] ? 'Enrolling...' : 'Enroll Now'}
                    </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Floating Action Button for Mobile */}
        {user.role === 'teacher' && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="fixed bottom-6 right-6 z-50 bg-primary-600 text-white rounded-full p-4 shadow-2xl hover:bg-primary-700 transform hover:scale-110 transition-all duration-200 md:hidden"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default CourseManagement;

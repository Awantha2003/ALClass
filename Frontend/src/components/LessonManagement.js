import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';

const LessonManagement = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    lessonOrder: 1,
    tags: '',
    difficulty: 'beginner'
  });

  useEffect(() => {
    fetchCourseAndLessons();
  }, [courseId]);

  const fetchCourseAndLessons = async () => {
    try {
      setLoading(true);
      const [courseResponse, lessonsResponse] = await Promise.all([
        axios.get(`/api/courses/${courseId}`),
        axios.get(`/api/lessons/course/${courseId}`)
      ]);
      
      setCourse(courseResponse.data.course);
      setLessons(lessonsResponse.data.lessons);
    } catch (error) {
      console.error('Error fetching course and lessons:', error);
      toast.error('Failed to fetch course data');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      const lessonData = {
        ...formData,
        course: courseId,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      };
      
      if (editingLesson) {
        await axios.put(`/api/lessons/${editingLesson._id}`, lessonData);
        toast.success('Lesson updated successfully!');
      } else {
        await axios.post('/api/lessons', lessonData);
        toast.success('Lesson created successfully!');
      }
      
      setShowCreateForm(false);
      setEditingLesson(null);
      setFormData({ title: '', description: '', lessonOrder: lessons.length + 1, tags: '', difficulty: 'beginner' });
      fetchCourseAndLessons();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save lesson');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (lesson) => {
    setEditingLesson(lesson);
    setFormData({
      title: lesson.title,
      description: lesson.description,
      lessonOrder: lesson.lessonOrder,
      tags: lesson.tags.join(', '),
      difficulty: lesson.difficulty
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (lessonId) => {
    if (window.confirm('Are you sure you want to delete this lesson? This will also delete all associated files.')) {
      try {
        setLoading(true);
        await axios.delete(`/api/lessons/${lessonId}`);
        toast.success('Lesson deleted successfully!');
        fetchCourseAndLessons();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to delete lesson');
      } finally {
        setLoading(false);
      }
    }
  };

  const handlePublishToggle = async (lesson) => {
    try {
      await axios.put(`/api/lessons/${lesson._id}`, {
        isPublished: !lesson.isPublished
      });
      toast.success(`Lesson ${!lesson.isPublished ? 'published' : 'unpublished'} successfully!`);
      fetchCourseAndLessons();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update lesson status');
    }
  };

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
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

  return (
    <div className="min-h-screen gradient-bg py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Course Header */}
        <div className="card mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{course?.title}</h1>
              <p className="text-gray-600 mb-4">{course?.description}</p>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800">
                  {course?.subject}
                </span>
                <span>{lessons.length} lessons</span>
                <span>{course?.students?.length || 0} students</span>
              </div>
            </div>
            <button
              onClick={() => navigate('/courses')}
              className="btn btn-secondary"
            >
              Back to Courses
            </button>
          </div>
        </div>

        {/* Create/Edit Lesson Form */}
        {showCreateForm && (
          <div className="card mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">
                {editingLesson ? 'Edit Lesson' : 'Create New Lesson'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingLesson(null);
                  setFormData({ title: '', description: '', lessonOrder: lessons.length + 1, tags: '', difficulty: 'beginner' });
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
                  <label className="form-label">Lesson Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Enter lesson title"
                    required
                  />
                </div>
                
                <div>
                  <label className="form-label">Lesson Order *</label>
                  <input
                    type="number"
                    name="lessonOrder"
                    value={formData.lessonOrder}
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
                  rows="4"
                  placeholder="Describe what students will learn in this lesson"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="form-label">Difficulty Level</label>
                  <select
                    name="difficulty"
                    value={formData.difficulty}
                    onChange={handleChange}
                    className="form-select"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                
                <div>
                  <label className="form-label">Tags (comma-separated)</label>
                  <input
                    type="text"
                    name="tags"
                    value={formData.tags}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="e.g., algebra, equations, problem-solving"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingLesson(null);
                    setFormData({ title: '', description: '', lessonOrder: lessons.length + 1, tags: '', difficulty: 'beginner' });
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
                  {loading ? 'Saving...' : editingLesson ? 'Update Lesson' : 'Create Lesson'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lessons List */}
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Lessons</h2>
            {user.role === 'teacher' && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="btn btn-primary"
              >
                Add New Lesson
              </button>
            )}
          </div>

          {lessons.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-24 w-24 text-gray-400 mb-4">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No lessons yet</h3>
              <p className="text-gray-500">Create your first lesson to start teaching</p>
            </div>
          ) : (
            <div className="space-y-4">
              {lessons.map((lesson) => (
                <div key={lesson._id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow duration-200">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Lesson {lesson.lessonOrder}
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          lesson.difficulty === 'beginner' ? 'bg-green-100 text-green-800' :
                          lesson.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {lesson.difficulty}
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          lesson.isPublished ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {lesson.isPublished ? 'Published' : 'Draft'}
                        </span>
                      </div>
                      
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">{lesson.title}</h3>
                      <p className="text-gray-600 mb-4">{lesson.description}</p>
                      
                      <div className="flex items-center space-x-6 text-sm text-gray-500">
                        {lesson.videoUrl && (
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            {lesson.videoDuration > 0 ? formatDuration(lesson.videoDuration) : 'Video'}
                          </div>
                        )}
                        {lesson.attachments.length > 0 && (
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                            {lesson.attachments.length} files
                          </div>
                        )}
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          {lesson.views} views
                        </div>
                      </div>
                      
                      {lesson.tags.length > 0 && (
                        <div className="mt-3">
                          {lesson.tags.map((tag, index) => (
                            <span key={index} className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded mr-2 mb-1">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {user.role === 'teacher' && (
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => handlePublishToggle(lesson)}
                          className={`btn text-sm ${
                            lesson.isPublished ? 'btn-secondary' : 'btn-success'
                          }`}
                        >
                          {lesson.isPublished ? 'Unpublish' : 'Publish'}
                        </button>
                        <button
                          onClick={() => handleEdit(lesson)}
                          className="btn btn-secondary text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(lesson._id)}
                          className="btn btn-danger text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LessonManagement;

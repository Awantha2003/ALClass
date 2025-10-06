import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch courses, assignments, and submissions in parallel
      const [coursesResponse, submissionsResponse] = await Promise.all([
        axios.get('/api/courses'),
        axios.get('/api/submissions/student')
      ]);

      setCourses(coursesResponse.data.courses);
      setSubmissions(submissionsResponse.data.submissions);

      // Get assignments from all courses
      const allAssignments = [];
      for (const course of coursesResponse.data.courses) {
        try {
          const assignmentsResponse = await axios.get(`/api/assignments/course/${course._id}`);
          allAssignments.push(...assignmentsResponse.data.assignments);
        } catch (error) {
          console.error(`Error fetching assignments for course ${course._id}:`, error);
        }
      }
      
      setAssignments(allAssignments);
      
      // Filter upcoming deadlines (next 7 days)
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const upcoming = allAssignments.filter(assignment => {
        const dueDate = new Date(assignment.dueDate);
        return dueDate > now && dueDate <= nextWeek && assignment.isPublished;
      }).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
      
      setUpcomingDeadlines(upcoming);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getDaysUntilDeadline = (dueDate) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffTime = due - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getSubmissionStatus = (assignment) => {
    const submission = submissions.find(s => s.assignment._id === assignment._id);
    if (!submission) return { status: 'not-submitted', color: 'red' };
    
    if (submission.status === 'graded' || submission.status === 'returned') {
      return { status: 'graded', color: 'green', grade: submission.grade };
    }
    
    return { status: 'submitted', color: 'blue' };
  };

  const calculateOverallProgress = () => {
    if (assignments.length === 0) return 0;
    const submittedCount = assignments.filter(assignment => {
      const submission = submissions.find(s => s.assignment._id === assignment._id);
      return submission && (submission.status === 'submitted' || submission.status === 'graded' || submission.status === 'returned');
    }).length;
    return Math.round((submittedCount / assignments.length) * 100);
  };

  const getAverageGrade = () => {
    const gradedSubmissions = submissions.filter(s => s.grade !== undefined);
    if (gradedSubmissions.length === 0) return 0;
    const total = gradedSubmissions.reduce((sum, s) => sum + s.grade, 0);
    return Math.round((total / gradedSubmissions.length) * 100) / 100;
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold text-gray-700">Loading dashboard...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Student Dashboard</h1>
              <p className="text-gray-600">Track your progress and manage your coursework</p>
            </div>
            <div className="flex space-x-3">
              <Link to="/student/create-question" className="btn btn-primary">
                Create Question
              </Link>
              <Link to="/student/questions" className="btn btn-secondary">
                My Questions
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card text-center">
            <div className="mx-auto h-12 w-12 text-primary-600 mb-4">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{courses.length}</h3>
            <p className="text-gray-600">Enrolled Courses</p>
          </div>

          <div className="card text-center">
            <div className="mx-auto h-12 w-12 text-green-600 mb-4">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{calculateOverallProgress()}%</h3>
            <p className="text-gray-600">Assignment Progress</p>
          </div>

          <div className="card text-center">
            <div className="mx-auto h-12 w-12 text-blue-600 mb-4">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{getAverageGrade()}</h3>
            <p className="text-gray-600">Average Grade</p>
          </div>

          <div className="card text-center">
            <div className="mx-auto h-12 w-12 text-orange-600 mb-4">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{upcomingDeadlines.length}</h3>
            <p className="text-gray-600">Upcoming Deadlines</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upcoming Deadlines */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-900">Upcoming Deadlines</h2>
                <Link to="/courses" className="btn btn-primary text-sm">
                  View All Courses
                </Link>
              </div>

              {upcomingDeadlines.length === 0 ? (
                <div className="text-center py-8">
                  <div className="mx-auto h-16 w-16 text-gray-400 mb-4">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No upcoming deadlines</h3>
                  <p className="text-gray-500">You're all caught up!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingDeadlines.map((assignment) => {
                    const daysLeft = getDaysUntilDeadline(assignment.dueDate);
                    const submissionStatus = getSubmissionStatus(assignment);
                    
                    return (
                      <div key={assignment._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                              {assignment.title}
                            </h3>
                            <p className="text-gray-600 text-sm mb-2">{assignment.course.title}</p>
                            <div className="flex items-center space-x-4 text-sm">
                              <div className="flex items-center">
                                <svg className="w-4 h-4 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Due: {formatDate(assignment.dueDate)}
                              </div>
                              <div className="flex items-center">
                                <svg className="w-4 h-4 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {daysLeft} days left
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end space-y-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              submissionStatus.color === 'green' ? 'bg-green-100 text-green-800' :
                              submissionStatus.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {submissionStatus.status === 'graded' ? `Graded: ${submissionStatus.grade}/${assignment.maxPoints}` :
                               submissionStatus.status === 'submitted' ? 'Submitted' : 'Not Submitted'}
                            </span>
                            {submissionStatus.status === 'not-submitted' && (
                              <Link 
                                to={`/submissions/${assignment._id}`}
                                className="btn btn-primary text-sm"
                              >
                                Submit Now
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Recent Submissions */}
          <div>
            <div className="card">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Recent Submissions</h2>
              
              {submissions.length === 0 ? (
                <div className="text-center py-8">
                  <div className="mx-auto h-16 w-16 text-gray-400 mb-4">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No submissions yet</h3>
                  <p className="text-gray-500">Submit your first assignment to see it here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {submissions.slice(0, 5).map((submission) => (
                    <div key={submission._id} className="border border-gray-200 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {submission.assignment.title}
                      </h3>
                      <p className="text-gray-600 text-sm mb-2">{submission.course.title}</p>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">
                          {formatDateTime(submission.submittedAt)}
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          submission.status === 'graded' || submission.status === 'returned' ? 'bg-green-100 text-green-800' :
                          submission.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {submission.status === 'graded' || submission.status === 'returned' ? 
                            `Graded: ${submission.grade}/${submission.maxPoints}` : 
                            submission.status.charAt(0).toUpperCase() + submission.status.slice(1)
                          }
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Enrolled Courses */}
            <div className="card mt-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">My Courses</h2>
              
              {courses.length === 0 ? (
                <div className="text-center py-8">
                  <div className="mx-auto h-16 w-16 text-gray-400 mb-4">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No courses enrolled</h3>
                  <p className="text-gray-500 mb-4">Enroll in courses to start learning</p>
                  <Link to="/courses" className="btn btn-primary">
                    Browse Courses
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {courses.slice(0, 4).map((course) => (
                    <div key={course._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {course.title}
                      </h3>
                      <p className="text-gray-600 text-sm mb-2">{course.subject}</p>
                      <div className="flex justify-between items-center text-sm text-gray-500 mb-3">
                        <span>{course.totalLessons} lessons</span>
                        <span>{course.totalAssignments} assignments</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Link 
                          to={`/student/assignments/course/${course._id}`}
                          className="btn btn-primary text-sm"
                        >
                          Assignments
                        </Link>
                        <Link 
                          to={`/courses/${course._id}/lessons`}
                          className="btn btn-secondary text-sm"
                        >
                          Lessons
                        </Link>
                        <Link 
                          to={`/qa/course/${course._id}`}
                          className="btn btn-secondary text-sm"
                        >
                          Q&A
                        </Link>
                        <Link 
                          to={`/announcements/course/${course._id}`}
                          className="btn btn-secondary text-sm"
                        >
                          Announcements
                        </Link>
                        <Link 
                          to={`/student/quiz/course/${course._id}`}
                          className="btn btn-secondary text-sm"
                        >
                          Take Quiz
                        </Link>
                        <Link 
                          to="/student/questions"
                          className="btn btn-secondary text-sm"
                        >
                          My Questions
                        </Link>
                      </div>
                    </div>
                  ))}
                  {courses.length > 4 && (
                    <Link to="/courses" className="block text-center text-primary-600 hover:text-primary-700 font-medium">
                      View all {courses.length} courses
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;

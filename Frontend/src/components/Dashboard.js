import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';

const Dashboard = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      let endpoint = '';
      
      if (user.role === 'teacher') {
        endpoint = '/api/users/students';
      } else if (user.role === 'student') {
        endpoint = '/api/users/teachers';
      }

      if (endpoint) {
        const response = await axios.get(endpoint);
        setUsers(response.data[user.role === 'teacher' ? 'students' : 'teachers']);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Redirect students to student dashboard
  if (user.role === 'student') {
    return <Navigate to="/student-dashboard" replace />;
  }

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
        <div className="card animate-fade-in">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Welcome to your {user.role === 'student' ? 'Student' : 'Teacher'} Dashboard
            </h1>
            <p className="text-gray-600">Manage your profile and {user.role === 'teacher' ? 'create courses' : 'enroll in courses'}</p>
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link 
                to="/courses" 
                className="card hover:shadow-lg transition-shadow duration-200 text-center p-6"
              >
                <div className="mx-auto h-12 w-12 text-primary-600 mb-4">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {user.role === 'teacher' ? 'My Courses' : 'Browse Courses'}
                </h3>
                <p className="text-gray-600 text-sm">
                  {user.role === 'teacher' 
                    ? 'Create and manage your courses' 
                    : 'Find and enroll in courses'
                  }
                </p>
              </Link>

              <Link 
                to="/profile" 
                className="card hover:shadow-lg transition-shadow duration-200 text-center p-6"
              >
                <div className="mx-auto h-12 w-12 text-primary-600 mb-4">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Profile</h3>
                <p className="text-gray-600 text-sm">Update your personal information</p>
              </Link>

              {user.role === 'teacher' && (
                <>
                  <Link 
                    to="/teacher/question-review" 
                    className="card hover:shadow-lg transition-shadow duration-200 text-center p-6"
                  >
                    <div className="mx-auto h-12 w-12 text-primary-600 mb-4">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Review Questions</h3>
                    <p className="text-gray-600 text-sm">Review and approve student questions</p>
                  </Link>

                  <Link 
                    to="/teacher/quiz-grading" 
                    className="card hover:shadow-lg transition-shadow duration-200 text-center p-6"
                  >
                    <div className="mx-auto h-12 w-12 text-primary-600 mb-4">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Grade Quizzes</h3>
                    <p className="text-gray-600 text-sm">Grade student quiz attempts</p>
                  </Link>

                  <div className="card hover:shadow-lg transition-shadow duration-200 text-center p-6">
                    <div className="mx-auto h-12 w-12 text-primary-600 mb-4">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Analytics</h3>
                    <p className="text-gray-600 text-sm">View student performance and insights</p>
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Profile Information Card */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Your Profile Information</h2>
            <div className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-xl p-6 border border-primary-100">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <span className="text-sm font-medium text-gray-500">Full Name</span>
                  <p className="text-lg font-semibold text-gray-900">
                    {user.firstName} {user.lastName}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-sm font-medium text-gray-500">ID</span>
                  <p className="text-lg font-semibold text-primary-600">
                    {user.role === 'student' ? user.studentId : user.teacherId}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-sm font-medium text-gray-500">Email</span>
                  <p className="text-lg font-semibold text-gray-900">{user.email}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-sm font-medium text-gray-500">Role</span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800">
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </span>
                </div>
                {user.phone && (
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-gray-500">Phone</span>
                    <p className="text-lg font-semibold text-gray-900">{user.phone}</p>
                  </div>
                )}
                {user.dateOfBirth && (
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-gray-500">Date of Birth</span>
                    <p className="text-lg font-semibold text-gray-900">{formatDate(user.dateOfBirth)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Users List */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              {user.role === 'teacher' ? 'Students' : 'Teachers'} Directory
            </h2>
            
            {users.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto h-24 w-24 text-gray-400 mb-4">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No {user.role === 'teacher' ? 'students' : 'teachers'} found
                </h3>
                <p className="text-gray-500">
                  {user.role === 'teacher' ? 'Students' : 'Teachers'} will appear here once they register.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {users.map((userItem) => (
                  <div key={userItem._id} className="card bg-gradient-to-br from-primary-600 to-purple-600 text-white border-0 transform hover:scale-105 transition-all duration-200">
                    <div className="flex items-center mb-4">
                      {userItem.profilePicture ? (
                        <img 
                          src={userItem.profilePicture} 
                          alt="Profile" 
                          className="w-12 h-12 rounded-full object-cover mr-4 border-2 border-white border-opacity-30"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-white bg-opacity-20 flex items-center justify-center mr-4 text-xl font-bold">
                          {userItem.firstName?.charAt(0) || 'U'}{userItem.lastName?.charAt(0) || 'U'}
                        </div>
                      )}
                      <div>
                        <h3 className="text-lg font-semibold">
                          {userItem.firstName || 'Unknown'} {userItem.lastName || 'User'}
                        </h3>
                        <p className="text-sm opacity-90">
                          {userItem.role === 'student' ? userItem.studentId : userItem.teacherId}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2 opacity-75" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                        </svg>
                        <span className="opacity-90">{userItem.email}</span>
                      </div>
                      {userItem.phone && (
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2 opacity-75" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span className="opacity-90">{userItem.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2 opacity-75" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="opacity-90">Joined {formatDate(userItem.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

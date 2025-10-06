import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  return (
    <nav className="gradient-nav py-4 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <Link 
            to="/" 
            className="text-white text-2xl font-bold hover:text-primary-100 transition-colors duration-200"
          >
            Feedback App
          </Link>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <span className="text-white text-sm font-medium hidden sm:block">
                  Welcome, {user.firstName} ({user.role === 'student' ? user.studentId : user.teacherId})
                </span>
                <Link 
                  to="/dashboard" 
                  className="btn btn-secondary text-white hover:bg-white hover:bg-opacity-20 transition-all duration-200"
                >
                  Dashboard
                </Link>
                <Link 
                  to="/courses" 
                  className="btn btn-secondary text-white hover:bg-white hover:bg-opacity-20 transition-all duration-200"
                >
                  {user.role === 'teacher' ? 'My Courses' : 'Courses'}
                </Link>
                <Link 
                  to="/profile" 
                  className="btn btn-secondary text-white hover:bg-white hover:bg-opacity-20 transition-all duration-200"
                >
                  Profile
                </Link>
                <button 
                  onClick={handleLogout} 
                  className="btn btn-danger hover:bg-red-700 transition-all duration-200"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className="btn btn-primary hover:bg-primary-700 transition-all duration-200"
                >
                  Login
                </Link>
                <Link 
                  to="/register" 
                  className="btn btn-secondary text-white hover:bg-white hover:bg-opacity-20 transition-all duration-200"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

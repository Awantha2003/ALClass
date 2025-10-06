import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AssignmentSubmission = () => {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    // Redirect to the appropriate submission management page
    if (user.role === 'teacher') {
      navigate(`/teacher/submissions/${assignmentId}`);
    } else {
      navigate(`/submissions/${assignmentId}`);
    }
  }, [assignmentId, user.role, navigate]);

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <h3 className="text-xl font-semibold text-gray-700">Redirecting...</h3>
      </div>
    </div>
  );
};

export default AssignmentSubmission;
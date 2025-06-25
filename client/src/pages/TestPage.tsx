import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const TestPage: React.FC = () => {
  const { user, isAuthenticated, loading } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-green-600 mb-4">🎉 Login Successful!</h1>
        <p className="text-gray-600 mb-4">You have successfully logged in and been redirected.</p>
        
        <div className="bg-gray-100 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Debug Info:</h3>
          <ul className="text-sm space-y-1">
            <li><strong>Loading:</strong> {loading ? 'true' : 'false'}</li>
            <li><strong>Authenticated:</strong> {isAuthenticated ? 'true' : 'false'}</li>
            <li><strong>User:</strong> {user ? user.name : 'null'}</li>
            <li><strong>Email:</strong> {user ? user.email : 'null'}</li>
          </ul>
        </div>

        <div className="mt-6 space-y-3">
          <a 
            href="/dashboard" 
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors inline-block text-center"
          >
            Go to Dashboard (Protected Route)
          </a>
          
          <a 
            href="/dashboard-direct" 
            className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors inline-block text-center"
          >
            Go to Dashboard (Direct - Test)
          </a>
          
          <div className="text-xs text-gray-500 mt-2">
            If "Protected Route" fails but "Direct" works, the issue is with ProtectedRoute component.
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestPage;

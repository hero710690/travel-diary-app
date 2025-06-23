import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const AuthDebug: React.FC = () => {
  const { user, loading, isAuthenticated } = useAuth();

  return (
    <div className="fixed top-4 right-4 bg-black bg-opacity-75 text-white p-4 rounded-lg text-xs z-50">
      <h3 className="font-bold mb-2">Auth Debug</h3>
      <div>Loading: {loading ? 'true' : 'false'}</div>
      <div>Authenticated: {isAuthenticated ? 'true' : 'false'}</div>
      <div>User: {user ? user.name : 'null'}</div>
      <div>Token: {localStorage.getItem('token') ? 'exists' : 'null'}</div>
    </div>
  );
};

export default AuthDebug;

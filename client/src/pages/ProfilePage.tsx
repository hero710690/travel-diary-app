import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const ProfilePage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
        </div>
        
        <div className="p-6">
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              {user?.avatar ? (
                <img className="h-16 w-16 rounded-full" src={user.avatar} alt={user.name || user.nickname} />
              ) : (
                <div className="h-16 w-16 rounded-full bg-blue-500 flex items-center justify-center">
                  <span className="text-xl font-medium text-white">
                    {(user?.name || user?.nickname)?.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <h2 className="text-xl font-medium text-gray-900">{user?.name || user?.nickname}</h2>
                <p className="text-gray-600">{user?.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 text-left">Name</label>
                <p className="mt-1 text-sm text-gray-900">{user?.name || user?.nickname}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 text-left">Email</label>
                <p className="mt-1 text-sm text-gray-900">{user?.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 text-left">Member Since</label>
                <p className="mt-1 text-sm text-gray-900">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-200">
              <p className="text-gray-600">
                Profile editing functionality will be implemented in the full version.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;

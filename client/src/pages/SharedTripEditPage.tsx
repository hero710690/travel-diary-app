import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { sharingService } from '../services/sharing';
import LoadingSpinner from '../components/LoadingSpinner';
import TripPlanningPage from './TripPlanningPage';
import { 
  LockClosedIcon,
  ShareIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const SharedTripEditPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState(searchParams.get('password') || '');
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const { data: sharedTripData, isLoading, error, refetch } = useQuery(
    ['sharedTripWithPermissions', token, password],
    () => sharingService.getSharedTripWithPermissions(token!, password || undefined),
    {
      enabled: !!token,
      retry: false,
      onError: (error: any) => {
        if (error.message?.includes('Password required')) {
          setShowPasswordForm(true);
        }
      }
    }
  );

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      refetch();
    }
  };

  // Redirect to view-only if editing is not allowed
  useEffect(() => {
    if (sharedTripData && !sharedTripData.permissions.can_edit) {
      navigate(`/shared/${token}${password ? `?password=${encodeURIComponent(password)}` : ''}`, {
        replace: true
      });
    }
  }, [sharedTripData, navigate, token, password]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading shared trip...</p>
        </div>
      </div>
    );
  }

  if (showPasswordForm || (error && error.message?.includes('Password required'))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white shadow-lg rounded-lg p-8">
            <div className="text-center mb-6">
              <LockClosedIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Password Required</h1>
              <p className="text-gray-600">
                This shared trip is password protected. Please enter the password to continue editing.
              </p>
            </div>
            
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
              >
                Access Trip Editor
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (error || !sharedTripData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <ShareIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Trip Not Found</h1>
          <p className="text-gray-600 mb-2">
            The shared trip link is invalid, has expired, or the password is incorrect.
          </p>
          <p className="text-sm text-gray-500">
            Please check the link or contact the trip organizer.
          </p>
        </div>
      </div>
    );
  }

  // Check if user has edit permissions
  if (!sharedTripData.permissions.can_edit) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-4">
          <ExclamationTriangleIcon className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Edit Access Denied</h1>
          <p className="text-gray-600 mb-4">
            This shared trip link only allows viewing. You don't have permission to edit this trip.
          </p>
          <button
            onClick={() => navigate(`/shared/${token}${password ? `?password=${encodeURIComponent(password)}` : ''}`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
          >
            View Trip Instead
          </button>
        </div>
      </div>
    );
  }

  // Render the trip planning page with shared trip data
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Shared Trip Header */}
      <div className="bg-blue-50 border-b border-blue-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShareIcon className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">
                Editing Shared Trip
              </span>
            </div>
            <div className="text-sm text-blue-600">
              Changes will be visible to all collaborators
            </div>
          </div>
        </div>
      </div>

      {/* Trip Planning Page */}
      <TripPlanningPage 
        sharedTripData={sharedTripData.trip}
        isSharedMode={true}
        shareToken={token}
      />
    </div>
  );
};

export default SharedTripEditPage;

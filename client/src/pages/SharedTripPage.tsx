import React, { useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { collaborationService } from '../services/collaboration';
import { sharingService } from '../services/sharing';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  MapPinIcon, 
  CalendarIcon, 
  ClockIcon,
  LockClosedIcon,
  EyeIcon,
  ShareIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';

const SharedTripPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState(searchParams.get('password') || '');
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const { data: tripData, isLoading, error, refetch } = useQuery(
    ['sharedTrip', token, password],
    () => collaborationService.getSharedTrip(token!, password || undefined),
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

  // Check if editing is allowed
  const { data: permissionsData } = useQuery(
    ['sharedTripPermissions', token, password],
    () => sharingService.getSharedTripWithPermissions(token!, password || undefined),
    {
      enabled: !!token && !!tripData,
      retry: false,
      onError: () => {
        // Ignore errors for permissions check
      }
    }
  );

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      refetch();
    }
  };

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
                This shared trip is password protected. Please enter the password to continue.
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
                Access Trip
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (error || !tripData) {
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

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  const getDuration = () => {
    try {
      const start = new Date(tripData.start_date);
      const end = new Date(tripData.end_date);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      return days;
    } catch {
      return tripData.duration || 1;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center text-sm text-gray-500 mb-2">
                <EyeIcon className="h-4 w-4 mr-1" />
                Shared Trip View
              </div>
              <h1 className="text-3xl font-bold text-gray-900 text-left">{tripData.title}</h1>
            </div>
            <div className="flex items-center space-x-3">
              {permissionsData?.permissions?.can_edit && (
                <button
                  onClick={() => navigate(`/shared/${token}/edit${password ? `?password=${encodeURIComponent(password)}` : ''}`)}
                  className="inline-flex items-center px-4 py-2 border border-blue-300 shadow-sm text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PencilIcon className="h-4 w-4 mr-2" />
                  Edit Trip
                </button>
              )}
              <div className="text-right">
                <div className="text-sm text-gray-500">
                  {tripData.share_settings?.is_public ? 'Public' : 'Private'} Share
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Trip Overview */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 text-left">Trip Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-start">
                <MapPinIcon className="h-5 w-5 text-gray-400 mt-1 mr-3" />
                <div>
                  <h3 className="font-medium text-gray-900 text-left">Destination</h3>
                  <p className="text-gray-600 text-left">{tripData.destination}</p>
                </div>
              </div>
              <div className="flex items-start">
                <CalendarIcon className="h-5 w-5 text-gray-400 mt-1 mr-3" />
                <div>
                  <h3 className="font-medium text-gray-900 text-left">Dates</h3>
                  <p className="text-gray-600 text-left">
                    {formatDate(tripData.start_date)} - {formatDate(tripData.end_date)}
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <ClockIcon className="h-5 w-5 text-gray-400 mt-1 mr-3" />
                <div>
                  <h3 className="font-medium text-gray-900 text-left">Duration</h3>
                  <p className="text-gray-600 text-left">{getDuration()} days</p>
                </div>
              </div>
            </div>
            
            {tripData.description && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="font-medium text-gray-900 mb-2 text-left">Description</h3>
                <p className="text-gray-600 text-left">{tripData.description}</p>
              </div>
            )}
          </div>

          {/* Itinerary */}
          {tripData.itinerary && tripData.itinerary.length > 0 && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 text-left">Itinerary</h2>
              <div className="space-y-4">
                {tripData.itinerary.map((item: any, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-3">
                            Day {item.day}
                          </span>
                          {item.time && (
                            <span className="text-sm text-gray-500">{item.time}</span>
                          )}
                        </div>
                        <h3 className="font-medium text-gray-900 text-left">{item.title}</h3>
                        {item.description && (
                          <p className="text-gray-600 mt-1 text-left">{item.description}</p>
                        )}
                        {item.location?.name && (
                          <div className="flex items-center mt-2 text-sm text-gray-500">
                            <MapPinIcon className="h-4 w-4 mr-1" />
                            <span className="text-left">{item.location.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Wishlist */}
          {tripData.wishlist && tripData.wishlist.length > 0 && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 text-left">Wishlist</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tripData.wishlist.map((item: any, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 text-left">{item.name}</h3>
                    {item.description && (
                      <p className="text-gray-600 text-sm mt-1 text-left">{item.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <p className="text-blue-800 font-medium mb-2">
              🌍 This trip was shared using Travel Diary
            </p>
            <p className="text-blue-600 text-sm">
              This is a read-only view. To create and share your own trips, visit{' '}
              <a 
                href="https://d16hcqzmptnoh8.cloudfront.net" 
                className="font-medium hover:text-blue-700"
                target="_blank"
                rel="noopener noreferrer"
              >
                Travel Diary
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SharedTripPage;

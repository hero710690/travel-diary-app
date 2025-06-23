import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { tripsAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const SharedTripPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  const { data: tripData, isLoading, error } = useQuery(
    ['sharedTrip', token],
    () => tripsAPI.getSharedTrip(token!),
    {
      enabled: !!token,
      select: (response) => response.data.trip,
    }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !tripData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Trip Not Found</h1>
          <p className="text-gray-600">The shared trip link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">{tripData.title}</h1>
            <p className="text-gray-600">Shared by {tripData.owner.name}</p>
          </div>
          
          <div className="p-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-2">Trip Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h3 className="font-medium text-gray-900">Destination</h3>
                    <p className="text-gray-600">{tripData.destination}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Duration</h3>
                    <p className="text-gray-600">{tripData.duration} days</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Status</h3>
                    <p className="text-gray-600 capitalize">{tripData.status}</p>
                  </div>
                </div>
              </div>

              {tripData.description && (
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-2">Description</h2>
                  <p className="text-gray-600">{tripData.description}</p>
                </div>
              )}

              <div className="pt-6 border-t border-gray-200">
                <p className="text-gray-600">
                  This is a read-only view of the shared trip. Full trip details and 
                  interactive features are available to trip members.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SharedTripPage;

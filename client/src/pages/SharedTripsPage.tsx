import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { tripsService } from '../services/trips';
import { 
  UserGroupIcon,
  MapPinIcon,
  CalendarIcon,
  EyeIcon,
  PencilIcon,
  UserPlusIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/LoadingSpinner';
import { format } from 'date-fns';

interface SharedTrip {
  id: string;
  title: string;
  description?: string;
  destination: string;
  start_date: string;
  end_date: string;
  owner: {
    name: string;
    email: string;
  };
  collaboration: {
    role: 'viewer' | 'editor' | 'admin';
    invited_at: string;
    accepted_at?: string;
    status: 'pending' | 'accepted' | 'declined';
  };
  itinerary_count?: number;
  collaborators_count?: number;
}

const SharedTripsPage: React.FC = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted'>('all');

  // Fetch shared trips
  const { data: sharedTrips, isLoading, error } = useQuery<SharedTrip[]>(
    ['shared-trips'],
    async () => {
      const response = await fetch('https://aprb1rgwqf.execute-api.ap-northeast-1.amazonaws.com/prod/api/v1/trips/shared', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch shared trips');
      return response.json();
    },
    {
      retry: 1,
      refetchOnWindowFocus: false,
    }
  );

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <UserPlusIcon className="h-4 w-4 text-purple-600" />;
      case 'editor':
        return <PencilIcon className="h-4 w-4 text-blue-600" />;
      case 'viewer':
        return <EyeIcon className="h-4 w-4 text-green-600" />;
      default:
        return <UserGroupIcon className="h-4 w-4 text-gray-600" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'editor':
        return 'bg-blue-100 text-blue-800';
      case 'viewer':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'declined':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  const filteredTrips = sharedTrips?.filter(trip => {
    if (filter === 'all') return true;
    return trip.collaboration.status === filter;
  }) || [];

  const handleTripClick = (trip: SharedTrip) => {
    if (trip.collaboration.status === 'accepted') {
      // Navigate to the trip detail page
      navigate(`/trips/${trip.id}`);
    } else if (trip.collaboration.status === 'pending') {
      // Show invitation acceptance flow
      navigate(`/invite/accept?token=${trip.collaboration.role}`); // This would need the actual token
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Unable to Load Shared Trips</h2>
          <p className="text-gray-600 mb-4">There was an error loading your shared trips.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <UserGroupIcon className="h-8 w-8 mr-3 text-blue-600" />
                Shared Trips
              </h1>
              <p className="text-gray-600 mt-2">
                Trips you've been invited to collaborate on
              </p>
            </div>
            
            {/* Filter Tabs */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
              {[
                { key: 'all', label: 'All', count: sharedTrips?.length || 0 },
                { key: 'pending', label: 'Pending', count: sharedTrips?.filter(t => t.collaboration.status === 'pending').length || 0 },
                { key: 'accepted', label: 'Active', count: sharedTrips?.filter(t => t.collaboration.status === 'accepted').length || 0 }
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key as any)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    filter === key
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {label} ({count})
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Trips Grid */}
        {filteredTrips.length === 0 ? (
          <div className="text-center py-12">
            <UserGroupIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter === 'all' ? 'No Shared Trips' : `No ${filter} Invitations`}
            </h3>
            <p className="text-gray-600 mb-6">
              {filter === 'all' 
                ? "You haven't been invited to any trips yet."
                : `You don't have any ${filter} trip invitations.`
              }
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTrips.map((trip) => (
              <div
                key={trip.id}
                onClick={() => handleTripClick(trip)}
                className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
              >
                {/* Status Banner */}
                <div className={`px-4 py-2 text-xs font-medium ${getStatusColor(trip.collaboration.status)}`}>
                  <div className="flex items-center justify-between">
                    <span className="capitalize">{trip.collaboration.status}</span>
                    <div className="flex items-center space-x-1">
                      {getRoleIcon(trip.collaboration.role)}
                      <span className="capitalize">{trip.collaboration.role}</span>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  {/* Trip Title */}
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                    {trip.title}
                  </h3>

                  {/* Trip Details */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPinIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className="truncate">{trip.destination}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <CalendarIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span>{formatDate(trip.start_date)} - {formatDate(trip.end_date)}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <UserGroupIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span>Organized by {trip.owner.name}</span>
                    </div>
                  </div>

                  {/* Trip Stats */}
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                    <span>{trip.itinerary_count || 0} activities</span>
                    <span>{trip.collaborators_count || 0} collaborators</span>
                  </div>

                  {/* Invitation Date */}
                  <div className="flex items-center text-xs text-gray-500">
                    <ClockIcon className="h-3 w-3 mr-1" />
                    <span>
                      {trip.collaboration.status === 'accepted' && trip.collaboration.accepted_at
                        ? `Joined ${formatDate(trip.collaboration.accepted_at)}`
                        : `Invited ${formatDate(trip.collaboration.invited_at)}`
                      }
                    </span>
                  </div>

                  {/* Description */}
                  {trip.description && (
                    <p className="text-sm text-gray-600 mt-3 line-clamp-2">
                      {trip.description}
                    </p>
                  )}
                </div>

                {/* Action Footer */}
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(trip.collaboration.role)}`}>
                      {getRoleIcon(trip.collaboration.role)}
                      <span className="ml-1 capitalize">{trip.collaboration.role}</span>
                    </span>
                    
                    {trip.collaboration.status === 'pending' ? (
                      <span className="text-xs text-blue-600 font-medium">
                        Click to respond →
                      </span>
                    ) : trip.collaboration.status === 'accepted' ? (
                      <span className="text-xs text-green-600 font-medium">
                        Click to view →
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">
                        Declined
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SharedTripsPage;
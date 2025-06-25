import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { tripsService, TripDisplay } from '../services/trips';
import { authService } from '../services/auth';
import {
  PlusIcon,
  MapPinIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  MapIcon,
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/LoadingSpinner';
import { format } from 'date-fns';
import { safeParseDate } from '../utils/dateUtils';
import toast from 'react-hot-toast';

const DashboardPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const queryClient = useQueryClient();

  const { data: tripsData, isLoading, error } = useQuery(
    ['trips', statusFilter],
    () => tripsService.getTrips(),
    {
      select: (data: any) => {
        console.log('🔍 React Query select - Input data:', data);
        // tripsService.getTrips() already returns the transformed array directly
        if (Array.isArray(data)) {
          console.log('✅ React Query select - Returning array:', data);
          return data;
        } else {
          console.log('❌ React Query select - Data is not array, returning empty:', data);
          return [];
        }
      },
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  const deleteTripMutation = useMutation(tripsService.deleteTrip, {
    onSuccess: () => {
      console.log('✅ Delete mutation successful');
      queryClient.invalidateQueries('trips');
      toast.success('Trip deleted successfully!');
    },
    onError: (error: any) => {
      console.log('❌ Delete mutation error:', error);
      const message = error.response?.data?.message || 'Failed to delete trip';
      toast.error(message);
    },
  });

  const handleDeleteTrip = (tripId: string, tripTitle: string) => {
    console.log('🗑️ Delete button clicked:', { tripId, tripTitle });
    
    // Debug current authentication state
    const token = localStorage.getItem('authToken');
    console.log('🔑 Current auth token exists:', !!token);
    console.log('🔑 Token length:', token?.length || 0);
    
    if (window.confirm(`Are you sure you want to delete "${tripTitle}"? This action cannot be undone.`)) {
      console.log('🗑️ User confirmed deletion, calling mutation...');
      deleteTripMutation.mutate(tripId);
    } else {
      console.log('🗑️ User cancelled deletion');
    }
  };

  // Helper function to safely parse and format dates
  const formatTripDate = (dateString: string, formatStr: string) => {
    try {
      const date = safeParseDate(dateString);
      return format(date, formatStr);
    } catch (error) {
      console.error('Date formatting error:', error, 'for date:', dateString);
      return dateString; // Return original string if formatting fails
    }
  };

  // Handle loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">Failed to load trips. Please try again.</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Reload Page
        </button>
      </div>
    );
  }

  // Ensure trips is always a valid array
  const trips = Array.isArray(tripsData) ? tripsData : [];
  
  // Filter trips based on selected status
  const filteredTrips = trips.filter((trip: TripDisplay) => {
    if (statusFilter === 'all') {
      return true;
    }
    // Map frontend filter names to backend status values
    const statusMapping = {
      'planning': 'planned',  // Frontend tab "planning" maps to backend status "planned"
      'ongoing': 'ongoing',
      'completed': 'completed'
    };
    
    const backendStatus = statusMapping[statusFilter as keyof typeof statusMapping] || statusFilter;
    return trip.status === backendStatus;
  });

  // Calculate counts for each status using correct backend values
  const tripCounts = {
    all: trips.length,
    planning: trips.filter(trip => trip.status === 'planned').length,  // Backend uses 'planned'
    ongoing: trips.filter(trip => trip.status === 'ongoing').length,
    completed: trips.filter(trip => trip.status === 'completed').length,
  };
  
  // Debug logging
  console.log('🏠 DashboardPage - Raw tripsData:', tripsData);
  console.log('🏠 DashboardPage - Processed trips array:', trips);
  console.log('🏠 DashboardPage - Trips count:', trips.length);
  console.log('🏠 DashboardPage - Status filter:', statusFilter);
  console.log('🏠 DashboardPage - Filtered trips:', filteredTrips);
  console.log('🏠 DashboardPage - Filtered trips count:', filteredTrips.length);
  
  // Debug trip statuses
  trips.forEach((trip, index) => {
    console.log(`🏠 Trip ${index + 1}: "${trip.name}" - Status: "${trip.status}" (type: ${typeof trip.status})`);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="text-left">
          <h1 className="text-2xl font-bold text-gray-900 text-left">My Trips</h1>
          <p className="text-gray-600 text-left">Plan, track, and remember your adventures</p>
        </div>
        <Link
          to="/trips/new"
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Create New Trip
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'all', label: 'All Trips' },
            { key: 'planning', label: 'Planning' },
            { key: 'ongoing', label: 'Ongoing' },
            { key: 'completed', label: 'Completed' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                statusFilter === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label} ({tripCounts[tab.key as keyof typeof tripCounts]})
            </button>
          ))}
        </nav>
      </div>

      {/* Trips Grid */}
      {filteredTrips.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <MapIcon className="h-12 w-12" />
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {statusFilter === 'all' ? 'No trips yet' : `No ${statusFilter} trips`}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {statusFilter === 'all' 
              ? 'Get started by creating your first trip.'
              : `You don't have any ${statusFilter} trips yet.`
            }
          </p>
          {statusFilter === 'all' && (
            <div className="mt-6">
              <Link
                to="/trips/new"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Create New Trip
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTrips.map((trip: TripDisplay) => (
            <div
              key={trip.id}
              className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <MapPinIcon className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-500 text-left">{trip.destination}</span>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    trip.status === 'completed' ? 'bg-green-100 text-green-800' :
                    trip.status === 'ongoing' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {trip.status}
                  </span>
                </div>
                
                <h3 className="text-lg font-medium text-gray-900 mb-2 text-left">
                  {trip.name}
                </h3>
                
                <p className="text-sm text-gray-600 mb-4 line-clamp-2 text-left">
                  {trip.description || 'No description'}
                </p>
                
                <div className="flex items-center text-sm text-gray-500 mb-4">
                  <CalendarIcon className="h-4 w-4 mr-1" />
                  <span className="text-left">
                    {formatTripDate(trip.startDate, 'MMM d')} - {formatTripDate(trip.endDate, 'MMM d, yyyy')}
                  </span>
                </div>
                
                <div className="flex items-center text-sm text-gray-500 mb-4">
                  <CurrencyDollarIcon className="h-4 w-4 mr-1" />
                  <span className="text-left">
                    {(trip.totalBudget && trip.totalBudget > 0) ? `${trip.totalBudget} ${trip.currency}` : 'No budget set'}
                  </span>
                </div>
              </div>
              
              <div className="bg-gray-50 px-6 py-3">
                <div className="flex flex-wrap gap-2 justify-between items-center">
                  <div className="flex flex-wrap gap-2">
                    <Link
                      to={`/trips/${trip.id}`}
                      className="inline-flex items-center h-8 px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 text-gray-700 hover:bg-gray-100 active:bg-gray-200 rounded-md"
                    >
                      <EyeIcon className="h-4 w-4 mr-1" />
                      View
                    </Link>
                    <Link
                      to={`/trips/${trip.id}/plan`}
                      className="inline-flex items-center h-8 px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 text-gray-700 hover:bg-gray-100 active:bg-gray-200 rounded-md"
                    >
                      <MapIcon className="h-4 w-4 mr-1" />
                      Plan
                    </Link>
                    <Link
                      to={`/trips/${trip.id}/edit`}
                      className="inline-flex items-center h-8 px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 text-gray-700 hover:bg-gray-100 active:bg-gray-200 rounded-md"
                    >
                      <PencilIcon className="h-4 w-4 mr-1" />
                      Edit
                    </Link>
                  </div>
                  <button
                    onClick={() => handleDeleteTrip(trip.id, trip.name)}
                    disabled={deleteTripMutation.isLoading}
                    className="inline-flex items-center h-8 px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 text-red-600 hover:text-red-700 hover:bg-red-50 active:bg-red-100 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <TrashIcon className="h-4 w-4 mr-1" />
                    {deleteTripMutation.isLoading ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardPage;

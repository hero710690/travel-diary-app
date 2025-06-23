import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { tripsAPI } from '../services/api';
import { 
  PencilIcon, 
  TrashIcon, 
  MapIcon, 
  CalendarIcon,
  ClockIcon,
  PaperAirplaneIcon,
  MapPinIcon,
  ArrowPathIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { format, addDays } from 'date-fns';

interface ItineraryItem {
  id: string;
  day: number;
  time: string;
  title: string;
  description: string;
  duration?: number;
  type: 'activity' | 'flight';
  flightInfo?: any;
  location?: {
    name: string;
    address: string;
    coordinates?: any;
  };
  notes?: string;
}

const TripDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'itinerary'>('overview');
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    time: '',
    duration: 0,
    notes: ''
  });

  const { data: tripResponse, isLoading, error, refetch } = useQuery(
    ['trip', id],
    () => tripsAPI.getTripById(id!),
    {
      enabled: !!id,
      // Disable caching to ensure fresh data
      cacheTime: 0,
      staleTime: 0,
    }
  );

  // Extract trip data from response
  const tripData = tripResponse?.data?.trip;

  const deleteTripMutation = useMutation(tripsAPI.deleteTrip, {
    onSuccess: () => {
      queryClient.invalidateQueries('trips');
      toast.success('Trip deleted successfully!');
      navigate('/dashboard');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to delete trip';
      toast.error(message);
    },
  });

  // Update itinerary mutation
  const updateItineraryMutation = useMutation(
    (updatedItinerary: any[]) => tripsAPI.updateItinerary(id!, updatedItinerary),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['trip', id]);
        toast.success('Activity updated successfully!');
        setEditingItem(null);
      },
      onError: (error: any) => {
        const message = error.response?.data?.message || 'Failed to update activity';
        toast.error(message);
      },
    }
  );

  const handleDeleteTrip = () => {
    if (window.confirm(`Are you sure you want to delete "${tripData?.title}"? This action cannot be undone.`)) {
      deleteTripMutation.mutate(id!);
    }
  };

  const handleEditActivity = (item: ItineraryItem) => {
    setEditingItem(item.id);
    setEditForm({
      time: item.time,
      duration: item.duration || 60,
      notes: item.notes || ''
    });
  };

  const handleSaveEdit = (item: ItineraryItem) => {
    if (!tripData?.itinerary) return;

    // Find the original item in the backend data
    const originalItemIndex = tripData.itinerary.findIndex((backendItem: any) => {
      return backendItem.place?.name === item.title || 
             backendItem.custom_title === item.title ||
             backendItem._id === item.id;
    });

    if (originalItemIndex === -1) {
      toast.error('Could not find item to update');
      return;
    }

    // Create updated itinerary with backend field names (using any to avoid type conflicts)
    const updatedItinerary = [...tripData.itinerary];
    const originalItem = updatedItinerary[originalItemIndex] as any;
    
    updatedItinerary[originalItemIndex] = {
      ...originalItem,
      start_time: editForm.time,
      estimated_duration: editForm.duration,
      notes: editForm.notes
    } as any;

    updateItineraryMutation.mutate(updatedItinerary);
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditForm({ time: '', duration: 0, notes: '' });
  };

  // Transform backend itinerary to frontend format
  const getTransformedItinerary = (): ItineraryItem[] => {
    if (!tripData?.itinerary || tripData.itinerary.length === 0) {
      return [];
    }

    const transformedItems = tripData.itinerary.map((item: any, index: number) => {
      try {
        let dayNumber = 1; // Default to day 1 if no trip dates
        
        // Only calculate day number if we have valid trip dates
        if (tripData.startDate && tripData.endDate) {
          const tripStartDate = new Date(tripData.startDate);
          const itemDate = new Date(item.date);
          
          // Validate dates
          if (isNaN(tripStartDate.getTime()) || isNaN(itemDate.getTime())) {
            // Use a simple day assignment based on item order if dates are invalid
            dayNumber = Math.floor(index / 2) + 1; // Roughly 2 items per day
          } else {
            dayNumber = Math.floor((itemDate.getTime() - tripStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          }
        } else {
          // Fallback: assign items to days based on their dates or order
          if (item.date) {
            const itemDate = new Date(item.date);
            if (!isNaN(itemDate.getTime())) {
              // Use the item's date to determine relative day
              const firstItemDate = tripData.itinerary[0]?.date;
              if (firstItemDate) {
                const baseDate = new Date(firstItemDate);
                if (!isNaN(baseDate.getTime())) {
                  dayNumber = Math.floor((itemDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                }
              }
            }
          }
          if (dayNumber < 1) dayNumber = Math.floor(index / 2) + 1; // Final fallback
        }

        const isFlightItem = item.flightInfo || (item.place?.types && item.place.types.includes('flight'));

        const transformedItem = {
          id: item._id || `item_${index}`,
          day: Math.max(1, dayNumber),
          time: item.start_time || '09:00',
          title: item.custom_title || item.place?.name || 'Activity',
          description: item.custom_description || item.place?.address || '',
          location: {
            name: item.place?.name || '',
            address: item.place?.address || '',
            coordinates: item.place?.coordinates || undefined,
          },
          duration: item.estimated_duration || (isFlightItem ? 120 : 60),
          type: isFlightItem ? 'flight' as const : 'activity' as const,
          notes: item.notes || '',
          flightInfo: item.flightInfo || undefined,
        };
        
        return transformedItem;
      } catch (error) {
        console.error('Error processing itinerary item:', item, error);
        return null;
      }
    }).filter(item => item !== null) as ItineraryItem[];
    
    return transformedItems;
  };

  // Generate days for the trip
  const generateDays = () => {
    // If no trip dates, generate days based on itinerary items
    if (!tripData?.startDate || !tripData?.endDate) {
      if (!tripData?.itinerary || tripData.itinerary.length === 0) {
        return [];
      }
      
      // Find the date range from itinerary items
      const dates = tripData.itinerary
        .map((item: any) => new Date(item.date))
        .filter((date: Date) => !isNaN(date.getTime()))
        .sort((a: Date, b: Date) => a.getTime() - b.getTime());
      
      if (dates.length === 0) {
        return [{ dayNumber: 1, date: new Date() }]; // Fallback to single day
      }
      
      const startDate = dates[0];
      const endDate = dates[dates.length - 1];
      
      const days = [];
      let currentDate = new Date(startDate);
      let dayNumber = 1;
      
      while (currentDate <= endDate) {
        days.push({
          dayNumber,
          date: new Date(currentDate),
        });
        currentDate = addDays(currentDate, 1);
        dayNumber++;
      }
      
      return days;
    }
    
    try {
      const startDate = new Date(tripData.startDate);
      const endDate = new Date(tripData.endDate);
      
      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return [];
      }
      
      const days = [];
      let currentDate = new Date(startDate);
      let dayNumber = 1;
      
      while (currentDate <= endDate) {
        days.push({
          dayNumber,
          date: new Date(currentDate),
        });
        currentDate = addDays(currentDate, 1);
        dayNumber++;
      }
      
      return days;
    } catch (error) {
      console.error('Error generating days:', error);
      return [];
    }
  };

  const formatTime = (timeString: string) => {
    try {
      const time = new Date(`2000-01-01T${timeString}`);
      return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return timeString;
    }
  };

  const getPlaceIcon = (type: string) => {
    switch (type) {
      case 'flight':
        return <PaperAirplaneIcon className="h-5 w-5 text-blue-600" />;
      default:
        return <MapPinIcon className="h-5 w-5 text-green-600" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !tripData) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Failed to load trip details. Please try again.</p>
      </div>
    );
  }

  const itinerary = getTransformedItinerary();
  const days = generateDays();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{tripData.title}</h1>
            <p className="text-gray-600">{tripData.description}</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => refetch()}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              title="Refresh data"
            >
              <ArrowPathIcon className="h-4 w-4" />
            </button>
            <Link
              to={`/trips/${id}/plan`}
              className="inline-flex items-center px-4 py-2 border border-blue-300 shadow-sm text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <MapIcon className="h-4 w-4 mr-2" />
              Plan Trip
            </Link>
            <Link
              to={`/trips/${id}/edit`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PencilIcon className="h-4 w-4 mr-2" />
              Edit Trip
            </Link>
            <button
              onClick={handleDeleteTrip}
              disabled={deleteTripMutation.isLoading}
              className="inline-flex items-center px-4 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              {deleteTripMutation.isLoading ? 'Deleting...' : 'Delete Trip'}
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <h3 className="font-medium text-gray-900">Destination</h3>
            <p className="text-gray-600">{tripData.destination}</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Duration</h3>
            <p className="text-gray-600">{tripData.duration} days</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Dates</h3>
            <p className="text-gray-600">
              {(() => {
                try {
                  const startDate = new Date(tripData.startDate);
                  const endDate = new Date(tripData.endDate);
                  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                    return 'Invalid dates';
                  }
                  return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;
                } catch (error) {
                  console.error('Error formatting dates:', error);
                  return 'Date formatting error';
                }
              })()}
            </p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Status</h3>
            <p className="text-gray-600 capitalize">{tripData.status}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('itinerary')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === 'itinerary'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Itinerary ({itinerary.length})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Trip Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Budget</h4>
                    <p className="text-gray-600">
                      {tripData.totalBudget > 0 
                        ? `${tripData.currency} ${tripData.totalBudget.toLocaleString()}`
                        : 'Not set'
                      }
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Visibility</h4>
                    <p className="text-gray-600">
                      {tripData.isPublic ? 'Public' : 'Private'}
                    </p>
                  </div>
                  {tripData.tags && tripData.tags.length > 0 && (
                    <div className="md:col-span-2">
                      <h4 className="font-medium text-gray-900 mb-2">Tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {tripData.tags.map((tag: string, index: number) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Quick Stats</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <CalendarIcon className="h-8 w-8 text-blue-600" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-blue-900">Planned Activities</p>
                        <p className="text-2xl font-bold text-blue-600">{itinerary.length}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <PaperAirplaneIcon className="h-8 w-8 text-green-600" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-green-900">Flights</p>
                        <p className="text-2xl font-bold text-green-600">
                          {itinerary.filter(item => item.type === 'flight').length}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <MapPinIcon className="h-8 w-8 text-purple-600" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-purple-900">Places</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {itinerary.filter(item => item.type === 'activity').length}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'itinerary' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Planned Itinerary</h3>
                <Link
                  to={`/trips/${id}/plan`}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                >
                  <PencilIcon className="h-4 w-4 mr-2" />
                  Edit Itinerary
                </Link>
              </div>

              {itinerary.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No itinerary planned yet</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Start planning your trip by adding places and activities.
                  </p>
                  <div className="mt-6">
                    <Link
                      to={`/trips/${id}/plan`}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <MapIcon className="h-4 w-4 mr-2" />
                      Start Planning
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {days.map((day) => {
                    const dayItems = itinerary
                      .filter(item => item.day === day.dayNumber)
                      .sort((a, b) => {
                        // Use arrival time for flights, regular time for activities
                        const timeA = a.type === 'flight' && a.flightInfo?.arrival?.time 
                          ? a.flightInfo.arrival.time 
                          : a.time;
                        const timeB = b.type === 'flight' && b.flightInfo?.arrival?.time 
                          ? b.flightInfo.arrival.time 
                          : b.time;
                        return timeA.localeCompare(timeB);
                      });

                    return (
                      <div key={day.dayNumber} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="font-medium text-gray-900">
                              Day {day.dayNumber}
                            </h4>
                            <p className="text-sm text-gray-500">
                              {(() => {
                                try {
                                  return format(day.date, 'EEEE, MMMM d, yyyy');
                                } catch (error) {
                                  console.error('Error formatting day date:', day.date, error);
                                  return 'Date formatting error';
                                }
                              })()}
                            </p>
                          </div>
                          <div className="text-xs text-gray-400">
                            {dayItems.length} {dayItems.length === 1 ? 'activity' : 'activities'}
                          </div>
                        </div>

                        {dayItems.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <p className="text-sm">No activities planned for this day</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {dayItems.map((item) => (
                              <div key={item.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                                <div className="flex-shrink-0 mt-1">
                                  {getPlaceIcon(item.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  {editingItem === item.id ? (
                                    // Edit mode
                                    <div className="space-y-3">
                                      <div className="flex items-center space-x-2">
                                        <ClockIcon className="h-4 w-4 text-gray-400" />
                                        <input
                                          type="time"
                                          value={editForm.time}
                                          onChange={(e) => setEditForm({...editForm, time: e.target.value})}
                                          className="text-sm border border-gray-300 rounded px-2 py-1"
                                        />
                                        {item.type === 'flight' && item.flightInfo && (
                                          <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                                            Flight
                                          </span>
                                        )}
                                      </div>
                                      <h5 className="text-sm font-medium text-gray-900 break-words">
                                        {item.title}
                                      </h5>
                                      {item.description && (
                                        <p className="text-xs text-gray-500 break-words">
                                          {item.description}
                                        </p>
                                      )}
                                      <div className="flex items-center space-x-2">
                                        <span className="text-xs text-gray-400">Duration:</span>
                                        <input
                                          type="number"
                                          value={editForm.duration}
                                          onChange={(e) => setEditForm({...editForm, duration: parseInt(e.target.value) || 0})}
                                          className="text-xs border border-gray-300 rounded px-2 py-1 w-16"
                                          min="1"
                                        />
                                        <span className="text-xs text-gray-400">minutes</span>
                                      </div>
                                      <div>
                                        <label className="text-xs text-gray-400 block mb-1">Notes:</label>
                                        <textarea
                                          value={editForm.notes}
                                          onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                                          className="text-xs border border-gray-300 rounded px-2 py-1 w-full resize-none"
                                          rows={2}
                                          placeholder="Add notes or comments..."
                                        />
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <button
                                          onClick={() => handleSaveEdit(item)}
                                          disabled={updateItineraryMutation.isLoading}
                                          className="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 disabled:opacity-50"
                                        >
                                          <CheckIcon className="h-3 w-3 mr-1" />
                                          Save
                                        </button>
                                        <button
                                          onClick={handleCancelEdit}
                                          className="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-gray-700 bg-gray-100 hover:bg-gray-200"
                                        >
                                          <XMarkIcon className="h-3 w-3 mr-1" />
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    // View mode
                                    <div>
                                      <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center space-x-2">
                                          <ClockIcon className="h-4 w-4 text-gray-400" />
                                          <span className="text-sm font-medium text-gray-900">
                                            {formatTime(item.time)}
                                          </span>
                                          {item.type === 'flight' && item.flightInfo && (
                                            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                                              Flight
                                            </span>
                                          )}
                                        </div>
                                        <button
                                          onClick={() => handleEditActivity(item)}
                                          className="text-gray-400 hover:text-gray-600 p-1"
                                          title="Edit activity"
                                        >
                                          <PencilIcon className="h-3 w-3" />
                                        </button>
                                      </div>
                                      <h5 className="text-sm font-medium text-gray-900 break-words">
                                        {item.title}
                                      </h5>
                                      {item.description && (
                                        <p className="text-xs text-gray-500 break-words mt-1">
                                          {item.description}
                                        </p>
                                      )}
                                      {item.duration && (
                                        <p className="text-xs text-gray-400 mt-1">
                                          Duration: {item.duration} minutes
                                        </p>
                                      )}
                                      {item.notes && (
                                        <p className="text-xs text-gray-600 mt-1 italic">
                                          Note: {item.notes}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TripDetailPage;

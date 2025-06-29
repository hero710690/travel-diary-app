import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { tripsService } from '../services/trips';
import { collaborationService } from '../services/collaboration';
import { safeParseDate, getDaysDifferenceIgnoreTime } from '../utils/dateUtils';
// FlightForm import removed - flight editing disabled in planned itinerary
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
  XMarkIcon,
  UserPlusIcon,
  ShareIcon,
  LinkIcon,
  StarIcon,
  UsersIcon,
  HeartIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import LoadingSpinner from '../components/LoadingSpinner';
import ShareModal from '../components/ShareModal';
import InviteCollaboratorModal from '../components/InviteCollaboratorModal';
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
  userRating?: number; // User's experience rating (1-5 stars)
  place?: {
    name: string;
    rating?: number;
    user_ratings_total?: number;
    types?: string[];
    formatted_address?: string;
  }; // Google place data
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

  // Rating state
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [ratingItemId, setRatingItemId] = useState<string | null>(null);

  // Flight Edit State - REMOVED (flight editing disabled in planned itinerary)
  // const [showFlightEditModal, setShowFlightEditModal] = useState(false);
  // const [editingFlight, setEditingFlight] = useState<any>(null);

  // Collaboration & Sharing State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'viewer' | 'editor'>('viewer');
  const [shareLink, setShareLink] = useState('');
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [collaborators, setCollaborators] = useState<Array<{
    id: string;
    email: string;
    name: string;
    role: 'owner' | 'editor' | 'viewer';
    status: 'pending' | 'accepted';
    joinedAt?: string;
  }>>([]);

  const { data: tripResponse, isLoading, error, refetch } = useQuery(
    ['trip', id],
    () => tripsService.getTrip(id!),
    {
      enabled: !!id,
      // Disable caching to ensure fresh data
      cacheTime: 0,
      staleTime: 0,
    }
  );

  // Extract trip data from response
  const tripData = tripResponse;

  const deleteTripMutation = useMutation(tripsService.deleteTrip, {
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
    (updatedItinerary: any[]) => tripsService.updateItinerary(id!, updatedItinerary),
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

  // Flight Edit Functions - REMOVED (flight editing disabled in planned itinerary)
  // Flight editing is now only available in the trip planning page

  const handleDeleteTrip = () => {
    if (window.confirm(`Are you sure you want to delete "${tripData?.name}"? This action cannot be undone.`)) {
      deleteTripMutation.mutate(id!);
    }
  };

  // Collaboration & Sharing Functions
  const handleInviteUser = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    try {
      // TODO: Replace with actual API call when backend is ready
      console.log('Inviting user:', { email: inviteEmail, role: inviteRole, tripId: id });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Add to collaborators list (mock data)
      const newCollaborator = {
        id: Date.now().toString(),
        email: inviteEmail,
        name: inviteEmail.split('@')[0],
        role: inviteRole,
        status: 'pending' as const,
      };
      
      setCollaborators(prev => [...prev, newCollaborator]);
      setInviteEmail('');
      setShowInviteModal(false);
      toast.success(`Invitation sent to ${inviteEmail}`);
    } catch (error) {
      toast.error('Failed to send invitation');
    }
  };

  const handleGenerateShareLink = async () => {
    setIsGeneratingLink(true);
    try {
      console.log('Generating share link for trip:', id);
      
      // Use real collaboration service to create share link
      const response = await collaborationService.createShareLink(id!, {
        is_public: true,
        allow_comments: false,
        password_protected: false,
        expires_in_days: 30
      });
      
      setShareLink(response.share_link.url);
      toast.success('Share link generated!');
      
      if (response.email_sent) {
        toast.success('Share link sent to your email!');
      }
    } catch (error: any) {
      console.error('Failed to generate share link:', error);
      toast.error(error.message || 'Failed to generate share link');
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleCopyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      toast.success('Link copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleRemoveCollaborator = async (collaboratorId: string) => {
    try {
      // TODO: Replace with actual API call when backend is ready
      console.log('Removing collaborator:', collaboratorId);
      
      setCollaborators(prev => prev.filter(c => c.id !== collaboratorId));
      toast.success('Collaborator removed');
    } catch (error) {
      toast.error('Failed to remove collaborator');
    }
  };

  const handleEditActivity = (item: ItineraryItem) => {
    // Only allow editing for non-flight activities
    if (item.type === 'flight' && item.flightInfo) {
      // Flight editing is disabled in planned itinerary tab
      toast('Flight editing is not available in this view. Please use the trip planning page to modify flights.', {
        duration: 4000,
        icon: 'ℹ️'
      });
      return;
    }
    
    // For other activities, use the regular edit form
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
    const originalItemIndex = tripData.itinerary?.findIndex((backendItem: any) => {
      return backendItem.place?.name === item.title || 
             backendItem.custom_title === item.title ||
             backendItem._id === item.id;
    });

    if (originalItemIndex === -1) {
      toast.error('Could not find item to update');
      return;
    }

    // Create updated itinerary with backend field names (using any to avoid type conflicts)
    const updatedItinerary = [...(tripData.itinerary || [])];
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

  const handleRatingClick = (itemId: string, rating: number) => {
    if (!tripData?.itinerary) return;

    // Find the original item in the backend data
    const originalItemIndex = tripData.itinerary?.findIndex((backendItem: any) => {
      return backendItem._id === itemId || backendItem.id === itemId;
    });

    if (originalItemIndex === -1) {
      toast.error('Could not find item to update');
      return;
    }

    // Create updated itinerary with rating
    const updatedItinerary = [...(tripData.itinerary || [])];
    const originalItem = updatedItinerary[originalItemIndex] as any;
    
    updatedItinerary[originalItemIndex] = {
      ...originalItem,
      userRating: rating
    } as any;

    updateItineraryMutation.mutate(updatedItinerary);
    setRatingItemId(null);
    setHoveredStar(null);
  };

  const renderRatingStars = (item: ItineraryItem) => {
    const hearts = [];
    const isRatingThisItem = ratingItemId === item.id;
    
    for (let i = 1; i <= 5; i++) {
      const isFilled = i <= (isRatingThisItem && hoveredStar ? hoveredStar : item.userRating || 0);
      hearts.push(
        <button
          key={i}
          onClick={(e) => {
            e.stopPropagation();
            handleRatingClick(item.id, i);
          }}
          onMouseEnter={() => {
            setRatingItemId(item.id);
            setHoveredStar(i);
          }}
          onMouseLeave={() => {
            if (!item.userRating) {
              setHoveredStar(null);
            }
          }}
          className="p-0.5 hover:scale-110 transition-transform"
          title={`Wish level ${i} heart${i > 1 ? 's' : ''}`}
        >
          {isFilled ? (
            <HeartIconSolid className="h-3 w-3 text-red-500" />
          ) : (
            <HeartIcon className="h-3 w-3 text-gray-300 hover:text-red-400" />
          )}
        </button>
      );
    }
    return hearts;
  };

  // Transform backend itinerary to frontend format
  const getTransformedItinerary = (): ItineraryItem[] => {
    if (!tripData?.itinerary || tripData.itinerary.length === 0) {
      return [];
    }

    console.log('🔍 Raw itinerary data:', {
      tripId: id, // Use the ID from useParams instead
      tripStartDate: tripData.startDate,
      tripEndDate: tripData.endDate,
      totalItems: tripData.itinerary.length,
      itineraryItems: tripData.itinerary.map((item: any, index: number) => ({
        index,
        id: item._id,
        title: item.custom_title || item.place?.name,
        date: item.date,
        start_time: item.start_time,
        type: item.type
      }))
    });

    const transformedItems = (tripData.itinerary || []).map((item: any, index: number) => {
      try {
        let dayNumber = 1; // Default to day 1 if no trip dates
        
        // Prioritize explicit day field, fallback to date calculation (same fix as TripPlanningPage)
        if (item.day && typeof item.day === 'number' && item.day > 0) {
          // Use explicit day field if available
          dayNumber = item.day;
          console.log('📅 Using explicit day field:', dayNumber, 'for item:', item.custom_title || item.place?.name);
        } else if (tripData.startDate && item.date) {
          // Calculate day number based on item date and trip start date (fallback)
          const tripStartDate = new Date(tripData.startDate);
          const itemDate = new Date(item.date);
          
          // Validate dates
          if (!isNaN(tripStartDate.getTime()) && !isNaN(itemDate.getTime())) {
            // For flights, calculate the correct arrival date
            let effectiveDate = item.date;
            const isFlightItem = item.flightInfo && (item.flightInfo.departure || item.flightInfo.arrival);
            
            if (isFlightItem) {
              // Use arrival date from database if available (new format)
              if (item.flightInfo.arrival && item.flightInfo.arrival.date) {
                effectiveDate = item.flightInfo.arrival.date + 'T' + (item.flightInfo.arrival.time || '00:00') + ':00.000Z';
                console.log('🛩️ Using flight arrival date from database:', {
                  originalDate: item.date,
                  arrivalDate: effectiveDate,
                  flightInfo: item.flightInfo
                });
              } else {
                // Fallback: Calculate arrival date for old format flights
                const departureTime = item.flightInfo.departure?.time || '00:00';
                const arrivalTime = item.flightInfo.arrival?.time || item.start_time || '00:00';
                
                // Parse departure and arrival times
                const [depHour, depMin] = departureTime.split(':').map(Number);
                const [arrHour, arrMin] = arrivalTime.split(':').map(Number);
                
                // Create departure datetime
                const departureDate = new Date(item.date);
                departureDate.setHours(depHour, depMin, 0, 0);
                
                // Create arrival datetime (assume same day first, then adjust if needed)
                const arrivalDate = new Date(item.date);
                arrivalDate.setHours(arrHour, arrMin, 0, 0);
                
                // If arrival time is earlier than departure time, it's likely next day
                if (arrivalDate.getTime() < departureDate.getTime()) {
                  arrivalDate.setDate(arrivalDate.getDate() + 1);
                }
                
                // For international flights, there might be timezone differences
                // If we have duration info, we can be more precise
                if (item.flightInfo.duration) {
                  const durationMatch = item.flightInfo.duration.match(/(\d+)h?\s*(\d+)?m?/);
                  if (durationMatch) {
                    const hours = parseInt(durationMatch[1]) || 0;
                    const minutes = parseInt(durationMatch[2]) || 0;
                    const calculatedArrival = new Date(departureDate.getTime() + (hours * 60 + minutes) * 60 * 1000);
                    
                    // Use calculated arrival if it makes more sense
                    if (Math.abs(calculatedArrival.getTime() - arrivalDate.getTime()) < 24 * 60 * 60 * 1000) {
                      effectiveDate = calculatedArrival.toISOString();
                    } else {
                      effectiveDate = arrivalDate.toISOString();
                    }
                  } else {
                    effectiveDate = arrivalDate.toISOString();
                  }
                } else {
                  effectiveDate = arrivalDate.toISOString();
                }
                
                console.log('🛩️ Calculated flight arrival date (legacy format):', {
                  originalDate: item.date,
                  departureTime,
                  arrivalTime,
                  calculatedArrivalDate: effectiveDate,
                  flightInfo: item.flightInfo
                });
              }
            }
            
            // Use UTC-consistent date utilities to avoid timezone issues
            const tripStartDate = safeParseDate(tripData.startDate);
            const itemDate = safeParseDate(effectiveDate);
            
            // Calculate the difference in days using UTC-consistent function
            const daysDiff = getDaysDifferenceIgnoreTime(tripStartDate, itemDate);
            
            // Use date-based calculation for ALL items to ensure consistency
            dayNumber = Math.max(1, daysDiff + 1);
            
            console.log('📅 Day calculation (date-based for all items) - DETAILED DEBUG:', {
              itemId: item._id,
              itemTitle: item.custom_title || item.place?.name,
              itemType: item.type || 'activity',
              isFlightItem: !!isFlightItem,
              originalDate: item.date,
              effectiveDate,
              tripStartDate: tripStartDate.toISOString(),
              itemDate: itemDate.toISOString(),
              tripStartDateLocal: tripStartDate.toString(),
              itemDateLocal: itemDate.toString(),
              daysDiff,
              calculatedDay: dayNumber,
              index,
              method: 'date-based-for-all',
              // Additional debug info
              tripStartDateRaw: tripData.startDate,
              shouldBeDay1: daysDiff === 0,
              finalDayAssignment: dayNumber
            });
          } else {
            // If dates are invalid, use sequential assignment
            dayNumber = index + 1;
            console.warn('⚠️ Invalid dates, using sequential assignment:', {
              itemId: item._id,
              itemTitle: item.custom_title || item.place?.name,
              tripStartDate: tripData.startDate,
              itemDate: item.date,
              assignedDay: dayNumber,
              index
            });
          }
        } else {
          // If no dates available, use sequential assignment
          dayNumber = index + 1;
          console.warn('⚠️ Missing dates, using sequential assignment:', {
            itemId: item._id,
            itemTitle: item.custom_title || item.place?.name,
            hasTripStartDate: !!tripData.startDate,
            hasItemDate: !!item.date,
            assignedDay: dayNumber,
            index
          });
        }

        const isFlightItem = item.flightInfo || (item.place?.types && item.place.types.includes('flight'));

        const transformedItem = {
          id: item._id || `item_${index}`,
          day: dayNumber,
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
          userRating: item.userRating || undefined, // ✅ FIXED: Include user rating for hearts display
          flightInfo: item.flightInfo || undefined,
          place: item.place || undefined, // ✅ PRESERVE: Include full place data with rating and types
        };
        
        return transformedItem;
      } catch (error) {
        console.error('Error processing itinerary item:', item, error);
        return null;
      }
    }).filter(item => item !== null) as ItineraryItem[];
    
    // Smart deduplication: Remove true duplicates but allow multiple items on same day
    const deduplicatedItems = transformedItems.reduce((acc: ItineraryItem[], current: ItineraryItem) => {
      const isDuplicate = acc.some(item => 
        item.title === current.title && 
        item.day === current.day && 
        item.time === current.time &&
        item.type === current.type &&
        // For hotels, also check description to distinguish check-in vs check-out vs stay
        item.description === current.description
      );
      
      if (!isDuplicate) {
        acc.push(current);
      } else {
        console.warn('🚫 True duplicate detected and removed:', {
          title: current.title,
          day: current.day,
          time: current.time,
          type: current.type,
          description: current.description
        });
      }
      
      return acc;
    }, []);
    
    console.log('📊 Smart deduplication results:', {
      originalCount: transformedItems.length,
      deduplicatedCount: deduplicatedItems.length,
      removedDuplicates: transformedItems.length - deduplicatedItems.length,
      allowsMultipleItemsPerDay: true
    });
    
    return deduplicatedItems;
  };

  // Generate days for the trip
  const generateDays = () => {
    // If no trip dates, generate days based on itinerary items
    if (!tripData?.startDate || !tripData?.endDate) {
      if (!tripData?.itinerary || tripData.itinerary.length === 0) {
        return [];
      }
      
      // Find the date range from itinerary items using UTC-safe parsing
      const dates = (tripData.itinerary || [])
        .map((item: any) => safeParseDate(item.date))
        .filter((date: Date) => !isNaN(date.getTime()))
        .sort((a: Date, b: Date) => a.getTime() - b.getTime());
      
      if (dates.length === 0) {
        return [{ dayNumber: 1, date: new Date() }]; // Fallback to single day
      }
      
      console.log('📅 Generating days from itinerary items:', {
        itemCount: tripData.itinerary.length,
        validDates: dates.length,
        dateRange: dates.length > 0 ? {
          start: dates[0].toISOString(),
          end: dates[dates.length - 1].toISOString()
        } : null
      });
      
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
      const startDate = safeParseDate(tripData.startDate);
      const endDate = safeParseDate(tripData.endDate);
      
      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.warn('Invalid trip dates:', { startDate: tripData.startDate, endDate: tripData.endDate });
        return [];
      }
      
      console.log('📅 Generating days with UTC-safe parsing:', {
        startDateRaw: tripData.startDate,
        endDateRaw: tripData.endDate,
        startDateParsed: startDate.toISOString(),
        endDateParsed: endDate.toISOString()
      });
      
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

  // Consistent time formatting function (same as SharedTripPage and TripPlanningPage)
  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    
    try {
      // Handle different time formats
      if (timeString.includes(':')) {
        // Already in HH:MM format
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours, 10);
        const min = minutes.padStart(2, '0');
        
        // Convert to 12-hour format with AM/PM
        if (hour === 0) {
          return `12:${min} AM`;
        } else if (hour < 12) {
          return `${hour}:${min} AM`;
        } else if (hour === 12) {
          return `12:${min} PM`;
        } else {
          return `${hour - 12}:${min} PM`;
        }
      } else {
        // If it's just a number, treat as hour
        const hour = parseInt(timeString, 10);
        if (hour === 0) return '12:00 AM';
        if (hour < 12) return `${hour}:00 AM`;
        if (hour === 12) return '12:00 PM';
        return `${hour - 12}:00 PM`;
      }
    } catch {
      return timeString; // Return original if parsing fails
    }
  };

  // Get time from item with fallback
  const getItemTime = (item: any) => {
    return item.time || item.start_time || '';
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
          <div className="text-left">
            <h1 className="text-2xl font-bold text-gray-900 mb-2 text-left">{tripData.name}</h1>
            <p className="text-gray-600 text-left">{tripData.description}</p>
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
            <button
              onClick={() => setShowInviteModal(true)}
              className="inline-flex items-center px-4 py-2 border border-green-300 shadow-sm text-sm font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <UserPlusIcon className="h-4 w-4 mr-2" />
              Invite
            </button>
            <button
              onClick={() => setShowShareModal(true)}
              className="inline-flex items-center px-4 py-2 border border-purple-300 shadow-sm text-sm font-medium rounded-md text-purple-700 bg-purple-50 hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              <ShareIcon className="h-4 w-4 mr-2" />
              Share
            </button>
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
          <div className="text-left">
            <h3 className="font-medium text-gray-900 text-left">Destination</h3>
            <p className="text-gray-600 text-left">{tripData.destination}</p>
          </div>
          <div className="text-left">
            <h3 className="font-medium text-gray-900 text-left">Duration</h3>
            <p className="text-gray-600 text-left">
              {Math.ceil((new Date(tripData.endDate).getTime() - new Date(tripData.startDate).getTime()) / (1000 * 60 * 60 * 24))} days
            </p>
          </div>
          <div className="text-left">
            <h3 className="font-medium text-gray-900 text-left">Dates</h3>
            <p className="text-gray-600 text-left">
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
                <h3 className="text-lg font-medium text-gray-900 mb-3 text-left">Trip Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Budget and visibility sections removed as they're not in TripDisplay interface */}
                </div>
                
                {/* Tags section removed as it's not in TripDisplay interface */}
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3 text-left">Quick Stats</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <CalendarIcon className="h-8 w-8 text-blue-600" />
                      <div className="ml-3 text-left">
                        <p className="text-sm font-medium text-blue-900 text-left">Planned Activities</p>
                        <p className="text-2xl font-bold text-blue-600 text-left">{itinerary.length}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <PaperAirplaneIcon className="h-8 w-8 text-green-600" />
                      <div className="ml-3 text-left">
                        <p className="text-sm font-medium text-green-900 text-left">Flights</p>
                        <p className="text-2xl font-bold text-green-600 text-left">
                          {itinerary.filter(item => item.type === 'flight').length}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <MapPinIcon className="h-8 w-8 text-purple-600" />
                      <div className="ml-3 text-left">
                        <p className="text-sm font-medium text-purple-900 text-left">Places</p>
                        <p className="text-2xl font-bold text-purple-600 text-left">
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
                <h3 className="text-lg font-medium text-gray-900 text-left">Planned Itinerary</h3>
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
                          <div className="text-left">
                            <h4 className="font-medium text-gray-900 text-left">
                              Day {day.dayNumber}
                            </h4>
                            <p className="text-sm text-gray-500 text-left">
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
                                      <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                          <h5 className="text-sm font-medium text-gray-900 break-words text-left">
                                            {item.title}
                                          </h5>
                                        </div>
                                        <div className="flex items-center text-sm text-gray-500 flex-shrink-0 ml-4">
                                          <ClockIcon className="h-4 w-4 mr-1" />
                                          <span className="whitespace-nowrap">
                                            {formatTime(getItemTime(item))}
                                          </span>
                                        </div>
                                      </div>
                                      
                                      
                                      {/* Flight Details - Only for flight items */}
                                      {item.type === 'flight' && item.flightInfo && (
                                        <div className="mt-2 p-2 bg-blue-50 rounded border text-left">
                                          <div className="flex items-center justify-between text-sm">
                                            <div className="text-center">
                                              <div className="font-medium text-gray-900 text-center">
                                                {item.flightInfo.departure?.airportCode || 'DEP'}
                                              </div>
                                              <div className="text-xs text-gray-600 text-center">
                                                Dep: {item.flightInfo.departure?.time || item.time}
                                              </div>
                                            </div>
                                            <div className="flex items-center justify-center mx-2">
                                              <div className="h-px bg-gray-300 w-8"></div>
                                              <PaperAirplaneIcon className="h-4 w-4 text-gray-400 mx-2" />
                                              <div className="h-px bg-gray-300 w-8"></div>
                                            </div>
                                            <div className="text-center">
                                              <div className="font-medium text-gray-900 text-center">
                                                {item.flightInfo.arrival?.airportCode || 'ARR'}
                                              </div>
                                              <div className="text-xs text-gray-600 text-center">
                                                Arr: {item.flightInfo.arrival?.time || item.time}
                                              </div>
                                            </div>
                                          </div>
                                          <div className="flex items-center justify-center mt-2">
                                            {item.flightInfo.duration && (
                                              <div className="text-xs text-gray-600 text-center">
                                                {item.flightInfo.duration}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}

                                      {/* Hotel Info - Only for accommodation items */}
                                      {(() => {
                                        // Check if this is a hotel/accommodation item
                                        const isHotelItem = (item.type as any) === 'accommodation' || 
                                                           (item.place?.types && item.place.types.includes('lodging'));
                                        
                                        if (!isHotelItem) return null;
                                        
                                        // Create hotel info from available data
                                        const hotelAddress = item.description || item.place?.formatted_address || '';
                                        
                                        // Determine check-in/check-out status based on description
                                        const isCheckIn = item.description?.includes('Check-in') || false;
                                        const isCheckOut = item.description?.includes('Check-out') || false;
                                        
                                        // Get status badge
                                        const getStatusBadge = () => {
                                          if (isCheckIn) {
                                            return (
                                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 ml-2">
                                                Check-in
                                              </span>
                                            );
                                          } else if (isCheckOut) {
                                            return (
                                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 ml-2">
                                                Check-out
                                              </span>
                                            );
                                          } else {
                                            return (
                                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 ml-2">
                                                Stay
                                              </span>
                                            );
                                          }
                                        };
                                        
                                        return (
                                          <div className="mt-2 space-y-1">
                                            
                                            {/* Address with status badge */}
                                            {hotelAddress && (
                                              <div className="flex items-center">
                                                <span className="text-sm text-gray-600 text-left">{hotelAddress}</span>
                                                {getStatusBadge()}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })()}
                                      
                                      {/* Google Rating and Place Types - Only for non-flight items */}
                                      {item.place && item.type !== 'flight' && (
                                        <div className="mt-2 space-y-1">
                                          {/* Google Rating */}
                                          {item.place.rating && (
                                            <div className="flex items-center space-x-1">
                                              <StarIcon className="h-3 w-3 text-yellow-400 fill-current flex-shrink-0" />
                                              <span className="text-xs text-gray-600">
                                                {item.place.rating.toFixed(1)} Google
                                              </span>
                                              {item.place.user_ratings_total && item.place.user_ratings_total > 0 && (
                                                <span className="text-xs text-gray-400">
                                                  ({item.place.user_ratings_total.toLocaleString()} reviews)
                                                </span>
                                              )}
                                            </div>
                                          )}
                                          
                                          {/* Place Types */}
                                          {item.place.types && item.place.types.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                              {item.place.types.slice(0, 2).map((type) => (
                                                <span
                                                  key={type}
                                                  className="inline-block px-1.5 py-0.5 text-xs bg-blue-50 text-blue-600 rounded text-left"
                                                >
                                                  {type.replace(/_/g, ' ')}
                                                </span>
                                              ))}
                                              {item.place.types.length > 2 && (
                                                <span className="inline-block px-1.5 py-0.5 text-xs bg-gray-100 text-gray-500 rounded">
                                                  +{item.place.types.length - 2}
                                                </span>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                      
                                      {/* Duration - Only for activity items */}
                                      {item.duration && item.type === 'activity' && (
                                        <p className="text-xs text-gray-400 mt-1 text-left">
                                          Duration: {item.duration} minutes
                                        </p>
                                      )}
                                      
                                      {item.notes && (
                                        <p className="text-xs text-gray-600 mt-1 italic text-left">
                                          Note: {item.notes}
                                        </p>
                                      )}
                                      
                                      {/* User Wish Level - Only for non-flight items */}
                                      {item.type !== 'flight' && (
                                        <div className="mt-2">
                                          <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-500">Wish Level:</span>
                                            <div className="flex items-center space-x-0.5">
                                              {renderRatingStars(item)}
                                            </div>
                                          </div>
                                        </div>
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

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Invite Collaborator</h3>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'viewer' | 'editor')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="viewer">Viewer - Can view trip details</option>
                    <option value="editor">Editor - Can edit trip details</option>
                  </select>
                </div>

                {collaborators.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Current Collaborators</h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {collaborators.map((collaborator) => (
                        <div key={collaborator.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center space-x-2">
                            <UsersIcon className="h-4 w-4 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{collaborator.name}</p>
                              <p className="text-xs text-gray-500">{collaborator.email} • {collaborator.role}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              collaborator.status === 'accepted' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {collaborator.status}
                            </span>
                            {collaborator.role !== 'owner' && (
                              <button
                                onClick={() => handleRemoveCollaborator(collaborator.id)}
                                className="text-red-400 hover:text-red-600"
                              >
                                <XMarkIcon className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInviteUser}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Send Invitation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Collaboration Modals */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        tripId={id!}
        tripTitle={tripData?.name || 'Untitled Trip'}
      />
      
      <InviteCollaboratorModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        tripId={id!}
        tripTitle={tripData?.name || 'Untitled Trip'}
        onInviteSuccess={() => {
          // Refresh trip data to show new collaborators
          queryClient.invalidateQueries(['trip', id]);
        }}
      />

      {/* Flight Edit Modal - REMOVED (flight editing disabled in planned itinerary) */}
      {/* Flight editing is now only available in the trip planning page */}
    </div>
  );
};

export default TripDetailPage;

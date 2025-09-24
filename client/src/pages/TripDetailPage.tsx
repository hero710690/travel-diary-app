import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { tripsService } from '../services/trips';
import { photosService } from '../services/photos';
import { collaborationService } from '../services/collaboration';
import { safeParseDate, getDaysDifferenceIgnoreTime } from '../utils/dateUtils';
import { convertLinksToHyperlinks } from '../utils/linkUtils';
import FlightCard from '../components/FlightCard';
import BusCard from '../components/BusCard';
import PhotoGallery from '../components/PhotoGallery';
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
  HeartIcon,
  CameraIcon,
  HomeIcon,
  TruckIcon,
  BuildingStorefrontIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import LoadingSpinner from '../components/LoadingSpinner';
import ShareModal from '../components/ShareModal';
import InvitationModal from '../components/InvitationModal';
import toast from 'react-hot-toast';
import { format, addDays } from 'date-fns';

interface ItineraryItem {
  id: string;
  day: number;
  time: string;
  title: string;
  description: string;
  duration?: number;
  type: 'activity' | 'flight' | 'bus';
  flightInfo?: any;
  busInfo?: any;
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
  // Date formatting function for flight dates
  const formatFlightDate = (dateString: string) => {
    if (!dateString) return '';

    try {
      const date = new Date(dateString);
      // Format as "Mon, Jan 15" or similar
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString; // Return original if parsing fails
    }
  };

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

  // Rating state - REMOVED (hearts are now static display only)
  // const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  // const [ratingItemId, setRatingItemId] = useState<string | null>(null);

  // Flight Edit State - REMOVED (flight editing disabled in planned itinerary)
  // const [showFlightEditModal, setShowFlightEditModal] = useState(false);
  // const [editingFlight, setEditingFlight] = useState<any>(null);

  // Collaboration & Sharing State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
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

  // Timeline navigation state
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [showAllDays, setShowAllDays] = useState<boolean>(false);

  // Get visible days based on timeline selection
  const getVisibleDays = () => {
    if (showAllDays) {
      return days;
    }
    return days.filter(day => day.dayNumber === selectedDay);
  };

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

  // Fetch photos separately from new photos table
  const { data: allPhotos = [], refetch: refetchPhotos } = useQuery(
    ['photos', id],
    () => photosService.getPhotosForTrip(id!),
    { enabled: !!id }
  );

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

  // Day notes update function
  const handleUpdateDayNotes = async (day: number, notes: string) => {
    try {
      await tripsService.updateDayNotes(id!, day, notes);
      refetch(); // Refresh trip data
    } catch (error) {
      console.error('Failed to update day notes:', error);
    }
  };

  const handleDeleteTrip = () => {
    if (window.confirm(`Are you sure you want to delete "${tripData?.name}"? This action cannot be undone.`)) {
      deleteTripMutation.mutate(id!);
    }
  };

  // Collaboration & Sharing Functions
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

  // Rating functionality removed - hearts are now static display only
  // const handleRatingClick = (itemId: string, rating: number) => { ... }

  const renderRatingStars = (item: ItineraryItem) => {
    const hearts = [];

    for (let i = 1; i <= 5; i++) {
      const isFilled = i <= (item.userRating || 0);
      hearts.push(
        <div key={i} className="inline-block">
          {isFilled ? (
            <HeartIconSolid className="h-3 w-3 text-red-500" />
          ) : (
            <HeartIcon className="h-3 w-3 text-gray-300" />
          )}
        </div>
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
        const isBusItem = item.busInfo || (item.place?.types && item.place.types.includes('bus')) || item.type === 'bus';

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
          duration: item.estimated_duration || (isFlightItem ? 120 : isBusItem ? 120 : 60),
          type: isFlightItem ? 'flight' as const : isBusItem ? 'bus' as const : 'activity' as const,
          notes: item.notes || '',
          userRating: item.userRating || undefined, // ✅ FIXED: Include user rating for hearts display
          flightInfo: item.flightInfo || undefined,
          busInfo: item.busInfo || undefined,
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

  const getPlaceIcon = (type: string, item?: any) => {
    // Check if this is a hotel/accommodation item
    const isHotelItem = type === 'accommodation' ||
      (item?.place?.types && item.place.types.includes('lodging'));

    switch (type) {
      case 'flight':
        return <PaperAirplaneIcon className="h-5 w-5 text-blue-600" />;
      case 'bus':
        return <TruckIcon className="h-5 w-5 text-green-600" />;
      case 'accommodation':
        return <HomeIcon className="h-5 w-5 text-blue-600" />;
      default:
        // Check if it's a hotel based on place types
        if (isHotelItem) {
          return <HomeIcon className="h-5 w-5 text-blue-600" />;
        }

        // Check if it's a restaurant/bar/food place
        const placeTypes = item?.place?.types || [];
        const isRestaurantOrBar = placeTypes.some((type: string) =>
          ['restaurant', 'bar', 'cafe', 'bakery', 'meal_takeaway', 'meal_delivery', 'food'].includes(type)
        );
        if (isRestaurantOrBar) {
          return <BuildingStorefrontIcon className="h-5 w-5 text-orange-600" />;
        }

        return <CameraIcon className="h-5 w-5 text-green-600" />;
    }
  };

  // Helper function to determine hotel check-in/check-out status
  const getHotelStatus = (hotelItem: any, allItems: any[]) => {
    const hotelName = hotelItem.hotelInfo?.name || hotelItem.title || hotelItem.custom_title || hotelItem.place?.name;

    // Find all occurrences of this hotel in the itinerary
    const allHotelOccurrences = allItems.filter(item => {
      const itemHotelName = item.hotelInfo?.name || item.title || item.custom_title || item.place?.name;
      const isHotelItem = item.type === 'accommodation' || item.hotelInfo ||
        (item.place?.types && item.place.types.includes('lodging'));
      return itemHotelName === hotelName && isHotelItem;
    });

    // Sort by day and time to determine sequence
    const sortedOccurrences = allHotelOccurrences.sort((a, b) => {
      // First sort by day
      const dayA = a.calculatedDay || a.day || 1;
      const dayB = b.calculatedDay || b.day || 1;
      if (dayA !== dayB) {
        return dayA - dayB;
      }
      // Then sort by time
      const timeA = a.time || a.start_time || '00:00';
      const timeB = b.time || b.start_time || '00:00';
      return timeA.localeCompare(timeB);
    });

    // Find current item index using direct comparison first, then fallback to field matching
    const currentItemIndex = sortedOccurrences.findIndex(item =>
      item === hotelItem || (
        (item.calculatedDay || item.day || 1) === (hotelItem.calculatedDay || hotelItem.day || 1) &&
        (item.time || item.start_time) === (hotelItem.time || hotelItem.start_time) &&
        (item.hotelInfo?.name || item.title || item.custom_title || item.place?.name) === hotelName
      )
    );

    const isFirstOccurrence = currentItemIndex === 0;
    const isLastOccurrence = currentItemIndex === sortedOccurrences.length - 1;
    const isSingleDay = sortedOccurrences.length === 1;

    return {
      isCheckIn: isFirstOccurrence && !isSingleDay,
      isCheckOut: isLastOccurrence,
      isStay: !isFirstOccurrence && !isLastOccurrence
    };
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
      <div className="bg-white shadow rounded-lg p-4 sm:p-6">
        <div className="flex flex-col space-y-4 lg:flex-row lg:justify-between lg:items-start lg:space-y-0 mb-4">
          <div className="text-left flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 truncate">{tripData.name}</h1>
            <p className="text-sm sm:text-base text-gray-600 line-clamp-2">{tripData.description}</p>
          </div>

          {/* Responsive button layout */}
          <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2 lg:flex-shrink-0">
            {/* Primary actions - always visible */}
            <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
              <button
                onClick={() => refetch()}
                className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                title="Refresh data"
              >
                <ArrowPathIcon className="h-4 w-4" />
                <span className="ml-2 sm:hidden">Refresh</span>
              </button>

              <Link
                to={`/trips/${id}/plan`}
                className="inline-flex items-center justify-center px-4 py-2 border border-blue-300 shadow-sm text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <MapIcon className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Plan Trip</span>
                <span className="sm:hidden">Plan</span>
              </Link>
            </div>

            {/* Secondary actions - collapsible on mobile */}
            <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
              <button
                onClick={() => setShowInviteModal(true)}
                className="inline-flex items-center justify-center px-3 py-2 border border-green-300 shadow-sm text-sm font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <UserPlusIcon className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Invite Collaborators</span>
                <span className="sm:hidden">Invite</span>
              </button>

              <button
                onClick={() => setShowShareModal(true)}
                className="inline-flex items-center justify-center px-3 py-2 border border-purple-300 shadow-sm text-sm font-medium rounded-md text-purple-700 bg-purple-50 hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                <ShareIcon className="h-4 w-4 mr-2" />
                Share
              </button>

              <Link
                to={`/trips/${id}/edit`}
                className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PencilIcon className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Edit Trip</span>
                <span className="sm:hidden">Edit</span>
              </Link>

              <button
                onClick={handleDeleteTrip}
                disabled={deleteTripMutation.isLoading}
                className="inline-flex items-center justify-center px-3 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <TrashIcon className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">{deleteTripMutation.isLoading ? 'Deleting...' : 'Delete Trip'}</span>
                <span className="sm:hidden">{deleteTripMutation.isLoading ? 'Deleting...' : 'Delete'}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="text-left">
            <h3 className="text-sm sm:text-base font-medium text-gray-900">Destination</h3>
            <p className="text-sm sm:text-base text-gray-600 truncate">{tripData.destination}</p>
          </div>
          <div className="text-left">
            <h3 className="text-sm sm:text-base font-medium text-gray-900">Duration</h3>
            <p className="text-sm sm:text-base text-gray-600">
              {Math.ceil((new Date(tripData.endDate).getTime() - new Date(tripData.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} days
            </p>
          </div>
          <div className="text-left sm:col-span-2 lg:col-span-1">
            <h3 className="text-sm sm:text-base font-medium text-gray-900">Dates</h3>
            <p className="text-xs sm:text-sm lg:text-base text-gray-600">
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
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('itinerary')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${activeTab === 'itinerary'
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <TruckIcon className="h-8 w-8 text-orange-600" />
                      <div className="ml-3 text-left">
                        <p className="text-sm font-medium text-orange-900 text-left">Buses</p>
                        <p className="text-2xl font-bold text-orange-600 text-left">
                          {itinerary.filter(item => item.type === 'bus').length}
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
              {/* Header Section - Responsive */}
              <div className="flex flex-col space-y-3 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
                <h3 className="text-lg font-medium text-gray-900">Planned Itinerary</h3>
                <Link
                  to={`/trips/${id}/plan`}
                  className="inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                >
                  <PencilIcon className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Edit Itinerary</span>
                  <span className="sm:hidden">Edit</span>
                </Link>
              </div>

              {itinerary.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <CalendarIcon className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No itinerary planned yet</h3>
                  <p className="mt-1 text-sm text-gray-500 px-4">
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
                  {/* Timeline Navigation - Card-based like Overview */}
                  {days.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
                      <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 mb-4">
                        <h4 className="text-base font-medium text-gray-900">Timeline Navigation</h4>
                        <button
                          onClick={() => setShowAllDays(!showAllDays)}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                        >
                          {showAllDays ? 'Show Selected Day' : 'Show All Days'}
                        </button>
                      </div>

                      {/* Responsive Timeline Grid - Compact mobile design */}
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8 gap-1.5 sm:gap-2 md:gap-3">
                        {days.map((day, index) => (
                          <button
                            key={day.dayNumber}
                            onClick={() => {
                              setSelectedDay(day.dayNumber);
                              setShowAllDays(false);
                            }}
                            className={`p-2 sm:p-3 rounded-md sm:rounded-lg text-center transition-colors ${selectedDay === day.dayNumber && !showAllDays
                              ? 'bg-blue-600 text-white shadow-md'
                              : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                              }`}
                          >
                            <div className="font-semibold text-xs sm:text-sm">Day {day.dayNumber}</div>
                            <div className="text-xs opacity-75 mt-0.5 sm:mt-1 hidden sm:block">
                              {day.date.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric'
                              })}
                            </div>
                            {/* Mobile-only compact date */}
                            <div className="text-xs opacity-75 mt-0.5 sm:hidden">
                              {day.date.toLocaleDateString('en-US', {
                                month: 'numeric',
                                day: 'numeric'
                              })}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {getVisibleDays().map((day) => {
                    const dayItems = itinerary
                      .filter(item => item.day === day.dayNumber)
                      .sort((a, b) => {
                        // Use arrival time for flights and buses, regular time for activities
                        const timeA = a.type === 'flight' && a.flightInfo?.arrival?.time
                          ? a.flightInfo.arrival.time
                          : a.type === 'bus' && a.busInfo?.arrival?.time
                            ? a.busInfo.arrival.time
                            : a.time;
                        const timeB = b.type === 'flight' && b.flightInfo?.arrival?.time
                          ? b.flightInfo.arrival.time
                          : b.type === 'bus' && b.busInfo?.arrival?.time
                            ? b.busInfo.arrival.time
                            : b.time;
                        return timeA.localeCompare(timeB);
                      });

                    return (
                      <div key={day.dayNumber} className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 shadow-sm">
                        <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 mb-4">
                          <div className="text-left">
                            <h4 className="text-lg font-medium text-gray-900">
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
                          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {dayItems.length} {dayItems.length === 1 ? 'activity' : 'activities'}
                          </div>
                        </div>

                        {/* Day Notes - View Only */}
                        {tripData?.dayNotes?.find((d: any) => d.day === day.dayNumber)?.notes && (
                          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                            <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                              Day Notes
                            </label>
                            <div className="text-sm text-gray-600 whitespace-pre-wrap text-left">
                              {tripData.dayNotes.find((d: any) => d.day === day.dayNumber)?.notes}
                            </div>
                          </div>
                        )}

                        {dayItems.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <CalendarIcon className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                            <p className="text-sm">No activities planned for this day</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-4">
                            {dayItems.map((item, itemIndex) => (
                              <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                <div className="flex items-start space-x-3">
                                  <div className="flex-shrink-0 mt-1">
                                    {getPlaceIcon(item.type, item)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    {editingItem === item.id ? (
                                      // Edit mode - Mobile responsive
                                      <div className="space-y-3">
                                        <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-2">
                                          <div className="flex items-center space-x-2">
                                            <ClockIcon className="h-4 w-4 text-gray-400" />
                                            <input
                                              type="time"
                                              value={editForm.time}
                                              onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                                              className="text-sm border border-gray-300 rounded px-2 py-1 flex-1 sm:flex-none"
                                            />
                                          </div>
                                          <div className="flex space-x-2">
                                            {item.type === 'flight' && item.flightInfo && (
                                              <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                                                Flight
                                              </span>
                                            )}
                                            {item.type === 'bus' && item.busInfo && (
                                              <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                                                Bus
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        <h5 className="text-sm font-medium text-gray-900 break-words">
                                          {item.title}
                                        </h5>
                                        {item.description && (
                                          <p className="text-xs text-gray-500 break-words text-left">
                                            {item.description}
                                          </p>
                                        )}
                                        <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-2">
                                          <span className="text-xs text-gray-400">Duration:</span>
                                          <div className="flex items-center space-x-2">
                                            <input
                                              type="number"
                                              value={editForm.duration}
                                              onChange={(e) => setEditForm({ ...editForm, duration: parseInt(e.target.value) || 0 })}
                                              className="text-xs border border-gray-300 rounded px-2 py-1 w-16 sm:w-20"
                                              min="1"
                                            />
                                            <span className="text-xs text-gray-400">minutes</span>
                                          </div>
                                        </div>
                                        <div>
                                          <label className="text-xs text-gray-400 block mb-1">Notes:</label>
                                          <textarea
                                            value={editForm.notes}
                                            onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                                            className="text-xs border border-gray-300 rounded px-2 py-1 w-full resize-none"
                                            rows={2}
                                            placeholder="Add notes or comments..."
                                          />
                                        </div>
                                        <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-2">
                                          <button
                                            onClick={() => handleSaveEdit(item)}
                                            disabled={updateItineraryMutation.isLoading}
                                            className="inline-flex items-center justify-center px-3 py-2 text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 disabled:opacity-50"
                                          >
                                            <CheckIcon className="h-3 w-3 mr-1" />
                                            Save
                                          </button>
                                          <button
                                            onClick={handleCancelEdit}
                                            className="inline-flex items-center justify-center px-3 py-2 text-xs font-medium rounded text-gray-700 bg-gray-100 hover:bg-gray-200"
                                          >
                                            <XMarkIcon className="h-3 w-3 mr-1" />
                                            Cancel
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      // View mode - Mobile responsive
                                      <div>
                                        <div className="flex flex-col space-y-2 sm:flex-row sm:items-start sm:justify-between sm:space-y-0 mb-3">
                                          <div className="flex-1 min-w-0">
                                            <div className="flex flex-col space-y-1 sm:flex-row sm:items-center sm:space-y-0">
                                              <h5 className="text-sm sm:text-base font-medium text-gray-900 break-words pr-2">
                                                {item.title}
                                              </h5>

                                              {/* Status badge for accommodation items */}
                                              {(() => {
                                                const isHotelItem = (item.type as any) === 'accommodation' ||
                                                  (item.place?.types && item.place.types.includes('lodging'));

                                                if (!isHotelItem) return null;

                                                // Get all items for hotel status analysis
                                                const hotelStatus = getHotelStatus(item, itinerary);

                                                if (hotelStatus.isCheckIn) {
                                                  return (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 ml-2">
                                                      Check-in
                                                    </span>
                                                  );
                                                } else if (hotelStatus.isCheckOut) {
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
                                              })()}
                                            </div>
                                          </div>
                                          <div className="flex items-center text-xs sm:text-sm text-gray-500 flex-shrink-0 mt-1 sm:mt-0 sm:ml-4">
                                            <ClockIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                            <span className="whitespace-nowrap">
                                              {formatTime(getItemTime(item))}
                                            </span>
                                          </div>
                                        </div>


                                        {/* Flight Details - Mobile responsive */}
                                        {item.type === 'flight' && item.flightInfo && (
                                          <div className="mt-2 p-2 sm:p-3 bg-blue-50 rounded border">
                                            <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 text-sm">
                                              <div className="text-center flex-1">
                                                <div className="font-medium text-gray-900">
                                                  {item.flightInfo.departure?.airportCode || 'DEP'}
                                                </div>
                                                {item.flightInfo.departure?.date && (
                                                  <div className="text-xs text-gray-600 font-medium">
                                                    {formatFlightDate(item.flightInfo.departure.date)}
                                                  </div>
                                                )}
                                                <div className="text-xs text-gray-600">
                                                  Dep: {item.flightInfo.departure?.time || item.time}
                                                </div>
                                              </div>
                                              <div className="flex items-center justify-center mx-2 sm:mx-4">
                                                <div className="h-px bg-gray-300 w-6 sm:w-8"></div>
                                                <PaperAirplaneIcon className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 mx-2" />
                                                <div className="h-px bg-gray-300 w-6 sm:w-8"></div>
                                              </div>
                                              <div className="text-center flex-1">
                                                <div className="font-medium text-gray-900">
                                                  {item.flightInfo.arrival?.airportCode || 'ARR'}
                                                </div>
                                                {item.flightInfo.arrival?.date && (
                                                  <div className="text-xs text-gray-600 font-medium">
                                                    {formatFlightDate(item.flightInfo.arrival.date)}
                                                  </div>
                                                )}
                                                <div className="text-xs text-gray-600">
                                                  Arr: {item.flightInfo.arrival?.time || item.time}
                                                </div>
                                              </div>
                                            </div>
                                            {item.flightInfo.duration && (
                                              <div className="flex items-center justify-center mt-2">
                                                <div className="text-xs text-gray-600">
                                                  {item.flightInfo.duration}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        )}

                                        {/* Bus Details - Mobile responsive */}
                                        {item.type === 'bus' && item.busInfo && (
                                          <div className="mt-2 p-2 sm:p-3 bg-green-50 rounded border">
                                            <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 text-sm">
                                              <div className="text-center flex-1">
                                                <div className="font-medium text-gray-900">
                                                  {item.busInfo.departure?.city || 'DEP'}
                                                </div>
                                                <div className="text-xs text-gray-500 break-words">
                                                  {item.busInfo.departure?.station}
                                                </div>
                                                {item.busInfo.departure?.date && (
                                                  <div className="text-xs text-gray-600 font-medium">
                                                    {formatFlightDate(item.busInfo.departure.date)}
                                                  </div>
                                                )}
                                                <div className="text-xs text-gray-600">
                                                  Dep: {item.busInfo.departure?.time || item.time}
                                                </div>
                                              </div>
                                              <div className="flex items-center justify-center mx-2 sm:mx-4">
                                                <div className="h-px bg-gray-300 w-6 sm:w-8"></div>
                                                <TruckIcon className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 mx-2" />
                                                <div className="h-px bg-gray-300 w-6 sm:w-8"></div>
                                              </div>
                                              <div className="text-center flex-1">
                                                <div className="font-medium text-gray-900">
                                                  {item.busInfo.arrival?.city || 'ARR'}
                                                </div>
                                                <div className="text-xs text-gray-500 break-words">
                                                  {item.busInfo.arrival?.station}
                                                </div>
                                                {item.busInfo.arrival?.date && (
                                                  <div className="text-xs text-gray-600 text-center font-medium">
                                                    {formatFlightDate(item.busInfo.arrival.date)}
                                                  </div>
                                                )}
                                                <div className="text-xs text-gray-600 text-center">
                                                  Arr: {item.busInfo.arrival?.time || item.time}
                                                </div>
                                              </div>
                                            </div>
                                            <div className="flex items-center justify-center mt-2">
                                              {item.busInfo.duration && (
                                                <div className="text-xs text-gray-600 text-center">
                                                  {item.busInfo.duration}
                                                </div>
                                              )}
                                              {item.busInfo.seatNumber && (
                                                <div className="text-xs text-gray-600 text-center ml-4">
                                                  Seat: {item.busInfo.seatNumber}
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

                                          // Hotel info section - address will be shown below with map pin icon
                                          return null; // Remove duplicate address display
                                        })()}

                                        {/* Address Display - Mobile responsive */}
                                        {item.type !== 'flight' && item.type !== 'bus' &&
                                          (item.place?.formatted_address || item.location?.address || item.description) && (
                                            <div className="flex items-start mt-2">
                                              <MapPinIcon className="h-3 w-3 text-gray-400 mr-1 mt-0.5 flex-shrink-0" />
                                              <p className="text-xs sm:text-sm text-gray-600 break-words flex-1 text-left">
                                                {(() => {
                                                  // For hotels, clean the address from description or use place address
                                                  const isHotelItem = (item.type as any) === 'accommodation' ||
                                                    (item.place?.types && item.place.types.includes('lodging'));

                                                  if (isHotelItem) {
                                                    let hotelAddress = item.description || item.place?.formatted_address || item.location?.address || '';
                                                    // Clean the address by removing status text
                                                    if (hotelAddress) {
                                                      hotelAddress = hotelAddress
                                                        .replace(/\s*-\s*Check-in\s*$/i, '')
                                                        .replace(/\s*-\s*Check-out\s*$/i, '')
                                                        .replace(/\s*-\s*Hotel Stay\s*$/i, '')
                                                        .replace(/\s*-\s*Stay\s*$/i, '')
                                                        .trim();
                                                    }
                                                    return hotelAddress;
                                                  }

                                                  // For activities, use place or location address
                                                  return item.place?.formatted_address || item.location?.address;
                                                })()}
                                              </p>
                                            </div>
                                          )}

                                        {/* Google Rating and Place Types - Mobile responsive */}
                                        {item.place && item.type !== 'flight' && item.type !== 'bus' && (
                                          <div className="mt-2 space-y-1 sm:space-y-2">
                                            {/* Google Rating */}
                                            {item.place.rating && item.place.rating > 0 && (
                                              <div className="flex items-center space-x-1">
                                                <StarIcon className="h-3 w-3 text-yellow-400 fill-current flex-shrink-0" />
                                                <span className="text-xs sm:text-sm text-gray-600">
                                                  {item.place.rating.toFixed(1)} Google
                                                </span>
                                                {item.place.user_ratings_total && item.place.user_ratings_total > 0 && (
                                                  <span className="text-xs text-gray-400 hidden sm:inline">
                                                    ({item.place.user_ratings_total.toLocaleString()} reviews)
                                                  </span>
                                                )}
                                              </div>
                                            )}

                                            {/* Place Types - Mobile responsive */}
                                            {item.place.types && item.place.types.length > 0 && (
                                              <div className="flex flex-wrap gap-1">
                                                {item.place.types.slice(0, 2).map((type) => (
                                                  <span
                                                    key={type}
                                                    className="inline-block px-1.5 py-0.5 text-xs bg-blue-50 text-blue-600 rounded"
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

                                        {/* Duration - Mobile responsive */}
                                        {item.duration && item.type === 'activity' && (
                                          <p className="text-xs sm:text-sm text-gray-400 mt-1">
                                            Duration: {item.duration} minutes
                                          </p>
                                        )}

                                        {/* Notes - Mobile responsive */}
                                        {item.notes && (
                                          <div className="mt-2 p-2 bg-gray-50 rounded border-l-2 border-gray-300">
                                            <p className="text-xs sm:text-sm text-gray-600 italic break-words overflow-wrap-anywhere">
                                              {convertLinksToHyperlinks(item.notes)}
                                            </p>
                                          </div>
                                        )}

                                        {/* User Wish Level - Mobile responsive */}
                                        {item.type !== 'flight' && item.type !== 'bus' && (
                                          <div className="mt-2 p-2 bg-gray-50 rounded">
                                            <div className="flex flex-col space-y-1 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                                              <span className="text-xs sm:text-sm text-gray-500 font-medium">Wish Level:</span>
                                              <div className="flex items-center space-x-0.5">
                                                {renderRatingStars(item)}
                                              </div>
                                            </div>
                                          </div>
                                        )}

                                        {/* Photo Gallery */}
                                        <PhotoGallery
                                          photos={allPhotos.filter(photo => 
                                            photo.activity_index === itemIndex
                                          )}
                                          canEdit={true}
                                          onUpload={async (files) => {
                                            try {
                                              for (let i = 0; i < files.length; i++) {
                                                const file = files[i];
                                                await photosService.uploadPhoto(
                                                  id!, 
                                                  itemIndex, 
                                                  day.dayNumber, 
                                                  item.title || 'Activity', 
                                                  file
                                                );
                                              }
                                              await refetchPhotos();
                                            } catch (error) {
                                              console.error('Photo upload error:', error);
                                            }
                                          }}
                                          onDelete={async (photoId) => {
                                            try {
                                              await photosService.deletePhoto(id!, photoId);
                                              await refetchPhotos();
                                            } catch (error) {
                                              console.error('Photo delete error:', error);
                                            }
                                          }}
                                        />
                                      </div>
                                    )}
                                  </div>
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

      {/* Collaboration Modals */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        tripId={id!}
        tripTitle={tripData?.name || 'Untitled Trip'}
      />

      <InvitationModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        tripId={id!}
        tripTitle={tripData?.name || 'Untitled Trip'}
      />

      {/* Flight Edit Modal - REMOVED (flight editing disabled in planned itinerary) */}
      {/* Flight editing is now only available in the trip planning page */}
    </div>
  );
};

export default TripDetailPage;

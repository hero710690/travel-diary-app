import React, { useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { collaborationService } from '../services/collaboration';
import { sharingService } from '../services/sharing';
import LoadingSpinner from '../components/LoadingSpinner';
import FlightCard from '../components/FlightCard';
import HotelCard from '../components/HotelCard';
import { 
  MapPinIcon, 
  CalendarIcon, 
  ClockIcon,
  LockClosedIcon,
  EyeIcon,
  ShareIcon,
  PencilIcon,
  HeartIcon,
  StarIcon,
  PaperAirplaneIcon,
  HomeIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid, StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
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

  // Consistent time formatting function
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

  // Get landmark icon based on place types
  const getLandmarkIcon = (item: any) => {
    const placeTypes = item.place?.types || [];
    const title = item.title || item.custom_title || item.place?.name || '';
    
    // Flight items
    if (item.type === 'flight' || title.includes('Airline') || title.includes('Flight') || /[A-Z]{2,3}\d+/.test(title)) {
      return <PaperAirplaneIcon className="h-5 w-5 text-blue-600 flex-shrink-0" />;
    }
    
    // Hotel/Accommodation items
    if (item.type === 'accommodation' || placeTypes.includes('lodging')) {
      return <HomeIcon className="h-5 w-5 text-blue-600 flex-shrink-0" />;
    }
    
    // All other activities use MapPinIcon
    return <MapPinIcon className="h-5 w-5 text-blue-600 flex-shrink-0" />;
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

  // Process and sort itinerary items properly
  const getProcessedItinerary = () => {
    if (!tripData?.itinerary || tripData.itinerary.length === 0) {
      return [];
    }

    console.log('🔍 Processing shared trip itinerary:', {
      tripStartDate: tripData.start_date,
      tripEndDate: tripData.end_date,
      totalItems: tripData.itinerary.length,
      rawItems: tripData.itinerary.map((item: any, index: number) => ({
        index,
        title: item.title || item.custom_title || item.place?.name,
        day: item.day,
        date: item.date,
        type: item.type,
        hasFlightInfo: !!item.flightInfo,
        fullItem: item // Log the complete item for debugging
      }))
    });

    const processedItems = tripData.itinerary.map((item: any, index: number) => {
      // Check if this looks like a flight item based on title
      const title = item.title || item.custom_title || item.place?.name || '';
      const isLikelyFlight = title.includes('Airline') || title.includes('Flight') || /[A-Z]{2,3}\d+/.test(title);
      
      if (isLikelyFlight) {
        console.log('✈️ POTENTIAL FLIGHT ITEM FOUND:', {
          index,
          title,
          type: item.type,
          hasFlightInfo: !!item.flightInfo,
          flightInfo: item.flightInfo,
          notes: item.notes,
          description: item.description,
          fullItem: JSON.stringify(item, null, 2)
        });
      }

      let dayNumber = 1; // Default to day 1

      // Prioritize explicit day field
      if (item.day && typeof item.day === 'number' && item.day > 0) {
        dayNumber = item.day;
        console.log('📅 Using explicit day field:', dayNumber, 'for item:', item.title || item.custom_title || item.place?.name);
      } else if (tripData.start_date && item.date) {
        // Calculate day number based on item date and trip start date
        try {
          const tripStartDate = new Date(tripData.start_date);
          const itemDate = new Date(item.date);
          
          if (!isNaN(tripStartDate.getTime()) && !isNaN(itemDate.getTime())) {
            const diffTime = itemDate.getTime() - tripStartDate.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            dayNumber = Math.max(1, diffDays + 1); // Ensure minimum day 1
            
            console.log('📅 Calculated day number:', dayNumber, 'for item:', item.title || item.custom_title || item.place?.name, {
              tripStart: tripStartDate.toISOString(),
              itemDate: itemDate.toISOString(),
              diffDays
            });
          }
        } catch (error) {
          console.warn('⚠️ Error calculating day number for item:', item.title || item.custom_title || item.place?.name, error);
        }
      }

      return {
        ...item,
        calculatedDay: dayNumber,
        sortKey: `${dayNumber.toString().padStart(3, '0')}-${(item.start_time || item.time || '00:00').replace(':', '')}-${index.toString().padStart(3, '0')}`
      };
    });

    // Sort by day, then by time, then by original index
    const sortedItems = processedItems.sort((a, b) => {
      return a.sortKey.localeCompare(b.sortKey);
    });

    console.log('✅ Processed and sorted itinerary:', sortedItems.map(item => ({
      title: item.title || item.custom_title || item.place?.name,
      day: item.calculatedDay,
      time: item.start_time || item.time,
      sortKey: item.sortKey
    })));

    return sortedItems;
  };

  // Transform flight data to match FlightInfo interface
  const transformFlightData = (item: any) => {
    console.log('🛩️ Raw flight item data (DETAILED):', JSON.stringify(item, null, 2));
    
    // If flightInfo already exists and has proper structure, use it
    if (item.flightInfo && item.flightInfo.departure && item.flightInfo.arrival) {
      console.log('✅ Flight data already properly structured');
      return item.flightInfo;
    }
    
    // Check if we have any flight info at all
    if (!item.flightInfo) {
      console.log('❌ No flightInfo found, creating minimal structure');
      // Create a minimal flight info from available data
      return {
        airline: item.title || item.custom_title || 'Unknown Airline',
        flightNumber: '',
        departure: {
          airport: 'Unknown Airport',
          airportCode: 'XXX',
          date: item.date || '',
          time: item.time || item.start_time || '00:00'
        },
        arrival: {
          airport: 'Unknown Airport', 
          airportCode: 'XXX',
          date: item.date || '',
          time: item.time || item.start_time || '00:00'
        }
      };
    }
    
    const flightInfo = item.flightInfo;
    console.log('🔍 FlightInfo object:', JSON.stringify(flightInfo, null, 2));
    
    // Try to parse flight number and airline from title if not in flightInfo
    let airline = flightInfo.airline || 'Unknown Airline';
    let flightNumber = flightInfo.flightNumber || flightInfo.flight_number || '';
    
    // If we have a title like "China Airlines CI62", try to parse it
    const title = item.title || item.custom_title || '';
    if (title && !flightNumber) {
      const flightMatch = title.match(/([A-Z]{2,3}\d+)/); // Match flight codes like CI62, AA123
      const airlineMatch = title.replace(/[A-Z]{2,3}\d+/, '').trim(); // Remove flight code to get airline
      
      if (flightMatch) {
        flightNumber = flightMatch[1];
      }
      if (airlineMatch) {
        airline = airlineMatch;
      }
    }
    
    // Try to extract airport info from notes or description
    const notes = item.notes || item.description || '';
    let departureCode = 'XXX';
    let arrivalCode = 'XXX';
    
    // Look for airport codes in notes like "Flight from TPE to YVR"
    const airportMatch = notes.match(/from\s+([A-Z]{3})\s+to\s+([A-Z]{3})/i);
    if (airportMatch) {
      departureCode = airportMatch[1];
      arrivalCode = airportMatch[2];
    }
    
    const transformedFlightInfo = {
      airline: airline,
      flightNumber: flightNumber,
      departure: {
        airport: flightInfo.departureAirport || flightInfo.departure_airport || `${departureCode} Airport`,
        airportCode: flightInfo.departureAirportCode || flightInfo.departure_airport_code || departureCode,
        date: flightInfo.departureDate || flightInfo.departure_date || item.date || '',
        time: flightInfo.departureTime || flightInfo.departure_time || item.time || item.start_time || '00:00',
        terminal: flightInfo.departureTerminal || flightInfo.departure_terminal,
        gate: flightInfo.departureGate || flightInfo.departure_gate
      },
      arrival: {
        airport: flightInfo.arrivalAirport || flightInfo.arrival_airport || `${arrivalCode} Airport`,
        airportCode: flightInfo.arrivalAirportCode || flightInfo.arrival_airport_code || arrivalCode,
        date: flightInfo.arrivalDate || flightInfo.arrival_date || item.date || '',
        time: flightInfo.arrivalTime || flightInfo.arrival_time || item.end_time || '00:00',
        terminal: flightInfo.arrivalTerminal || flightInfo.arrival_terminal,
        gate: flightInfo.arrivalGate || flightInfo.arrival_gate
      },
      duration: flightInfo.duration || flightInfo.flight_duration,
      aircraft: flightInfo.aircraft || flightInfo.aircraft_type,
      seatNumber: flightInfo.seatNumber || flightInfo.seat_number || flightInfo.seat,
      bookingReference: flightInfo.bookingReference || flightInfo.booking_reference || flightInfo.confirmation,
      status: flightInfo.status || 'scheduled'
    };
    
    console.log('🔄 Transformed flight data (DETAILED):', JSON.stringify(transformedFlightInfo, null, 2));
    return transformedFlightInfo;
  };

  // Helper function to determine hotel check-in/check-out status
  const getHotelStatus = (hotelItem: any, dayItems: any[], currentIndex: number) => {
    const hotelName = hotelItem.hotelInfo?.name || hotelItem.title || hotelItem.custom_title;
    
    // Find all occurrences of this hotel in the itinerary
    const allHotelOccurrences = dayItems.filter(item => {
      const itemHotelName = item.hotelInfo?.name || item.title || item.custom_title;
      return itemHotelName === hotelName && (item.type === 'accommodation' || item.hotelInfo);
    });
    
    // Sort by day and time to determine sequence
    const sortedOccurrences = allHotelOccurrences.sort((a, b) => {
      if (a.calculatedDay !== b.calculatedDay) {
        return a.calculatedDay - b.calculatedDay;
      }
      const timeA = a.time || a.start_time || '00:00';
      const timeB = b.time || b.start_time || '00:00';
      return timeA.localeCompare(timeB);
    });
    
    const currentItemIndex = sortedOccurrences.findIndex(item => 
      item === hotelItem || (
        item.calculatedDay === hotelItem.calculatedDay && 
        (item.time || item.start_time) === (hotelItem.time || hotelItem.start_time)
      )
    );
    
    const isFirstOccurrence = currentItemIndex === 0;
    const isLastOccurrence = currentItemIndex === sortedOccurrences.length - 1;
    
    console.log('🏨 Hotel status analysis:', {
      hotelName,
      currentDay: hotelItem.calculatedDay,
      totalOccurrences: sortedOccurrences.length,
      currentIndex: currentItemIndex,
      isFirstOccurrence,
      isLastOccurrence,
      allOccurrences: sortedOccurrences.map(item => ({
        day: item.calculatedDay,
        time: item.time || item.start_time
      }))
    });
    
    return {
      isCheckIn: isFirstOccurrence,
      isCheckOut: isLastOccurrence && sortedOccurrences.length > 1,
      isStay: !isFirstOccurrence && !isLastOccurrence
    };
  };

  // Group itinerary by day for better display
  const getGroupedItinerary = () => {
    const processedItems = getProcessedItinerary();
    const grouped: { [key: number]: any[] } = {};

    processedItems.forEach(item => {
      const day = item.calculatedDay;
      if (!grouped[day]) {
        grouped[day] = [];
      }
      grouped[day].push(item);
    });

    return grouped;
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
              <div className="space-y-8">
                {Object.entries(getGroupedItinerary())
                  .sort(([dayA], [dayB]) => parseInt(dayA) - parseInt(dayB))
                  .map(([day, dayItems]) => (
                    <div key={day} className="space-y-4">
                      {/* Day Header */}
                      <div className="flex items-center mb-4">
                        <div className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full text-sm font-semibold mr-3">
                          {day}
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Day {day}</h3>
                        {tripData.start_date && (
                          <span className="ml-3 text-sm text-gray-500">
                            {(() => {
                              try {
                                const startDate = new Date(tripData.start_date);
                                const dayDate = new Date(startDate);
                                dayDate.setDate(startDate.getDate() + parseInt(day) - 1);
                                return format(dayDate, 'MMM dd, yyyy');
                              } catch {
                                return '';
                              }
                            })()}
                          </span>
                        )}
                      </div>

                      {/* Day Items */}
                      <div className="space-y-4 ml-11">
                        {dayItems.map((item: any, index: number) => {
                          // Enhanced flight detection - check by title pattern as well as type
                          const title = item.title || item.custom_title || item.place?.name || '';
                          const isLikelyFlight = title.includes('Airline') || title.includes('Flight') || /[A-Z]{2,3}\d+/.test(title);
                          const hasFlightType = item.type === 'flight';
                          const hasFlightInfo = !!item.flightInfo;
                          
                          console.log('🔍 Item analysis:', {
                            title,
                            type: item.type,
                            isLikelyFlight,
                            hasFlightType,
                            hasFlightInfo,
                            shouldTreatAsFlight: (hasFlightType && hasFlightInfo) || isLikelyFlight
                          });

                          // Check if this is a flight item - use original FlightCard component with data transformation
                          if ((hasFlightType && hasFlightInfo) || isLikelyFlight) {
                            console.log('🛩️ Processing as flight item:', {
                              type: item.type,
                              flightInfo: item.flightInfo,
                              time: item.time,
                              start_time: item.start_time,
                              fullItem: item
                            });
                            
                            const transformedFlightInfo = transformFlightData(item);
                            
                            return (
                              <FlightCard
                                key={`${day}-${index}`}
                                flightInfo={transformedFlightInfo}
                                time={formatTime(getItemTime(item))}
                                // Don't pass onEdit or onDelete for read-only view
                                className="mb-4"
                              />
                            );
                          }

                          // Check if this is a hotel item
                          if (item.type === 'accommodation' && item.hotelInfo) {
                            const allDayItems = Object.values(getGroupedItinerary()).flat();
                            const hotelStatus = getHotelStatus(item, allDayItems, index);
                            
                            return (
                              <HotelCard
                                key={`${day}-${index}`}
                                hotelInfo={item.hotelInfo}
                                time={formatTime(getItemTime(item))}
                                isCheckIn={hotelStatus.isCheckIn}
                                isCheckOut={hotelStatus.isCheckOut}
                                className="mb-4"
                              />
                            );
                          }

                          // Regular activity item with enhanced display
                          return (
                            <div key={`${day}-${index}`} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  {/* Activity Header with consistent time positioning */}
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center space-x-2">
                                      {getLandmarkIcon(item)}
                                      <h4 className="text-lg font-semibold text-gray-900 text-left">
                                        {item.title || item.custom_title || item.place?.name}
                                      </h4>
                                    </div>
                                    {getItemTime(item) && (
                                      <div className="flex items-center text-sm text-gray-500 flex-shrink-0 ml-4">
                                        <ClockIcon className="h-4 w-4 mr-1" />
                                        <span className="whitespace-nowrap">{formatTime(getItemTime(item))}</span>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {item.description && (
                                    <p className="text-gray-600 mb-3 text-left">{item.description}</p>
                                  )}
                                  
                                  {/* Location with enhanced display */}
                                  {item.location?.name && (
                                    <div className="flex items-center mb-3 text-sm text-gray-600">
                                      <MapPinIcon className="h-4 w-4 mr-2 text-gray-400" />
                                      <span className="text-left">{item.location.name}</span>
                                      {item.location.address && (
                                        <span className="text-gray-400 ml-2">• {item.location.address}</span>
                                      )}
                                    </div>
                                  )}

                                  {/* Google Rating Display */}
                                  {item.place?.rating && (
                                    <div className="flex items-center mb-3">
                                      <div className="flex items-center">
                                        <StarIconSolid className="h-4 w-4 text-yellow-400 mr-1" />
                                        <span className="text-sm text-gray-600">
                                          {item.place.rating} ({item.place.user_ratings_total || 0} reviews)
                                        </span>
                                      </div>
                                    </div>
                                  )}

                                  {/* Place Types */}
                                  {item.place?.types && item.place.types.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-3">
                                      {item.place.types.slice(0, 3).map((type: string, typeIndex: number) => (
                                        <span
                                          key={typeIndex}
                                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                                        >
                                          {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                        </span>
                                      ))}
                                    </div>
                                  )}

                                  {/* User Rating Display (Read-only) */}
                                  {item.userRating && (
                                    <div className="flex items-center">
                                      <span className="text-sm font-medium text-gray-700 mr-2">Wish Level:</span>
                                      <div className="flex items-center">
                                        {[1, 2, 3, 4, 5].map((heart) => (
                                          <HeartIconSolid
                                            key={heart}
                                            className={`h-4 w-4 ${
                                              heart <= (item.userRating || 0)
                                                ? 'text-red-500'
                                                : 'text-gray-300'
                                            }`}
                                          />
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Notes */}
                                  {item.notes && (
                                    <div className="mt-3">
                                      <p className="text-sm text-gray-600 text-left">
                                        <strong>Notes:</strong> {item.notes}
                                      </p>
                                    </div>
                                  )}
                                </div>

                                {/* Photo Display */}
                                {item.place?.photos && item.place.photos.length > 0 && (
                                  <div className="ml-4 flex-shrink-0">
                                    <img
                                      src={typeof item.place.photos[0] === 'string' 
                                        ? item.place.photos[0] 
                                        : item.place.photos[0]?.photo_reference 
                                          ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=200&photoreference=${item.place.photos[0].photo_reference}&key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}`
                                          : '/placeholder-image.jpg'
                                      }
                                      alt={item.title || item.place?.name}
                                      className="w-24 h-24 object-cover rounded-lg shadow-sm"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {tripData.wishlist.map((item: any, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 text-left mb-2">
                          {item.name || item.title}
                        </h3>
                        
                        {item.description && (
                          <p className="text-gray-600 text-sm mb-3 text-left">{item.description}</p>
                        )}

                        {/* Location */}
                        {item.location?.name && (
                          <div className="flex items-center mb-2 text-sm text-gray-600">
                            <MapPinIcon className="h-4 w-4 mr-2 text-gray-400" />
                            <span className="text-left">{item.location.name}</span>
                          </div>
                        )}

                        {/* Google Rating */}
                        {item.rating && (
                          <div className="flex items-center mb-2">
                            <div className="flex items-center">
                              <StarIconSolid className="h-4 w-4 text-yellow-400 mr-1" />
                              <span className="text-sm text-gray-600">
                                {item.rating} ({item.user_ratings_total || 0} reviews)
                              </span>
                            </div>
                          </div>
                        )}

                        {/* User Rating */}
                        {item.userInterestRating && (
                          <div className="flex items-center">
                            <span className="text-sm font-medium text-gray-700 mr-2">Interest:</span>
                            <div className="flex items-center">
                              {[1, 2, 3, 4, 5].map((heart) => (
                                <HeartIconSolid
                                  key={heart}
                                  className={`h-4 w-4 ${
                                    heart <= (item.userInterestRating || 0)
                                      ? 'text-red-500'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Photo */}
                      {item.photos && item.photos.length > 0 && (
                        <div className="ml-4 flex-shrink-0">
                          <img
                            src={typeof item.photos[0] === 'string' 
                              ? item.photos[0] 
                              : item.photos[0]?.photo_reference 
                                ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=150&photoreference=${item.photos[0].photo_reference}&key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}`
                                : '/placeholder-image.jpg'
                            }
                            alt={item.name || item.title}
                            className="w-20 h-20 object-cover rounded-lg shadow-sm"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                    </div>
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

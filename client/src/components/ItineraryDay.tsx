import React, { useState } from 'react';
import { useDrop } from 'react-dnd';
import { format } from 'date-fns';
import { ItineraryItem, FlightInfo, BusInfo } from '../types';
import DraggableItineraryItem from './DraggableItineraryItem';
import FlightCard from './FlightCard';
import BusCard from './BusCard';
import HotelCard from './HotelCard';
import FlightForm from './FlightForm'; // Restored for editing existing flights
import BusForm from './BusForm'; // Added for bus support
import toast from 'react-hot-toast';
import { 
  PlusIcon 
  // PaperAirplaneIcon removed - no longer needed for add buttons 
} from '@heroicons/react/24/outline';

interface Place {
  place_id: string;
  name: string;
  formatted_address: string;
}

interface Day {
  date: Date;
  dayNumber: number;
}

interface ItineraryDayProps {
  day: Day;
  items: ItineraryItem[];
  onDrop: (place: Place) => void;
  onRemoveItem: (itemId: string) => void;
  onUpdateItem?: (itemId: string, updates: Partial<ItineraryItem>) => void;
  onMoveItem?: (itemId: string, newDay: number) => void;
  onEditHotel?: (hotelStayId: string) => void;
  formatTime?: (timeString: string) => string;
  tripStartDate?: string; // Add trip start date for day calculation
  tripEndDate?: string; // Add trip end date for flight time logic
  // onAddFlight removed - using top-level Add Flight button instead
}

const ItineraryDay: React.FC<ItineraryDayProps> = ({ 
  day, 
  items, 
  onDrop, 
  onRemoveItem,
  onUpdateItem,
  onMoveItem,
  onEditHotel,
  formatTime,
  tripStartDate,
  tripEndDate
  // onAddFlight removed - using top-level Add Flight button instead
}) => {
  // Form states for editing existing transportation items
  const [showFlightForm, setShowFlightForm] = useState(false);
  const [editingFlight, setEditingFlight] = useState<ItineraryItem | null>(null);
  const [showBusForm, setShowBusForm] = useState(false);
  const [editingBus, setEditingBus] = useState<ItineraryItem | null>(null);

  const [{ isOver }, drop] = useDrop(() => ({
    accept: ['place', 'itinerary-item'],
    drop: (item: Place | ItineraryItem) => {
      if ('place_id' in item) {
        // It's a place from wishlist
        onDrop(item);
      } else if ('id' in item && onMoveItem) {
        // It's an itinerary item being moved between days
        onMoveItem(item.id, day.dayNumber);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  const getSortTime = (item: ItineraryItem): string => {
    // For flights, use arrival time for sorting (when traveler reaches destination)
    if (item.type === 'flight' && item.flightInfo?.arrival?.time) {
      return item.flightInfo.arrival.time;
    }
    // For other activities, use the regular time
    return item.time;
  };

  const sortedItems = items.sort((a, b) => {
    const timeA = getSortTime(a);
    const timeB = getSortTime(b);
    return timeA.localeCompare(timeB);
  });

  // Flight handling functions removed - using top-level Add Flight button instead
  // const handleAddFlight = (flightInfo: FlightInfo) => { ... }

  // Flight editing functions (for existing flights only)
  const handleEditFlight = (item: ItineraryItem) => {
    setEditingFlight(item);
    setShowFlightForm(true);
  };

  const handleUpdateFlight = (flightInfo: FlightInfo) => {
    if (editingFlight && onUpdateItem) {
      onUpdateItem(editingFlight.id, {
        flightInfo,
        time: flightInfo.arrival.time, // Use arrival time for consistency
        title: `${flightInfo.airline} ${flightInfo.flightNumber}`,
        description: `${flightInfo.departure.airportCode} → ${flightInfo.arrival.airportCode}`,
      });
    }
    setEditingFlight(null);
    setShowFlightForm(false);
  };

  const handleCancelFlightForm = () => {
    setShowFlightForm(false);
    setEditingFlight(null);
  };
  
  // Bus editing functions
  const handleEditBus = (item: ItineraryItem) => {
    console.log('🚌 handleEditBus called with item:', item);
    console.log('🚌 item.busInfo:', item.busInfo);
    console.log('🚌 item type:', item.type);
    
    if (!item.busInfo) {
      console.error('🚌 No busInfo found in item:', item);
      toast.error('Bus information not found. Cannot edit.');
      return;
    }
    
    setEditingBus(item);
    setShowBusForm(true);
    console.log('🚌 Bus edit form opened');
  };

  const handleUpdateBus = (busInfo: BusInfo) => {
    console.log('🚌 handleUpdateBus called with:', busInfo);
    console.log('🚌 editingBus:', editingBus);
    console.log('🚌 onUpdateItem available:', !!onUpdateItem);
    
    if (!editingBus) {
      console.error('🚌 No editingBus found');
      return;
    }
    
    if (!onUpdateItem) {
      console.error('🚌 No onUpdateItem function provided');
      return;
    }

    // Calculate the new day based on arrival date
    let newDay = editingBus.day; // Default to current day
    
    if (tripStartDate && busInfo.arrival.date) {
      try {
        const tripStart = new Date(tripStartDate);
        const arrivalDate = new Date(busInfo.arrival.date);
        
        // Calculate day difference (same logic as in TripPlanningPage)
        const timeDiff = arrivalDate.getTime() - tripStart.getTime();
        const dayDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
        newDay = Math.max(1, dayDiff + 1);
        
        console.log('🚌 Day recalculation:', {
          tripStartDate,
          arrivalDate: busInfo.arrival.date,
          dayDiff,
          newDay,
          originalDay: editingBus.day
        });
      } catch (error) {
        console.error('🚌 Error calculating day:', error);
        // Keep original day if calculation fails
      }
    }

    // Create the update object with all necessary fields
    const updateData = {
      type: 'bus' as const,
      day: newDay, // Include the recalculated day
      busInfo: busInfo,
      time: busInfo.arrival.time,
      title: `${busInfo.company} ${busInfo.busNumber}`,
      description: `${busInfo.departure.city} → ${busInfo.arrival.city}`,
      notes: `Bus from ${busInfo.departure.city} to ${busInfo.arrival.city}${busInfo.bookingReference ? ` (Confirmation: ${busInfo.bookingReference})` : ''}`,
      place: {
        name: `${busInfo.company} ${busInfo.busNumber}`,
        address: `${busInfo.departure.city} → ${busInfo.arrival.city}`,
        coordinates: undefined,
        place_id: editingBus.place?.place_id || `bus_${editingBus.id}`,
        types: ['bus'],
        rating: 0,
        photos: []
      }
    };
    
    console.log('🚌 Calling onUpdateItem with:', {
      itemId: editingBus.id,
      updateData,
      dayChanged: newDay !== editingBus.day
    });
    
    try {
      onUpdateItem(editingBus.id, updateData);
      console.log('🚌 onUpdateItem called successfully');
      
      if (newDay !== editingBus.day) {
        toast.success(`Bus ${busInfo.company} ${busInfo.busNumber} updated and moved to Day ${newDay}`);
      } else {
        toast.success(`Bus ${busInfo.company} ${busInfo.busNumber} updated successfully`);
      }
    } catch (error) {
      console.error('🚌 Error calling onUpdateItem:', error);
      toast.error('Failed to update bus information');
    }
    
    // Close the form
    setEditingBus(null);
    setShowBusForm(false);
  };

  const handleCancelBusForm = () => {
    setShowBusForm(false);
    setEditingBus(null);
  };

  return (
    <div
      ref={drop}
      className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
        isOver 
          ? 'border-blue-400 bg-blue-50' 
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="text-left">
          <h3 className="font-medium text-gray-900 text-left">
            Day {day.dayNumber}
          </h3>
          <p className="text-sm text-gray-500 text-left">
            {format(day.date, 'EEEE, MMM d')}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="text-xs text-gray-400">
            {items.length} {items.length === 1 ? 'activity' : 'activities'}
          </div>
          {/* Flight button removed - using top-level Add Flight button instead */}
        </div>
      </div>

      <div className="space-y-3">
        {sortedItems.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-gray-500 mb-2">
              {isOver ? 'Drop here to add to this day' : 'Drag places here to plan your day'}
            </p>
            {/* Flight button removed - using top-level Add Flight button instead */}
          </div>
        ) : (
          sortedItems.map((item) => {
            // Check if this is a hotel/accommodation item
            const isHotelItem = item.type === 'accommodation' || 
                               (item.place?.types && item.place.types.includes('lodging'));
            
            return (
              item.type === 'flight' && item.flightInfo ? (
                <FlightCard
                  key={item.id}
                  flightInfo={item.flightInfo}
                  time={formatTime ? formatTime(item.time || '') : (item.time || '')}
                  onEdit={() => handleEditFlight(item)}
                  onDelete={() => onRemoveItem(item.id)}
                  tripEndDate={tripEndDate}
                />
              ) : item.type === 'bus' && item.busInfo ? (
                <BusCard
                  key={item.id}
                  busInfo={item.busInfo}
                  time={formatTime ? formatTime(item.time || '') : (item.time || '')}
                  onEdit={() => handleEditBus(item)}
                  onDelete={() => onRemoveItem(item.id)}
                  tripEndDate={tripEndDate}
                />
              ) : isHotelItem ? (
                <HotelCard
                  key={item.id}
                  hotelInfo={{
                    name: item.hotelInfo?.name || item.title || item.place?.name || 'Hotel',
                    address: item.hotelInfo?.address || item.description || item.place?.formatted_address || item.place?.address || '',
                    checkInDate: item.hotelInfo?.checkInDate || '', 
                    checkOutDate: item.hotelInfo?.checkOutDate || '', 
                    rating: item.hotelInfo?.rating || item.place?.rating,
                    user_ratings_total: item.place?.user_ratings_total,
                    notes: item.hotelInfo?.notes || item.notes || '',
                    // Most importantly - preserve room type!
                    roomType: item.hotelInfo?.roomType,
                    confirmationNumber: item.hotelInfo?.confirmationNumber,
                    coordinates: item.hotelInfo?.coordinates,
                    // Add place types
                    types: item.place?.types || ['lodging']
                  }}
                  time={formatTime ? formatTime(item.time || '') : (item.time || '')}
                  isCheckIn={(item as any).calculatedHotelStatus?.isCheckIn || false}
                  isCheckOut={(item as any).calculatedHotelStatus?.isCheckOut || false}
                  onEdit={() => {
                    // Extract hotel stay ID from item ID (format: hotelStayId_day_X)
                    const hotelStayId = item.id.split('_day_')[0];
                    if (onEditHotel) {
                      onEditHotel(hotelStayId);
                    }
                  }}
                  onDelete={() => onRemoveItem(item.id)}
                />
              ) : (
                <DraggableItineraryItem
                  key={item.id}
                  item={item}
                  onRemove={onRemoveItem}
                  onUpdate={onUpdateItem}
                  onEditHotel={onEditHotel}
                  formatTime={formatTime}
                />
              )
            );
          })
        )}
      </div>

      {isOver && (
        <div className="mt-2 text-center">
          <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Drop to add to Day {day.dayNumber}
          </div>
        </div>
      )}

      {/* Flight Form Modal - for editing existing flights only */}
      {showFlightForm && editingFlight && (
        <FlightForm
          initialData={editingFlight.flightInfo}
          onSave={handleUpdateFlight}
          onCancel={handleCancelFlightForm}
        />
      )}

      {/* Bus Form Modal - for editing existing bus items */}
      {showBusForm && editingBus && (
        <BusForm
          initialData={editingBus.busInfo}
          onSave={handleUpdateBus}
          onCancel={handleCancelBusForm}
          tripStartDate={editingBus.busInfo?.departure.date}
          tripEndDate={tripEndDate}
        />
      )}
    </div>
  );
};

export default ItineraryDay;

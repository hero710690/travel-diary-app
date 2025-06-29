import React, { useState } from 'react';
import { useDrop } from 'react-dnd';
import { format } from 'date-fns';
import { ItineraryItem, FlightInfo } from '../types';
import DraggableItineraryItem from './DraggableItineraryItem';
import FlightCard from './FlightCard';
import HotelCard from './HotelCard';
import FlightForm from './FlightForm'; // Restored for editing existing flights
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
  formatTime
  // onAddFlight removed - using top-level Add Flight button instead
}) => {
  // Flight form state for editing existing flights only (not for adding new ones)
  const [showFlightForm, setShowFlightForm] = useState(false);
  const [editingFlight, setEditingFlight] = useState<ItineraryItem | null>(null);

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
          sortedItems.map((item) => (
            item.type === 'flight' && item.flightInfo ? (
              <FlightCard
                key={item.id}
                flightInfo={item.flightInfo}
                time={formatTime ? formatTime(item.time || '') : (item.time || '')}
                onEdit={() => handleEditFlight(item)}
                onDelete={() => onRemoveItem(item.id)}
              />
            ) : item.type === 'accommodation' && item.hotelInfo ? (
              <HotelCard
                key={item.id}
                hotelInfo={item.hotelInfo}
                time={formatTime ? formatTime(item.time || '') : (item.time || '')}
                isCheckIn={item.description?.includes('Check-in')}
                isCheckOut={item.description?.includes('Check-out')}
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
          ))
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
    </div>
  );
};

export default ItineraryDay;

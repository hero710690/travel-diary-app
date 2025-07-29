import React, { useState } from 'react';
import { useDrag } from 'react-dnd';
import { convertLinksToHyperlinks } from '../utils/linkUtils';
import { ClockIcon, TrashIcon, PencilIcon, CheckIcon, XMarkIcon, HeartIcon, StarIcon, MapPinIcon, CameraIcon, HomeIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { ItineraryItem } from '../types';

interface DraggableItineraryItemProps {
  item: ItineraryItem;
  onRemove: (itemId: string) => void;
  onUpdate?: (itemId: string, updates: Partial<ItineraryItem>) => void;
  onEditHotel?: (hotelStayId: string) => void;
  formatTime?: (timeString: string) => string;
}

const DraggableItineraryItem: React.FC<DraggableItineraryItemProps> = ({
  item,
  onRemove,
  onUpdate,
  onEditHotel,
  formatTime
}) => {
  // Debug hotel status for accommodation items
  const isAccommodationItem = item.type === 'accommodation' || 
                             (item.place?.types && item.place.types.includes('lodging'));
  
  if (isAccommodationItem) {
    console.log('🏨 DraggableItineraryItem hotel debug:', {
      itemId: item.id,
      title: item.title,
      customTitle: (item as any).customTitle,
      placeName: item.place?.name,
      day: item.day,
      time: item.time,
      type: item.type,
      placeTypes: item.place?.types,
      storedHotelStatus: (item as any).hotelStatus,
      calculatedHotelStatus: (item as any).calculatedHotelStatus,
      hasCalculatedStatus: !!(item as any).calculatedHotelStatus
    });
  }
  
  const [isEditing, setIsEditing] = useState(false);
  const [editTime, setEditTime] = useState(item.time);
  const [editDuration, setEditDuration] = useState(item.duration || 60);
  const [editNotes, setEditNotes] = useState(item.notes || ''); // Add notes editing state
  const [hoveredHeart, setHoveredHeart] = useState<number | null>(null);



  // Helper functions for duration display
  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) {
      return `${mins}m`;
    } else if (mins === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${mins}m`;
    }
  };

  const getDurationOptions = () => {
    try {
      const options = [];
      // Add common durations with validation
      const commonDurations = [15, 30, 45, 60, 90, 120, 180, 240, 300, 360, 480];
      
      for (const duration of commonDurations) {
        if (typeof duration === 'number' && duration > 0) {
          options.push({
            value: duration,
            label: formatDuration(duration)
          });
        }
      }
      
      // Ensure we have at least one option
      if (options.length === 0) {
        options.push({ value: 60, label: '1h' });
      }
      
      return options;
    } catch (error) {
      console.error('❌ Error generating duration options:', error);
      // Return safe fallback
      return [
        { value: 30, label: '30m' },
        { value: 60, label: '1h' },
        { value: 120, label: '2h' }
      ];
    }
  };

  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'itinerary-item',
    item: item,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const handleEditStart = () => {
    setIsEditing(true);
    setEditTime(item.time);
    setEditDuration(item.duration || 60);
    setEditNotes(item.notes || ''); // Initialize notes for editing
  };

  const handleEditSave = () => {
    try {
      if (!onUpdate) {
        console.warn('⚠️ No onUpdate function provided');
        setIsEditing(false);
        return;
      }

      // Validate time format
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(editTime)) {
        alert('Please enter a valid time in HH:MM format');
        return;
      }

      const updateData: any = {
        time: editTime,
        notes: editNotes || '' // Include notes in the update
      };
      
      // Only update duration for non-accommodation items
      if (item.type !== 'accommodation') {
        // Ensure duration is a valid number with bounds checking
        let validDuration: number;
        
        if (typeof editDuration === 'number' && !isNaN(editDuration)) {
          validDuration = Math.max(15, Math.min(1440, Math.round(editDuration))); // 15 min to 24 hours
        } else {
          const parsed = parseInt(String(editDuration), 10);
          validDuration = !isNaN(parsed) && parsed > 0 ? Math.max(15, Math.min(1440, parsed)) : 60;
        }
        
        updateData.duration = validDuration;
        console.log('✅ Validated duration for save:', validDuration, 'from edit value:', editDuration);
      }
      
      console.log('🔄 Updating item with data:', updateData);
      onUpdate(item.id, updateData);
      setIsEditing(false);
      
    } catch (error) {
      console.error('❌ Error saving item updates:', error);
      alert('Failed to save changes. Please check your input and try again.');
      // Don't exit edit mode if there's an error
    }
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditTime(item.time);
    setEditDuration(item.duration || 60);
    setEditNotes(item.notes || ''); // Reset notes on cancel
  };

  const handleRatingClick = (rating: number) => {
    // Clear hover state
    setHoveredHeart(null);
    
    // Call parent update function to save to database
    if (onUpdate) {
      onUpdate(item.id, { userRating: rating });
    }
  };

  const renderRatingStars = () => {
    const hearts = [];
    // Use item.userRating directly since it's the source of truth from the database
    const displayRating = item.userRating || 0;
    
    for (let i = 1; i <= 5; i++) {
      const isFilled = i <= (hoveredHeart || displayRating);
      
      hearts.push(
        <button
          key={i}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleRatingClick(i);
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          onMouseEnter={() => {
            setHoveredHeart(i);
          }}
          onMouseLeave={() => {
            setHoveredHeart(null);
          }}
          className="p-0.5 hover:scale-110 transition-transform cursor-pointer relative z-10"
          title={`Wish level ${i} heart${i > 1 ? 's' : ''}`}
          type="button"
          style={{ pointerEvents: 'auto' }}
        >
          {isFilled ? (
            <HeartIconSolid className="h-4 w-4 text-red-500" />
          ) : (
            <HeartIcon className="h-4 w-4 text-gray-300 hover:text-red-400" />
          )}
        </button>
      );
    }
    return hearts;
  };

  return (
    <div
      ref={drag}
      className={`bg-white border border-gray-200 rounded-lg p-6 shadow-sm transition-all duration-200 ${
        isDragging 
          ? 'opacity-50 shadow-lg transform rotate-2' 
          : 'hover:shadow-md cursor-move'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            // Edit mode
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <ClockIcon className="h-4 w-4 text-gray-400" />
                <input
                  type="time"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {item.type !== 'accommodation' && (
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">Duration:</span>
                  <select
                    value={editDuration}
                    onChange={(e) => {
                      try {
                        const value = e.target.value;
                        if (!value || value === '') {
                          setEditDuration(60);
                          return;
                        }
                        
                        const newDuration = parseInt(value, 10);
                        if (isNaN(newDuration) || newDuration <= 0) {
                          console.warn('⚠️ Invalid duration value:', value);
                          setEditDuration(60); // fallback to 60 minutes
                        } else {
                          // Ensure duration is within reasonable bounds
                          const boundedDuration = Math.max(15, Math.min(1440, newDuration));
                          setEditDuration(boundedDuration);
                        }
                      } catch (error) {
                        console.error('❌ Error parsing duration:', error);
                        setEditDuration(60); // fallback to 60 minutes
                      }
                    }}
                    className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {getDurationOptions().map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="space-y-1">
                <span className="text-xs text-gray-500">Notes:</span>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="text-xs border border-gray-300 rounded px-2 py-1 w-full resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add notes or comments..."
                  rows={2}
                />
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleEditSave}
                  className="p-1 text-green-600 hover:text-green-700 transition-colors"
                  title="Save changes"
                >
                  <CheckIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={handleEditCancel}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Cancel editing"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            // View mode
            <div className="min-w-0 flex-1">
              {/* Header with title on left and time/edit on right */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  {item.type !== 'accommodation' && item.type !== 'flight' && (
                    <CameraIcon className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  )}
                  {item.type === 'accommodation' && (
                    <HomeIcon className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  )}
                  {/* Also show home icon for lodging places */}
                  {item.type !== 'accommodation' && item.place?.types && item.place.types.includes('lodging') && (
                    <HomeIcon className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  )}
                  <h4 className="text-lg font-semibold text-gray-900 break-words text-left">
                    {item.title}
                  </h4>
                  {/* Hotel Status Badge */}
                  {((item.type === 'accommodation') || (item.place?.types && item.place.types.includes('lodging'))) && (
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      (item as any).calculatedHotelStatus?.isCheckIn ? 'bg-green-100 text-green-800' :
                      (item as any).calculatedHotelStatus?.isCheckOut ? 'bg-orange-100 text-orange-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {(item as any).calculatedHotelStatus?.isCheckIn ? 'Check-in' :
                       (item as any).calculatedHotelStatus?.isCheckOut ? 'Check-out' : 'Stay'}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                  <span className="text-sm text-gray-500 flex items-center whitespace-nowrap">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    {formatTime ? formatTime(item.time || '') : (item.time || '')}
                  </span>
                  <button
                    onClick={handleEditStart}
                    className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                    title="Edit time"
                  >
                    <PencilIcon className="h-3 w-3" />
                  </button>
                </div>
              </div>
              
              {/* Hotel Edit Button - Only for accommodation items */}
              {item.type === 'accommodation' && item.hotelInfo && onEditHotel && (
                <div className="flex justify-end mb-2">
                  <button
                    onClick={() => {
                      // Extract hotel stay ID from item ID (format: hotelStayId_day_X)
                      const hotelStayId = item.id.split('_day_')[0];
                      onEditHotel(hotelStayId);
                    }}
                    className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                    title="Edit hotel details"
                  >
                    <PencilIcon className="h-3 w-3" />
                  </button>
                </div>
              )}
              
              {/* Description - Only show if it's not the same as the address */}
              {item.description && 
               item.description !== (item.place?.formatted_address || item.location?.address) && (
                <p className="text-sm text-gray-600 break-words line-clamp-2 text-left mb-2">
                  {item.description}
                </p>
              )}
              
              {/* Address Display - Only for activity cards, not accommodation or flight */}
              {item.type !== 'accommodation' && item.type !== 'flight' && 
               (item.place?.formatted_address || item.location?.address) && (
                <div className="flex items-start mb-2">
                  <MapPinIcon className="h-4 w-4 text-gray-500 mr-1 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-600 text-left">
                    {item.place?.formatted_address || item.location?.address}
                  </p>
                </div>
              )}
              
              {/* Google Rating and Place Types - Only for non-flight items */}
              {item.place && item.type !== 'flight' && (
                <div className="mt-2 space-y-1">
                  {/* Google Rating */}
                  {item.place.rating && (
                    <div className="flex items-center space-x-1">
                      <StarIcon className="h-3 w-3 text-yellow-400 fill-current flex-shrink-0" />
                      <span className="text-sm text-gray-600">
                        {item.place.rating.toFixed(1)} Google
                      </span>
                      {item.place.user_ratings_total && item.place.user_ratings_total > 0 && (
                        <span className="text-sm text-gray-400">
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
                          className="inline-block px-1.5 py-0.5 text-sm bg-blue-50 text-blue-600 rounded text-left"
                        >
                          {type.replace(/_/g, ' ')}
                        </span>
                      ))}
                      {item.place.types.length > 2 && (
                        <span className="inline-block px-1.5 py-0.5 text-sm bg-gray-100 text-gray-500 rounded">
                          +{item.place.types.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {/* Notes Display */}
              {item.notes && (
                <div className="mt-2 p-2 bg-gray-50 rounded text-left">
                  <div className="text-xs text-gray-500 mb-1">Notes:</div>
                  <div className="text-xs text-gray-700 whitespace-pre-wrap">
                    {convertLinksToHyperlinks(item.notes)}
                  </div>
                </div>
              )}
              
              {item.duration && item.type !== 'accommodation' && (
                <p className="text-xs text-gray-400 mt-1 text-left">
                  Duration: {formatDuration(item.duration)}
                </p>
              )}
              
              {/* User Wish Level - Only for non-flight items */}
              {item.type !== 'flight' && (
                <div className="mt-2" onMouseDown={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Wish Level:</span>
                    <div className="flex items-center space-x-0.5" style={{ pointerEvents: 'auto' }}>
                      {renderRatingStars()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <button
          onClick={() => onRemove(item.id)}
          className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 transition-colors"
          title="Remove from itinerary"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
      
      {isDragging && (
        <div className="mt-2 text-xs text-blue-600 font-medium text-center">
          🔄 Drop on another day to move
        </div>
      )}
    </div>
  );
};

export default DraggableItineraryItem;

import React, { useState } from 'react';
import { useDrag } from 'react-dnd';
import { ClockIcon, TrashIcon, PencilIcon, CheckIcon, XMarkIcon, HeartIcon, StarIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { ItineraryItem } from '../types';

interface DraggableItineraryItemProps {
  item: ItineraryItem;
  onRemove: (itemId: string) => void;
  onUpdate?: (itemId: string, updates: Partial<ItineraryItem>) => void;
}

const DraggableItineraryItem: React.FC<DraggableItineraryItemProps> = ({
  item,
  onRemove,
  onUpdate
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTime, setEditTime] = useState(item.time);
  const [editDuration, setEditDuration] = useState(item.duration || 60);
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
    const options = [];
    // Add common durations
    const commonDurations = [15, 30, 45, 60, 90, 120, 180, 240, 300, 360, 480];
    for (const duration of commonDurations) {
      options.push({
        value: duration,
        label: formatDuration(duration)
      });
    }
    return options;
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
  };

  const handleEditSave = () => {
    if (onUpdate) {
      const updateData: any = {
        time: editTime
      };
      
      // Only update duration for non-accommodation items
      if (item.type !== 'accommodation') {
        updateData.duration = editDuration;
      }
      
      onUpdate(item.id, updateData);
    }
    setIsEditing(false);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditTime(item.time);
    setEditDuration(item.duration || 60);
  };

  const handleRatingClick = (rating: number) => {
    console.log('❤️ Heart clicked:', rating, 'for item:', item.title);
    console.log('📊 Current item.userRating:', item.userRating);
    
    // Clear hover state
    setHoveredHeart(null);
    
    // Call parent update function to save to database
    if (onUpdate) {
      console.log('💾 Saving to database via onUpdate');
      onUpdate(item.id, { userRating: rating });
    }
  };

  const renderRatingStars = () => {
    const hearts = [];
    // Use item.userRating directly since it's the source of truth from the database
    const displayRating = item.userRating || 0;
    
    console.log('🎨 Rendering hearts:', {
      itemUserRating: item.userRating,
      displayRating,
      hoveredHeart,
      itemTitle: item.title
    });
    
    for (let i = 1; i <= 5; i++) {
      const isFilled = i <= (hoveredHeart || displayRating);
      console.log(`💖 Heart ${i}: isFilled=${isFilled}, condition: ${i} <= ${hoveredHeart || displayRating}`);
      
      hearts.push(
        <button
          key={i}
          onClick={(e) => {
            console.log('🖱️ Heart button clicked:', i);
            e.preventDefault();
            e.stopPropagation();
            handleRatingClick(i);
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          onMouseEnter={() => {
            console.log('🖱️ Mouse enter heart:', i);
            setHoveredHeart(i);
          }}
          onMouseLeave={() => {
            console.log('🖱️ Mouse leave heart');
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
      className={`bg-white border border-gray-200 rounded-lg p-3 shadow-sm transition-all duration-200 ${
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
                    onChange={(e) => setEditDuration(parseInt(e.target.value))}
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
              <div className="flex items-center space-x-2 mb-1">
                <ClockIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-900">
                  {item.time}
                </span>
                <button
                  onClick={handleEditStart}
                  className="p-1 text-gray-400 hover:text-blue-500 transition-colors flex-shrink-0"
                  title="Edit time"
                >
                  <PencilIcon className="h-3 w-3" />
                </button>
              </div>
              <h4 className="text-sm font-medium text-gray-900 mb-1 break-words text-left">
                {item.title}
              </h4>
              {item.description && (
                <p className="text-xs text-gray-500 break-words line-clamp-2 text-left">
                  {item.description}
                </p>
              )}
              
              {/* Google Rating and Place Types */}
              {item.place && (
                <div className="mt-2 space-y-1">
                  {/* Google Rating */}
                  {item.place.rating && (
                    <div className="flex items-center space-x-1">
                      <StarIcon className="h-3 w-3 text-yellow-400 fill-current flex-shrink-0" />
                      <span className="text-xs text-gray-600">
                        {item.place.rating.toFixed(1)} Google
                      </span>
                      {item.place.user_ratings_total && (
                        <span className="text-xs text-gray-400">
                          ({item.place.user_ratings_total} reviews)
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
              
              {item.duration && item.type !== 'accommodation' && (
                <p className="text-xs text-gray-400 mt-1 text-left">
                  Duration: {formatDuration(item.duration)}
                </p>
              )}
              
              {/* User Wish Level */}
              <div className="mt-2" onMouseDown={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Wish Level:</span>
                  <div className="flex items-center space-x-0.5" style={{ pointerEvents: 'auto' }}>
                    {renderRatingStars()}
                  </div>
                </div>
              </div>
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

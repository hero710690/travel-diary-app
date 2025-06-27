import React from 'react';
import { useDrag } from 'react-dnd';
import { MapPinIcon, StarIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface Place {
  place_id: string;
  name: string;
  formatted_address: string;
  rating?: number;
  types?: string[];
}

interface DraggablePlaceProps {
  place: Place;
  onRemove: () => void;
}

const DraggablePlace: React.FC<DraggablePlaceProps> = ({ place, onRemove }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'place',
    item: place,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const getPlaceIcon = (types?: string[]) => {
    if (!types) return '📍';
    
    if (types.includes('restaurant') || types.includes('food')) {
      return '🍽️';
    }
    if (types.includes('tourist_attraction') || types.includes('museum')) {
      return '🏛️';
    }
    if (types.includes('lodging')) {
      return '🏨';
    }
    if (types.includes('shopping_mall') || types.includes('store')) {
      return '🛍️';
    }
    if (types.includes('park')) {
      return '🌳';
    }
    if (types.includes('church') || types.includes('place_of_worship')) {
      return '⛪';
    }
    return '📍';
  };

  const placeIcon = getPlaceIcon(place.types);

  return (
    <div
      ref={drag}
      className={`p-3 border rounded-lg cursor-move transition-all duration-200 ${
        isDragging 
          ? 'opacity-50 border-blue-400 bg-blue-50 shadow-lg transform scale-105' 
          : 'border-gray-200 hover:border-blue-300 hover:shadow-md bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start space-x-3 flex-1 min-w-0">
          <div className="text-lg flex-shrink-0">
            {placeIcon}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <h4 className="text-sm font-medium text-gray-900 break-words line-clamp-2 text-left">
              {place.name}
            </h4>
            <p className="text-xs text-gray-500 break-words line-clamp-2 mt-1 text-left">
              {place.formatted_address}
            </p>
            {place.rating && (
              <div className="flex items-center mt-2 justify-start">
                <StarIcon className="h-3 w-3 text-yellow-400 fill-current flex-shrink-0" />
                <span className="text-xs text-gray-600 ml-1 text-left">
                  {place.rating.toFixed(1)}
                </span>
              </div>
            )}
            {place.types && place.types.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2 justify-start">
                {place.types.slice(0, 2).map((type) => (
                  <span
                    key={type}
                    className="inline-block px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded break-words text-left"
                  >
                    {type.replace(/_/g, ' ')}
                  </span>
                ))}
                {place.types.length > 2 && (
                  <span className="inline-block px-1.5 py-0.5 text-xs bg-gray-200 text-gray-500 rounded text-left">
                    +{place.types.length - 2}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <button
          onClick={onRemove}
          className="p-1 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
          title="Remove from wishlist"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
      
      {isDragging && (
        <div className="mt-2 text-xs text-blue-600 font-medium text-center">
          🎯 Drop on a day to add to itinerary
        </div>
      )}
    </div>
  );
};

export default DraggablePlace;

import React from 'react';
import { 
  ClockIcon, 
  MapPinIcon,
  StarIcon,
  PencilIcon,
  TrashIcon,
  HomeIcon
} from '@heroicons/react/24/outline';

interface HotelInfo {
  name: string;
  address: string;
  checkInDate: string;
  checkOutDate: string;
  roomType?: string;
  confirmationNumber?: string;
  rating?: number;
  user_ratings_total?: number;
  notes?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

interface HotelCardProps {
  hotelInfo: HotelInfo;
  time: string;
  isCheckIn?: boolean;
  isCheckOut?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

const HotelCard: React.FC<HotelCardProps> = ({ 
  hotelInfo, 
  time, 
  isCheckIn = false,
  isCheckOut = false,
  onEdit, 
  onDelete, 
  className = '' 
}) => {
  const getActionType = () => {
    if (isCheckIn) return 'Check-in';
    if (isCheckOut) return 'Check-out';
    return 'Stay';
  };

  const getActionColor = () => {
    if (isCheckIn) return 'bg-green-100 text-green-800';
    if (isCheckOut) return 'bg-orange-100 text-orange-800';
    return 'bg-blue-100 text-blue-800';
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <HomeIcon className="h-5 w-5 text-blue-600 flex-shrink-0" />
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-semibold text-gray-900 text-left">{hotelInfo.name}</h3>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getActionColor()}`}>
              {getActionType()}
            </span>
          </div>
        </div>
        
        {/* Time Display */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          <span className="text-sm text-gray-500 flex items-center whitespace-nowrap">
            <ClockIcon className="h-4 w-4 mr-1" />
            {time}
          </span>
        </div>
      </div>

      {/* Hotel Details */}
      <div className="space-y-2">
        {/* Address */}
        <div className="flex items-start space-x-2">
          <MapPinIcon className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
          <span className="text-sm text-gray-600 text-left">{hotelInfo.address}</span>
        </div>

        {/* Rating */}
        {hotelInfo.rating && (
          <div className="flex items-center space-x-2">
            <StarIcon className="h-4 w-4 text-yellow-400 fill-current flex-shrink-0" />
            <span className="text-sm text-gray-600">
              {hotelInfo.rating.toFixed(1)} Google
              {hotelInfo.user_ratings_total && hotelInfo.user_ratings_total > 0 && (
                <span className="text-gray-400 ml-1">
                  ({hotelInfo.user_ratings_total.toLocaleString()} reviews)
                </span>
              )}
            </span>
          </div>
        )}

        {/* Room Type */}
        {hotelInfo.roomType && (
          <div className="text-sm text-gray-600 text-left">
            <span className="font-medium">Room:</span> {hotelInfo.roomType}
          </div>
        )}

        {/* Confirmation Number */}
        {hotelInfo.confirmationNumber && (
          <div className="text-sm text-gray-600 text-left">
            <span className="font-medium">Confirmation:</span> {hotelInfo.confirmationNumber}
          </div>
        )}

        {/* Notes */}
        {hotelInfo.notes && (
          <div className="text-sm text-gray-500 italic text-left">
            <span className="font-medium not-italic">Note:</span> {hotelInfo.notes}
          </div>
        )}
      </div>

      {/* Actions */}
      {(onEdit || onDelete) && (
        <div className="flex justify-end space-x-2 mt-3 pt-3 border-t border-gray-100">
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
              title="Edit Hotel"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
              title="Delete Hotel"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default HotelCard;

import React, { useState } from 'react';
import { 
  BuildingOfficeIcon,
  MapPinIcon,
  PhoneIcon,
  StarIcon,
  CalendarIcon,
  ClockIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { HotelInfo } from '../types';

interface HotelCardProps {
  hotelInfo: HotelInfo;
  dayNumber: number;
  isFirstDay?: boolean;
  isLastDay?: boolean;
  onEdit?: (hotelInfo: HotelInfo) => void;
  onRemove?: () => void;
  className?: string;
}

const HotelCard: React.FC<HotelCardProps> = ({
  hotelInfo,
  dayNumber,
  isFirstDay = false,
  isLastDay = false,
  onEdit,
  onRemove,
  className = ''
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<HotelInfo>(hotelInfo);

  const handleSave = () => {
    if (onEdit) {
      onEdit(editForm);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditForm(hotelInfo);
    setIsEditing(false);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <StarIcon
        key={i}
        className={`h-4 w-4 ${
          i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  const getStayStatus = () => {
    if (isFirstDay && isLastDay) {
      return 'Check-in & Check-out';
    } else if (isFirstDay) {
      return 'Check-in';
    } else if (isLastDay) {
      return 'Check-out';
    } else {
      return `Night ${dayNumber - 1} of ${hotelInfo.nights}`;
    }
  };

  if (isEditing) {
    return (
      <div className={`bg-white border border-blue-200 rounded-lg p-4 shadow-sm ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <BuildingOfficeIcon className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Edit Hotel Stay</h3>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleSave}
              className="p-1 text-green-600 hover:text-green-800"
            >
              <CheckIcon className="h-4 w-4" />
            </button>
            <button
              onClick={handleCancel}
              className="p-1 text-gray-600 hover:text-gray-800"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 text-left mb-1">
              Hotel Name
            </label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 text-left mb-1">
              Address
            </label>
            <input
              type="text"
              value={editForm.address}
              onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 text-left mb-1">
                Check-in Date
              </label>
              <input
                type="date"
                value={editForm.checkInDate}
                onChange={(e) => setEditForm({ ...editForm, checkInDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 text-left mb-1">
                Check-out Date
              </label>
              <input
                type="date"
                value={editForm.checkOutDate}
                onChange={(e) => setEditForm({ ...editForm, checkOutDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 text-left mb-1">
                Room Type
              </label>
              <input
                type="text"
                value={editForm.roomType || ''}
                onChange={(e) => setEditForm({ ...editForm, roomType: e.target.value })}
                placeholder="e.g., Deluxe Room"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 text-left mb-1">
                Confirmation #
              </label>
              <input
                type="text"
                value={editForm.confirmationNumber || ''}
                onChange={(e) => setEditForm({ ...editForm, confirmationNumber: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-sm ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-2">
            <BuildingOfficeIcon className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">{hotelInfo.name}</h3>
            {hotelInfo.rating && (
              <div className="flex items-center ml-2">
                {renderStars(hotelInfo.rating)}
              </div>
            )}
          </div>

          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center">
              <MapPinIcon className="h-4 w-4 mr-2" />
              <span>{hotelInfo.address}</span>
            </div>

            <div className="flex items-center">
              <CalendarIcon className="h-4 w-4 mr-2" />
              <span>
                {formatDate(hotelInfo.checkInDate)} - {formatDate(hotelInfo.checkOutDate)}
                {' '}({hotelInfo.nights} night{hotelInfo.nights !== 1 ? 's' : ''})
              </span>
            </div>

            {hotelInfo.roomType && (
              <div className="flex items-center">
                <ClockIcon className="h-4 w-4 mr-2" />
                <span>{hotelInfo.roomType}</span>
              </div>
            )}

            {hotelInfo.phone && (
              <div className="flex items-center">
                <PhoneIcon className="h-4 w-4 mr-2" />
                <span>{hotelInfo.phone}</span>
              </div>
            )}

            {hotelInfo.confirmationNumber && (
              <div className="text-xs text-gray-500">
                Confirmation: {hotelInfo.confirmationNumber}
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center">
              <span className={`px-2 py-1 text-xs rounded-full ${
                isFirstDay 
                  ? 'bg-green-100 text-green-800' 
                  : isLastDay 
                  ? 'bg-red-100 text-red-800'
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {getStayStatus()}
              </span>
            </div>

            {hotelInfo.totalPrice && (
              <div className="text-sm font-medium text-gray-900">
                ${hotelInfo.totalPrice}
                {hotelInfo.pricePerNight && (
                  <span className="text-xs text-gray-500 ml-1">
                    (${hotelInfo.pricePerNight}/night)
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex space-x-1 ml-4">
          {onEdit && (
            <button
              onClick={() => setIsEditing(true)}
              className="p-1 text-gray-400 hover:text-blue-600"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
          )}
          {onRemove && (
            <button
              onClick={onRemove}
              className="p-1 text-gray-400 hover:text-red-600"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default HotelCard;

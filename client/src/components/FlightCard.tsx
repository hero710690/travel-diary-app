import React from 'react';
import { 
  PaperAirplaneIcon, 
  ClockIcon, 
  MapPinIcon,
  InformationCircleIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { FlightInfo } from '../types';

interface FlightCardProps {
  flightInfo: FlightInfo;
  time: string;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

const FlightCard: React.FC<FlightCardProps> = ({ 
  flightInfo, 
  time, 
  onEdit, 
  onDelete, 
  className = '' 
}) => {
  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    
    // If the time is already formatted (contains AM/PM), return as-is
    if (timeString.includes('AM') || timeString.includes('PM')) {
      return timeString;
    }
    
    // Handle raw time formats
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

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          <PaperAirplaneIcon className="h-5 w-5 text-blue-600 flex-shrink-0" />
          <span className="text-lg font-semibold text-gray-900 truncate text-left">
            {flightInfo.airline} {flightInfo.flightNumber}
          </span>
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0">
          <span className="text-sm text-gray-500 flex items-center whitespace-nowrap">
            <ClockIcon className="h-4 w-4 mr-1" />
            {formatTime(time)}
          </span>
        </div>
      </div>

      {/* Flight Route */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex-1 min-w-0 text-left">
          <div className="text-sm font-medium text-gray-900 text-center">
            {flightInfo.departure.airportCode}
          </div>
          <div className="text-xs text-gray-500 break-words text-left">
            {flightInfo.departure.airport}
          </div>
          <div className="text-xs text-gray-600 text-center">
            Dep: {formatTime(flightInfo.departure.time)}
          </div>
          {flightInfo.departure.terminal && (
            <div className="text-xs text-gray-500 break-words text-left">
              Terminal {flightInfo.departure.terminal}
              {flightInfo.departure.gate && `, Gate ${flightInfo.departure.gate}`}
            </div>
          )}
        </div>

        <div className="flex-shrink-0 mx-2 sm:mx-4">
          <div className="flex items-center">
            <div className="h-px bg-gray-300 w-4 sm:w-8"></div>
            <PaperAirplaneIcon className="h-4 w-4 text-gray-400 mx-1 sm:mx-2" />
            <div className="h-px bg-gray-300 w-4 sm:w-8"></div>
          </div>
          {flightInfo.duration && (
            <div className="text-xs text-gray-500 text-center mt-1 whitespace-nowrap">
              {flightInfo.duration}
            </div>
          )}
        </div>

        <div className="flex-1 text-left min-w-0">
          <div className="text-sm font-medium text-gray-900 text-center">
            {flightInfo.arrival.airportCode}
          </div>
          <div className="text-xs text-gray-500 break-words text-left">
            {flightInfo.arrival.airport}
          </div>
          <div className="text-xs text-gray-600 text-center">
            Arr: {formatTime(flightInfo.arrival.time)}
          </div>
          {flightInfo.arrival.terminal && (
            <div className="text-xs text-gray-500 break-words text-left">
              Terminal {flightInfo.arrival.terminal}
              {flightInfo.arrival.gate && `, Gate ${flightInfo.arrival.gate}`}
            </div>
          )}
        </div>
      </div>

      {/* Additional Info */}
      {(flightInfo.seatNumber || flightInfo.bookingReference || flightInfo.aircraft) && (
        <div className="border-t border-gray-100 pt-3 mt-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600 text-left">
            {flightInfo.seatNumber && (
              <span className="whitespace-nowrap text-left">Seat: {flightInfo.seatNumber}</span>
            )}
            {flightInfo.aircraft && (
              <span className="break-words text-left">Aircraft: {flightInfo.aircraft}</span>
            )}
            {flightInfo.bookingReference && (
              <span className="break-words text-left">Ref: {flightInfo.bookingReference}</span>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      {(onEdit || onDelete) && (
        <div className="flex justify-end space-x-2 mt-3 pt-3 border-t border-gray-100">
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
              title="Edit Flight"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
              title="Remove Flight"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default FlightCard;

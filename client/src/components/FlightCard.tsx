import React from 'react';
import { 
  PaperAirplaneIcon, 
  ClockIcon, 
  MapPinIcon,
  InformationCircleIcon
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
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'delayed':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'boarding':
        return 'bg-green-100 text-green-800';
      case 'departed':
        return 'bg-purple-100 text-purple-800';
      case 'arrived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const formatTime = (timeString: string) => {
    try {
      const time = new Date(`2000-01-01T${timeString}`);
      return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return timeString;
    }
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          <PaperAirplaneIcon className="h-5 w-5 text-blue-600 flex-shrink-0" />
          <span className="font-semibold text-gray-900 truncate">
            {flightInfo.airline} {flightInfo.flightNumber}
          </span>
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0">
          {flightInfo.status && (
            <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(flightInfo.status)}`}>
              {flightInfo.status.charAt(0).toUpperCase() + flightInfo.status.slice(1)}
            </span>
          )}
          <span className="text-sm text-gray-500 flex items-center whitespace-nowrap">
            <ClockIcon className="h-4 w-4 mr-1" />
            {formatTime(time)}
          </span>
        </div>
      </div>

      {/* Flight Route */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900">
            {flightInfo.departure.airportCode}
          </div>
          <div className="text-xs text-gray-500 break-words">
            {flightInfo.departure.airport}
          </div>
          <div className="text-xs text-gray-600">
            Dep: {formatTime(flightInfo.departure.time)}
          </div>
          {flightInfo.departure.terminal && (
            <div className="text-xs text-gray-500 break-words">
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

        <div className="flex-1 text-right min-w-0">
          <div className="text-sm font-medium text-gray-900">
            {flightInfo.arrival.airportCode}
          </div>
          <div className="text-xs text-gray-500 break-words">
            {flightInfo.arrival.airport}
          </div>
          <div className="text-xs text-gray-600">
            Arr: {formatTime(flightInfo.arrival.time)}
          </div>
          {flightInfo.arrival.terminal && (
            <div className="text-xs text-gray-500 break-words">
              Terminal {flightInfo.arrival.terminal}
              {flightInfo.arrival.gate && `, Gate ${flightInfo.arrival.gate}`}
            </div>
          )}
        </div>
      </div>

      {/* Additional Info */}
      {(flightInfo.seatNumber || flightInfo.bookingReference || flightInfo.aircraft) && (
        <div className="border-t border-gray-100 pt-3 mt-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
            {flightInfo.seatNumber && (
              <span className="whitespace-nowrap">Seat: {flightInfo.seatNumber}</span>
            )}
            {flightInfo.aircraft && (
              <span className="break-words">Aircraft: {flightInfo.aircraft}</span>
            )}
            {flightInfo.bookingReference && (
              <span className="break-words">Ref: {flightInfo.bookingReference}</span>
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
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="text-xs text-red-600 hover:text-red-800 font-medium"
            >
              Remove
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default FlightCard;

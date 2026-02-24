import React from 'react';
import { 
  ClockIcon, 
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { TrainInfo } from '../types';

// Train icon SVG component to match BusCard style
const TrainIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125v-9.75m-17.25 0h18m0 0V3.375c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M6.75 12h10.5" />
  </svg>
);

interface TrainCardProps {
  trainInfo: TrainInfo;
  time: string;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
  notes?: string;
}

const TrainCard: React.FC<TrainCardProps> = ({ 
  trainInfo, 
  time, 
  onEdit, 
  onDelete, 
  className = '',
  notes
}) => {
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    if (timeString.includes('AM') || timeString.includes('PM')) return timeString;
    
    try {
      if (timeString.includes(':')) {
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours, 10);
        const min = minutes.padStart(2, '0');
        
        if (hour === 0) return `12:${min} AM`;
        if (hour < 12) return `${hour}:${min} AM`;
        if (hour === 12) return `12:${min} PM`;
        return `${hour - 12}:${min} PM`;
      }
      const hour = parseInt(timeString, 10);
      if (hour === 0) return '12:00 AM';
      if (hour < 12) return `${hour}:00 AM`;
      if (hour === 12) return '12:00 PM';
      return `${hour - 12}:00 PM`;
    } catch {
      return timeString;
    }
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow ${className}`}>
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          <TrainIcon className="h-5 w-5 text-purple-600 flex-shrink-0" />
          <span className="text-lg font-semibold text-gray-900 truncate text-left">
            {trainInfo.company} {trainInfo.trainNumber}
          </span>
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0">
          <span className="text-sm text-gray-500 flex items-center whitespace-nowrap">
            <ClockIcon className="h-4 w-4 mr-1" />
            {formatTime(time)}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex-1 min-w-0 text-center">
          <div className="text-sm font-medium text-gray-900">
            {trainInfo.departure.city}
          </div>
          <div className="text-xs text-gray-500 break-words">
            {trainInfo.departure.station}
          </div>
          {trainInfo.departure.date && (
            <div className="text-xs text-gray-600 font-medium">
              {formatDate(trainInfo.departure.date)}
            </div>
          )}
          <div className="text-xs text-gray-600">
            Dep: {formatTime(trainInfo.departure.time)}
          </div>
          {trainInfo.departure.platform && (
            <div className="text-xs text-gray-500 break-words">
              Platform {trainInfo.departure.platform}
            </div>
          )}
        </div>

        <div className="flex-shrink-0 mx-2 sm:mx-4">
          <div className="flex items-center">
            <div className="h-px bg-gray-300 w-4 sm:w-8"></div>
            <TrainIcon className="h-4 w-4 text-gray-400 mx-1 sm:mx-2" />
            <div className="h-px bg-gray-300 w-4 sm:w-8"></div>
          </div>
          {trainInfo.duration && (
            <div className="text-xs text-gray-500 text-center mt-1 whitespace-nowrap">
              {trainInfo.duration}
            </div>
          )}
        </div>

        <div className="flex-1 text-center min-w-0">
          <div className="text-sm font-medium text-gray-900">
            {trainInfo.arrival.city}
          </div>
          <div className="text-xs text-gray-500 break-words">
            {trainInfo.arrival.station}
          </div>
          {trainInfo.arrival.date && (
            <div className="text-xs text-gray-600 font-medium">
              {formatDate(trainInfo.arrival.date)}
            </div>
          )}
          <div className="text-xs text-gray-600">
            Arr: {formatTime(trainInfo.arrival.time)}
          </div>
          {trainInfo.arrival.platform && (
            <div className="text-xs text-gray-500 break-words">
              Platform {trainInfo.arrival.platform}
            </div>
          )}
        </div>
      </div>

      {(trainInfo.seatNumber || trainInfo.bookingReference || trainInfo.trainType || trainInfo.carNumber || notes) && (
        <div className="border-t border-gray-100 pt-3 mt-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600 text-left">
            {trainInfo.trainType && (
              <span className="break-words text-left">Type: {trainInfo.trainType}</span>
            )}
            {trainInfo.carNumber && (
              <span className="whitespace-nowrap text-left">Car: {trainInfo.carNumber}</span>
            )}
            {trainInfo.seatNumber && (
              <span className="whitespace-nowrap text-left">Seat: {trainInfo.seatNumber}</span>
            )}
            {trainInfo.bookingReference && (
              <span className="break-words text-left">Ref: {trainInfo.bookingReference}</span>
            )}
          </div>
          {notes && (
            <div className="mt-2 text-xs text-gray-600 text-left">
              <span className="font-medium">Notes:</span> {notes}
            </div>
          )}
        </div>
      )}

      {(onEdit || onDelete) && (
        <div className="flex justify-end space-x-2 mt-3 pt-3 border-t border-gray-100">
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
              title="Edit Train"
              type="button"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
              title="Remove Train"
              type="button"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default TrainCard;

import React, { useState } from 'react';
import { useDrag } from 'react-dnd';
import { ClockIcon, TrashIcon, PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
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
      onUpdate(item.id, {
        time: editTime,
        duration: editDuration
      });
    }
    setIsEditing(false);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditTime(item.time);
    setEditDuration(item.duration || 60);
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
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">Duration:</span>
                <input
                  type="number"
                  value={editDuration}
                  onChange={(e) => setEditDuration(parseInt(e.target.value) || 60)}
                  min="15"
                  max="480"
                  step="15"
                  className="text-xs border border-gray-300 rounded px-2 py-1 w-16 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-500">min</span>
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
              <h4 className="text-sm font-medium text-gray-900 mb-1 break-words">
                {item.title}
              </h4>
              {item.description && (
                <p className="text-xs text-gray-500 break-words line-clamp-2">
                  {item.description}
                </p>
              )}
              {item.duration && (
                <p className="text-xs text-gray-400 mt-1">
                  Duration: {item.duration} minutes
                </p>
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

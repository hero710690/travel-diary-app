import React, { useState } from 'react';
import { FlightInfo } from '../types';
import { 
  PaperAirplaneIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface FlightFormProps {
  initialData?: Partial<FlightInfo>;
  onSave: (flightInfo: FlightInfo) => void;
  onCancel: () => void;
  tripStartDate?: string;
  tripEndDate?: string;
}

const FlightForm: React.FC<FlightFormProps> = ({ 
  initialData, 
  onSave, 
  onCancel, 
  tripStartDate, 
  tripEndDate 
}) => {
  const [formData, setFormData] = useState<FlightInfo>({
    airline: initialData?.airline || '',
    flightNumber: initialData?.flightNumber || '',
    departure: {
      airport: initialData?.departure?.airport || '',
      airportCode: initialData?.departure?.airportCode || '',
      date: initialData?.departure?.date || tripStartDate?.split('T')[0] || '',
      time: initialData?.departure?.time || '',
      terminal: initialData?.departure?.terminal || '',
      gate: initialData?.departure?.gate || '',
    },
    arrival: {
      airport: initialData?.arrival?.airport || '',
      airportCode: initialData?.arrival?.airportCode || '',
      date: initialData?.arrival?.date || tripStartDate?.split('T')[0] || '',
      time: initialData?.arrival?.time || '',
      terminal: initialData?.arrival?.terminal || '',
      gate: initialData?.arrival?.gate || '',
    },
    duration: initialData?.duration || '',
    aircraft: initialData?.aircraft || '',
    seatNumber: initialData?.seatNumber || '',
    bookingReference: initialData?.bookingReference || '',
    status: initialData?.status || 'scheduled',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.airline || !formData.flightNumber || 
        !formData.departure.airportCode || !formData.arrival.airportCode ||
        !formData.departure.date || !formData.arrival.date ||
        !formData.departure.time || !formData.arrival.time) {
      alert('Please fill in all required fields');
      return;
    }

    onSave(formData);
  };

  const updateField = (field: string, value: string) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev as any)[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <PaperAirplaneIcon className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              {initialData ? 'Edit Flight' : 'Add Flight'}
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Flight Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
                Airline *
              </label>
              <input
                type="text"
                value={formData.airline}
                onChange={(e) => updateField('airline', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., American Airlines"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
                Flight Number *
              </label>
              <input
                type="text"
                value={formData.flightNumber}
                onChange={(e) => updateField('flightNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., AA123"
                required
              />
            </div>
          </div>

          {/* Departure Info */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-3 text-left">Departure</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
                  Airport Code *
                </label>
                <input
                  type="text"
                  value={formData.departure.airportCode}
                  onChange={(e) => updateField('departure.airportCode', e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., JFK"
                  maxLength={3}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
                  Departure Date *
                </label>
                <input
                  type="date"
                  value={formData.departure.date}
                  onChange={(e) => updateField('departure.date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min={tripStartDate?.split('T')[0]}
                  max={tripEndDate?.split('T')[0]}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
                  Departure Time *
                </label>
                <input
                  type="time"
                  value={formData.departure.time}
                  onChange={(e) => updateField('departure.time', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
                  Airport Name
                </label>
                <input
                  type="text"
                  value={formData.departure.airport}
                  onChange={(e) => updateField('departure.airport', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., John F. Kennedy International Airport"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
                  Terminal
                </label>
                <input
                  type="text"
                  value={formData.departure.terminal}
                  onChange={(e) => updateField('departure.terminal', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
                  Gate
                </label>
                <input
                  type="text"
                  value={formData.departure.gate}
                  onChange={(e) => updateField('departure.gate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., A12"
                />
              </div>
            </div>
          </div>

          {/* Arrival Info */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-3 text-left">Arrival</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
                  Airport Code *
                </label>
                <input
                  type="text"
                  value={formData.arrival.airportCode}
                  onChange={(e) => updateField('arrival.airportCode', e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., LAX"
                  maxLength={3}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
                  Arrival Date *
                </label>
                <input
                  type="date"
                  value={formData.arrival.date}
                  onChange={(e) => updateField('arrival.date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min={tripStartDate?.split('T')[0]}
                  max={tripEndDate?.split('T')[0]}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
                  Arrival Time *
                </label>
                <input
                  type="time"
                  value={formData.arrival.time}
                  onChange={(e) => updateField('arrival.time', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
                  Airport Name
                </label>
                <input
                  type="text"
                  value={formData.arrival.airport}
                  onChange={(e) => updateField('arrival.airport', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Los Angeles International Airport"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
                  Terminal
                </label>
                <input
                  type="text"
                  value={formData.arrival.terminal}
                  onChange={(e) => updateField('arrival.terminal', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
                  Gate
                </label>
                <input
                  type="text"
                  value={formData.arrival.gate}
                  onChange={(e) => updateField('arrival.gate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., B15"
                />
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
                Duration
              </label>
              <input
                type="text"
                value={formData.duration}
                onChange={(e) => updateField('duration', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 2h 30m"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => updateField('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="scheduled">Scheduled</option>
                <option value="delayed">Delayed</option>
                <option value="cancelled">Cancelled</option>
                <option value="boarding">Boarding</option>
                <option value="departed">Departed</option>
                <option value="arrived">Arrived</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
                Seat Number
              </label>
              <input
                type="text"
                value={formData.seatNumber}
                onChange={(e) => updateField('seatNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 12A"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
                Aircraft
              </label>
              <input
                type="text"
                value={formData.aircraft}
                onChange={(e) => updateField('aircraft', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Boeing 737"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
                Booking Reference
              </label>
              <input
                type="text"
                value={formData.bookingReference}
                onChange={(e) => updateField('bookingReference', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., ABC123"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {initialData ? 'Update Flight' : 'Add Flight'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FlightForm;

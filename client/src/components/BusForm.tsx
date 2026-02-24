import React, { useState } from 'react';
import { BusInfo } from '../types';
import { 
  TruckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface BusFormProps {
  initialData?: Partial<BusInfo>;
  onSave: (busInfo: BusInfo, notes?: string) => void;
  onCancel: () => void;
  tripStartDate?: string;
  tripEndDate?: string;
  initialNotes?: string;
}

const BusForm: React.FC<BusFormProps> = ({ 
  initialData, 
  onSave, 
  onCancel, 
  tripStartDate, 
  tripEndDate,
  initialNotes
}) => {
  const [formData, setFormData] = useState<BusInfo>({
    company: initialData?.company || '',
    busNumber: initialData?.busNumber || '',
    departure: {
      station: initialData?.departure?.station || '',
      city: initialData?.departure?.city || '',
      date: initialData?.departure?.date || tripStartDate?.split('T')[0] || '',
      time: initialData?.departure?.time || '',
      platform: initialData?.departure?.platform || '',
    },
    arrival: {
      station: initialData?.arrival?.station || '',
      city: initialData?.arrival?.city || '',
      date: initialData?.arrival?.date || tripStartDate?.split('T')[0] || '',
      time: initialData?.arrival?.time || '',
      platform: initialData?.arrival?.platform || '',
    },
    duration: initialData?.duration || '',
    busType: initialData?.busType || '',
    seatNumber: initialData?.seatNumber || '',
    bookingReference: initialData?.bookingReference || '',
    status: initialData?.status || 'scheduled',
  });

  const [notes, setNotes] = useState(initialNotes || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🚌 BusForm handleSubmit called with formData:', formData);
    
    // Validate required fields
    if (!formData.company || !formData.busNumber || 
        !formData.departure.city || !formData.arrival.city ||
        !formData.departure.date || !formData.arrival.date ||
        !formData.departure.time || !formData.arrival.time) {
      console.error('🚌 BusForm validation failed - missing required fields:', {
        company: formData.company,
        busNumber: formData.busNumber,
        departureCity: formData.departure.city,
        arrivalCity: formData.arrival.city,
        departureDate: formData.departure.date,
        arrivalDate: formData.arrival.date,
        departureTime: formData.departure.time,
        arrivalTime: formData.arrival.time
      });
      alert('Please fill in all required fields');
      return;
    }

    console.log('🚌 BusForm calling onSave with:', formData);
    onSave(formData, notes);
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
            <TruckIcon className="h-6 w-6 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              {initialData ? 'Edit Bus' : 'Add Bus'}
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
          {/* Basic Bus Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
                Bus Company *
              </label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => updateField('company', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Greyhound"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
                Bus Number *
              </label>
              <input
                type="text"
                value={formData.busNumber}
                onChange={(e) => updateField('busNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 1234"
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
                  City *
                </label>
                <input
                  type="text"
                  value={formData.departure.city}
                  onChange={(e) => updateField('departure.city', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., New York"
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
                  Bus Station
                </label>
                <input
                  type="text"
                  value={formData.departure.station}
                  onChange={(e) => updateField('departure.station', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Port Authority Bus Terminal"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
                  Platform
                </label>
                <input
                  type="text"
                  value={formData.departure.platform}
                  onChange={(e) => updateField('departure.platform', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 12"
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
                  City *
                </label>
                <input
                  type="text"
                  value={formData.arrival.city}
                  onChange={(e) => updateField('arrival.city', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Boston"
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
                  Bus Station
                </label>
                <input
                  type="text"
                  value={formData.arrival.station}
                  onChange={(e) => updateField('arrival.station', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., South Station Bus Terminal"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
                  Platform
                </label>
                <input
                  type="text"
                  value={formData.arrival.platform}
                  onChange={(e) => updateField('arrival.platform', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 5"
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
                placeholder="e.g., 4h 30m"
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
                Bus Type
              </label>
              <input
                type="text"
                value={formData.busType}
                onChange={(e) => updateField('busType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Express, Luxury"
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

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Additional notes or booking information..."
            />
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
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              {initialData ? 'Update Bus' : 'Add Bus'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BusForm;
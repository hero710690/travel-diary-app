import React, { useState, useEffect } from 'react';
import { TrainInfo } from '../types';

interface TrainFormProps {
  onSubmit: (trainInfo: TrainInfo, notes?: string) => void;
  onCancel: () => void;
  tripStartDate?: string;
  tripEndDate?: string;
  initialData?: TrainInfo;
  initialNotes?: string;
}

const TrainForm: React.FC<TrainFormProps> = ({
  onSubmit,
  onCancel,
  tripStartDate,
  tripEndDate,
  initialData,
  initialNotes
}) => {
  const [formData, setFormData] = useState<TrainInfo>({
    company: initialData?.company || '',
    trainNumber: initialData?.trainNumber || '',
    departure: {
      station: initialData?.departure?.station || '',
      city: initialData?.departure?.city || '',
      date: initialData?.departure?.date || tripStartDate || '',
      time: initialData?.departure?.time || '',
      platform: initialData?.departure?.platform || ''
    },
    arrival: {
      station: initialData?.arrival?.station || '',
      city: initialData?.arrival?.city || '',
      date: initialData?.arrival?.date || tripStartDate || '',
      time: initialData?.arrival?.time || '',
      platform: initialData?.arrival?.platform || ''
    },
    duration: initialData?.duration || '',
    trainType: initialData?.trainType || '',
    carNumber: initialData?.carNumber || '',
    seatNumber: initialData?.seatNumber || '',
    bookingReference: initialData?.bookingReference || '',
    status: initialData?.status || 'scheduled'
  });

  const [notes, setNotes] = useState(initialNotes || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData, notes);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125v-9.75m-17.25 0h18m0 0V3.375c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M6.75 12h10.5" />
            </svg>
            <h2 className="text-xl font-semibold text-gray-900">
              {initialData ? 'Edit Train' : 'Add Train'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 text-left mb-1">
            Train Company *
          </label>
          <input
            type="text"
            required
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="JR East"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 text-left mb-1">
            Train Number *
          </label>
          <input
            type="text"
            required
            value={formData.trainNumber}
            onChange={(e) => setFormData({ ...formData, trainNumber: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="N700S"
          />
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 text-left">Departure</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 text-left mb-1">
              Station *
            </label>
            <input
              type="text"
              required
              value={formData.departure.station}
              onChange={(e) => setFormData({
                ...formData,
                departure: { ...formData.departure, station: e.target.value }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 text-left mb-1">
              City *
            </label>
            <input
              type="text"
              required
              value={formData.departure.city}
              onChange={(e) => setFormData({
                ...formData,
                departure: { ...formData.departure, city: e.target.value }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 text-left mb-1">
              Date *
            </label>
            <input
              type="date"
              required
              value={formData.departure.date}
              onChange={(e) => setFormData({
                ...formData,
                departure: { ...formData.departure, date: e.target.value }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 text-left mb-1">
              Time *
            </label>
            <input
              type="time"
              required
              value={formData.departure.time}
              onChange={(e) => setFormData({
                ...formData,
                departure: { ...formData.departure, time: e.target.value }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 text-left mb-1">
              Platform
            </label>
            <input
              type="text"
              value={formData.departure.platform}
              onChange={(e) => setFormData({
                ...formData,
                departure: { ...formData.departure, platform: e.target.value }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 text-left">Arrival</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 text-left mb-1">
              Station *
            </label>
            <input
              type="text"
              required
              value={formData.arrival.station}
              onChange={(e) => setFormData({
                ...formData,
                arrival: { ...formData.arrival, station: e.target.value }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 text-left mb-1">
              City *
            </label>
            <input
              type="text"
              required
              value={formData.arrival.city}
              onChange={(e) => setFormData({
                ...formData,
                arrival: { ...formData.arrival, city: e.target.value }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 text-left mb-1">
              Date *
            </label>
            <input
              type="date"
              required
              value={formData.arrival.date}
              onChange={(e) => setFormData({
                ...formData,
                arrival: { ...formData.arrival, date: e.target.value }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 text-left mb-1">
              Time *
            </label>
            <input
              type="time"
              required
              value={formData.arrival.time}
              onChange={(e) => setFormData({
                ...formData,
                arrival: { ...formData.arrival, time: e.target.value }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 text-left mb-1">
              Platform
            </label>
            <input
              type="text"
              value={formData.arrival.platform}
              onChange={(e) => setFormData({
                ...formData,
                arrival: { ...formData.arrival, platform: e.target.value }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 text-left">Additional Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 text-left mb-1">
              Duration
            </label>
            <input
              type="text"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="2h 30m"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 text-left mb-1">
              Train Type
            </label>
            <input
              type="text"
              value={formData.trainType}
              onChange={(e) => setFormData({ ...formData, trainType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Shinkansen"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 text-left mb-1">
              Car Number
            </label>
            <input
              type="text"
              value={formData.carNumber}
              onChange={(e) => setFormData({ ...formData, carNumber: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 text-left mb-1">
              Seat Number
            </label>
            <input
              type="text"
              value={formData.seatNumber}
              onChange={(e) => setFormData({ ...formData, seatNumber: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 text-left mb-1">
              Booking Reference
            </label>
            <input
              type="text"
              value={formData.bookingReference}
              onChange={(e) => setFormData({ ...formData, bookingReference: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Additional notes or booking information..."
          />
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          {initialData ? 'Update Train' : 'Add Train'}
        </button>
      </div>
        </form>
      </div>
    </div>
  );
};

export default TrainForm;

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from 'react-query';
import { tripsService } from '../services/trips';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

interface TripFormData {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  description?: string;
}

const CreateTripPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<TripFormData>();

  const startDate = watch('startDate');

  const createTripMutation = useMutation(tripsService.createTrip, {
    onSuccess: (trip) => {
      console.log('🎉 Create trip success - Trip created:', trip);
      queryClient.invalidateQueries('trips');
      toast.success('Trip created successfully!');
      navigate(`/trips/${trip.id}`);
    },
    onError: (error: any) => {
      console.error('❌ Create trip error:', error);
      const message = error.response?.data?.message || error.response?.data?.detail || 'Failed to create trip';
      toast.error(message);
    },
  });

  const onSubmit = (data: TripFormData) => {
    console.log('📝 Create trip form submitted with data:', data);
    
    // Transform form data to match service interface
    const tripData = {
      title: data.title,
      destination: data.destination,
      startDate: data.startDate,
      endDate: data.endDate,
      description: data.description,
    };
    
    createTripMutation.mutate(tripData);
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8 text-left">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold text-gray-900 text-left">Create New Trip</h1>
        <p className="mt-2 text-gray-600 text-left">Plan your next adventure</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Trip Title */}
        <div>
          <label htmlFor="title" className="block text-left text-sm font-medium text-gray-700 mb-2">
            Trip Title *
          </label>
          <input
            type="text"
            id="title"
            {...register('title', { required: 'Trip title is required' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., Summer Vacation in Japan"
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
          )}
        </div>

        {/* Destination */}
        <div>
          <label htmlFor="destination" className="block text-left text-sm font-medium text-gray-700 mb-2">
            Destination *
          </label>
          <input
            type="text"
            id="destination"
            {...register('destination', { required: 'Destination is required' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., Tokyo, Japan"
          />
          {errors.destination && (
            <p className="mt-1 text-sm text-red-600">{errors.destination.message}</p>
          )}
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="startDate" className="block text-left text-sm font-medium text-gray-700 mb-2">
              Start Date *
            </label>
            <input
              type="date"
              id="startDate"
              {...register('startDate', { required: 'Start date is required' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {errors.startDate && (
              <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="endDate" className="block text-left text-sm font-medium text-gray-700 mb-2">
              End Date *
            </label>
            <input
              type="date"
              id="endDate"
              {...register('endDate', {
                required: 'End date is required',
                validate: (value) => {
                  if (startDate && value < startDate) {
                    return 'End date must be after start date';
                  }
                  return true;
                },
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {errors.endDate && (
              <p className="mt-1 text-sm text-red-600">{errors.endDate.message}</p>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-left text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            id="description"
            rows={4}
            {...register('description')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Tell us about your trip plans..."
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createTripMutation.isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {createTripMutation.isLoading ? (
              <>
                <LoadingSpinner size="sm" />
                <span className="ml-2">Creating...</span>
              </>
            ) : (
              'Create Trip'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateTripPage;

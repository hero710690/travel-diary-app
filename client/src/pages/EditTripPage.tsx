import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { tripsService } from '../services/trips';
import { TripForm, Trip } from '../types';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const EditTripPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<TripForm>({
    defaultValues: {
      currency: 'USD',
    },
  });

  const startDate = watch('startDate');

  // Fetch trip data
  const { data: tripData, isLoading, isSuccess } = useQuery(
    ['trip', id],
    () => tripsService.getTrip(id!),
    {
      enabled: !!id,
    }
  );

  // Update form when trip data is loaded
  useEffect(() => {
    if (isSuccess && tripData) {
      const trip = tripData;
      console.log('📝 Loading trip data for editing:', trip);
      
      // Format dates properly for input[type="date"]
      const formatDateForInput = (dateString: string) => {
        try {
          const date = new Date(dateString);
          return date.toISOString().split('T')[0];
        } catch (error) {
          console.error('Error formatting date:', dateString, error);
          return '';
        }
      };

      // Reset form with trip data
      const formData = {
        title: trip.name || '', // TripDisplay uses 'name' instead of 'title'
        description: trip.description || '',
        destination: trip.destination || '',
        startDate: formatDateForInput(trip.startDate),
        endDate: formatDateForInput(trip.endDate),
        totalBudget: 0, // Not available in TripDisplay
        currency: 'USD', // Not available in TripDisplay
        isPublic: false, // Not available in TripDisplay
        tags: '', // Not available in TripDisplay
      };

      console.log('📝 Setting form data:', formData);
      reset(formData);
    }
  }, [isSuccess, tripData, reset]);

  const updateTripMutation = useMutation(
    (data: Partial<any>) => tripsService.updateTrip(id!, data),
    {
      onSuccess: (response) => {
        queryClient.invalidateQueries('trips');
        queryClient.invalidateQueries(['trip', id]);
        toast.success('Trip updated successfully!');
        navigate(`/trips/${id}`);
      },
      onError: (error: any) => {
        const message = error.response?.data?.message || 'Failed to update trip';
        toast.error(message);
      },
    }
  );

  const onSubmit = (data: TripForm) => {
    console.log('📤 Submitting updated trip data:', data);
    // Convert tags string to array
    const processedData = {
      ...data,
      tags: data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : []
    };
    updateTripMutation.mutate(processedData);
  };

  const currencies = [
    { code: 'USD', name: 'US Dollar' },
    { code: 'EUR', name: 'Euro' },
    { code: 'GBP', name: 'British Pound' },
    { code: 'JPY', name: 'Japanese Yen' },
    { code: 'CNY', name: 'Chinese Yuan' },
    { code: 'KRW', name: 'Korean Won' },
    { code: 'CAD', name: 'Canadian Dollar' },
    { code: 'AUD', name: 'Australian Dollar' },
    { code: 'CHF', name: 'Swiss Franc' },
    { code: 'SEK', name: 'Swedish Krona' },
  ];

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!tripData) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900">Trip not found</h2>
          <p className="mt-2 text-gray-600">The trip you're looking for doesn't exist or you don't have access to it.</p>
          <button
            onClick={() => navigate('/trips')}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Back to Trips
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 text-left">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back
        </button>
        <h1 className="mt-2 text-2xl font-bold text-gray-900 text-left">Edit Trip</h1>
        <p className="mt-1 text-sm text-gray-600 text-left">
          Update your trip details and preferences.
        </p>
        
        {/* Debug info - can be removed in production */}
        {tripData && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Editing:</strong> {tripData.name} 
              <span className="ml-2 text-blue-600">
                ({tripData.destination})
              </span>
            </p>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Trip Details</h2>
          
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label htmlFor="title" className="block text-left text-sm font-medium text-gray-700">
                Trip Title *
              </label>
              <input
                type="text"
                id="title"
                {...register('title', { required: 'Trip title is required' })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="e.g., Summer Vacation in Europe"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="destination" className="block text-left text-sm font-medium text-gray-700">
                Destination *
              </label>
              <input
                type="text"
                id="destination"
                {...register('destination', { required: 'Destination is required' })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="e.g., Paris, France"
              />
              {errors.destination && (
                <p className="mt-1 text-sm text-red-600">{errors.destination.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="startDate" className="block text-left text-sm font-medium text-gray-700">
                  Start Date *
                </label>
                <input
                  type="date"
                  id="startDate"
                  {...register('startDate', { required: 'Start date is required' })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                {errors.startDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="endDate" className="block text-left text-sm font-medium text-gray-700">
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
                    }
                  })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                {errors.endDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.endDate.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-left text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                {...register('description')}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Tell us about your trip..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="totalBudget" className="block text-left text-sm font-medium text-gray-700">
                  Total Budget
                </label>
                <input
                  type="number"
                  id="totalBudget"
                  min="0"
                  step="0.01"
                  {...register('totalBudget', { 
                    valueAsNumber: true,
                    min: { value: 0, message: 'Budget must be positive' }
                  })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="0.00"
                />
                {errors.totalBudget && (
                  <p className="mt-1 text-sm text-red-600">{errors.totalBudget.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="currency" className="block text-left text-sm font-medium text-gray-700">
                  Currency
                </label>
                <select
                  id="currency"
                  {...register('currency')}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  {currencies.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.code} - {currency.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="tags" className="block text-left text-sm font-medium text-gray-700">
                Tags
              </label>
              <input
                type="text"
                id="tags"
                {...register('tags')}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="e.g., adventure, family, business (comma-separated)"
              />
              <p className="mt-1 text-sm text-gray-500">
                Separate multiple tags with commas
              </p>
            </div>

            <div className="flex items-center">
              <input
                id="isPublic"
                type="checkbox"
                {...register('isPublic')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-900">
                Make this trip public (others can view it)
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={updateTripMutation.isLoading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updateTripMutation.isLoading ? 'Updating...' : 'Update Trip'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditTripPage;

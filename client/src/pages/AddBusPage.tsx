import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { tripsService } from '../services/trips';
import { BusInfo } from '../types';
import AddBusCard from '../components/AddBusCard';
import BusCard from '../components/BusCard';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';

const AddBusPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [addedBus, setAddedBus] = useState<BusInfo | null>(null);

  // Fetch trip data
  const { data: trip, isLoading } = useQuery(
    ['trip', id],
    () => tripsService.getTrip(id!),
    {
      enabled: !!id,
    }
  );

  // Add bus to itinerary
  const addBusMutation = useMutation(
    async (busInfo: BusInfo) => {
      // First get the current trip data
      const tripData = await tripsService.getTrip(id!);
      const currentItinerary = tripData.itinerary || [];
      
      // Create itinerary item for the bus
      const busItem = {
        id: `bus_${Date.now()}`,
        day: 1, // Default to day 1, you can change this
        time: busInfo.arrival.time,
        title: `${busInfo.company} ${busInfo.busNumber}`,
        description: `${busInfo.departure.city} → ${busInfo.arrival.city}`,
        type: 'bus',
        busInfo
      };

      // Add to trip itinerary
      const updatedItinerary = [...currentItinerary, busItem];
      return tripsService.updateItinerary(id!, updatedItinerary);
    },
    {
      onSuccess: () => {
        toast.success('Bus added to your itinerary!');
        queryClient.invalidateQueries(['trip', id]);
      },
      onError: (error) => {
        toast.error('Failed to add bus to itinerary');
        console.error('Error adding bus:', error);
      }
    }
  );

  const handleAddBus = (busInfo: BusInfo) => {
    setAddedBus(busInfo);
    addBusMutation.mutate(busInfo);
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate(`/trips/${id}`)}
          className="mr-4 p-2 rounded-full hover:bg-gray-100"
        >
          <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
        </button>
        <h1 className="text-2xl font-bold">Add Bus Transportation</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <AddBusCard
          onAddBus={handleAddBus}
          tripStartDate={trip?.startDate}
          tripEndDate={trip?.endDate}
        />
      </div>

      {addedBus && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Preview:</h2>
          <BusCard
            busInfo={addedBus}
            time={addedBus.arrival.time}
          />
          <div className="mt-4 text-center">
            <p className="text-green-600 font-medium">
              Bus added to your itinerary!
            </p>
            <button
              onClick={() => navigate(`/trips/${id}`)}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Return to Trip
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddBusPage;
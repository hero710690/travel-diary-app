import React, { useState } from 'react';
import { BusInfo } from '../types';
import BusForm from './BusForm';
import { TruckIcon } from '@heroicons/react/24/outline';

interface AddBusCardProps {
  onAddBus: (busInfo: BusInfo) => void;
  tripStartDate?: string;
  tripEndDate?: string;
}

const AddBusCard: React.FC<AddBusCardProps> = ({ 
  onAddBus, 
  tripStartDate, 
  tripEndDate 
}) => {
  const [showBusForm, setShowBusForm] = useState(false);

  const handleAddBus = (busInfo: BusInfo) => {
    onAddBus(busInfo);
    setShowBusForm(false);
  };

  return (
    <div className="mb-4">
      <button
        onClick={() => setShowBusForm(true)}
        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
      >
        <TruckIcon className="h-5 w-5 mr-2" />
        Add Bus Transportation
      </button>

      {showBusForm && (
        <BusForm
          onSave={handleAddBus}
          onCancel={() => setShowBusForm(false)}
          tripStartDate={tripStartDate}
          tripEndDate={tripEndDate}
        />
      )}
    </div>
  );
};

export default AddBusCard;
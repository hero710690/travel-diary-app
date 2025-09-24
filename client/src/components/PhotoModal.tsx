import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface ActivityPhoto {
  id: string;
  url: string;
  activity_index?: number;
  day?: number;
  activity_title?: string;
  filename?: string;
  uploaded_at?: string;
}

interface PhotoModalProps {
  photo: ActivityPhoto;
  onClose: () => void;
}

const PhotoModal: React.FC<PhotoModalProps> = ({ photo, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={onClose}>
      <div className="relative max-w-4xl max-h-full p-4">
        <img
          src={photo.url}
          alt="Full size photo"
          className="max-w-full max-h-full object-contain"
          onClick={(e) => e.stopPropagation()}
        />
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-75"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
};

export default PhotoModal;

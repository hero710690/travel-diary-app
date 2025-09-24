import React, { useState } from 'react';
import { XMarkIcon, PhotoIcon } from '@heroicons/react/24/outline';
import PhotoModal from './PhotoModal';

interface ActivityPhoto {
  id: string;
  url: string;
  activity_index?: number;
  day?: number;
  activity_title?: string;
  filename?: string;
  uploaded_at?: string;
}

interface PhotoGalleryProps {
  photos: ActivityPhoto[];
  onUpload?: (files: FileList) => void;
  onDelete?: (photoId: string) => void;
  canEdit?: boolean;
}

const PhotoGallery: React.FC<PhotoGalleryProps> = ({ 
  photos, 
  onUpload, 
  onDelete, 
  canEdit = false 
}) => {
  const [selectedPhoto, setSelectedPhoto] = useState<ActivityPhoto | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && onUpload) {
      onUpload(files);
    }
  };

  if (photos.length === 0 && !canEdit) {
    return null;
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        {canEdit && onUpload && (
          <label className="cursor-pointer">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800">
              <PhotoIcon className="h-4 w-4" />
              <span>Add photo</span>
            </div>
          </label>
        )}
      </div>
      
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group">
              <img
                src={photo.url}
                alt="Activity"
                className="w-12 h-12 object-cover rounded cursor-pointer"
                onClick={() => setSelectedPhoto(photo)}
              />
              {canEdit && onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(photo.id);
                  }}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {selectedPhoto && (
        <PhotoModal
          photo={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
        />
      )}
    </div>
  );
};

export default PhotoGallery;

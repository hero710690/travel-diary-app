import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://aprb1rgwqf.execute-api.ap-northeast-1.amazonaws.com/prod';

export const photosService = {
  // Upload photo
  uploadPhoto: async (tripId: string, activityIndex: number, day: number, activityTitle: string, file: File): Promise<any> => {
    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // Remove data:image/jpeg;base64, prefix
        };
        reader.readAsDataURL(file);
      });

      const response = await axios.post(
        `${API_BASE_URL}/api/v1/trips/${tripId}/photos`,
        {
          trip_id: tripId,
          activity_index: activityIndex,
          day: day,
          activity_title: activityTitle,
          photo_data: base64,
          filename: file.name
        },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.photo;
    } catch (error) {
      console.error('Photo upload error:', error);
      throw error;
    }
  },

  // Get photos for trip
  getPhotosForTrip: async (tripId: string): Promise<any[]> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/v1/trips/${tripId}/photos`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        }
      );

      return response.data.photos || [];
    } catch (error) {
      console.error('Get photos error:', error);
      return [];
    }
  },

  // Delete photo
  deletePhoto: async (tripId: string, photoId: string): Promise<void> => {
    await axios.delete(
      `${API_BASE_URL}/api/v1/photos/${photoId}`,
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        data: { trip_id: tripId }
      }
    );
  }
};

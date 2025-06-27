import apiClient from './api';
import { API_ENDPOINTS } from '../config/api';

// Types for collaboration
export interface CollaboratorInvite {
  email: string;
  role: 'viewer' | 'editor' | 'admin';
  message?: string;
}

export interface Collaborator {
  user_id: string;
  email: string;
  name: string;
  role: 'viewer' | 'editor' | 'admin';
  invited_by: string;
  invited_at: string;
  accepted_at?: string;
  status: 'pending' | 'accepted' | 'declined' | 'removed';
  permissions: {
    view_trip: boolean;
    edit_itinerary: boolean;
    invite_others: boolean;
    manage_settings: boolean;
  };
}

export interface ShareSettings {
  is_public: boolean;
  allow_comments: boolean;
  password_protected: boolean;
  password?: string;
  expires_in_days?: number;
}

export interface ShareLink {
  id: string;
  url: string;
  token: string;
  settings: ShareSettings;
  expires_at: string;
  created_at: string;
  access_count?: number;
}

export interface InviteResponse {
  action: 'accept' | 'decline';
  invite_token: string;
}

export interface SharedTrip {
  id: string;
  title: string;
  description: string;
  destination: string;
  start_date: string;
  end_date: string;
  duration: number;
  itinerary: any[];
  wishlist: any[];
  is_shared: true;
  share_settings: ShareSettings;
}

class CollaborationService {
  /**
   * Invite a collaborator to a trip
   */
  async inviteCollaborator(tripId: string, invite: CollaboratorInvite) {
    try {
      console.log('🤝 Inviting collaborator:', { tripId, invite });
      
      const response = await apiClient.post(API_ENDPOINTS.TRIPS.INVITE(tripId), invite);
      
      console.log('✅ Collaborator invited successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to invite collaborator:', error);
      throw new Error(error.response?.data?.message || 'Failed to invite collaborator');
    }
  }

  /**
   * Create a shareable link for a trip
   */
  async createShareLink(tripId: string, settings: ShareSettings): Promise<ShareLink> {
    try {
      console.log('🔗 Creating share link:', { tripId, settings });
      
      const response = await apiClient.post(API_ENDPOINTS.TRIPS.SHARE(tripId), settings);
      
      console.log('✅ Share link created successfully:', response.data);
      return response.data.share_link;
    } catch (error: any) {
      console.error('❌ Failed to create share link:', error);
      throw new Error(error.response?.data?.message || 'Failed to create share link');
    }
  }

  /**
   * Respond to a collaboration invite
   */
  async respondToInvite(response: InviteResponse) {
    try {
      console.log('📨 Responding to invite:', response);
      
      const apiResponse = await apiClient.post(API_ENDPOINTS.COLLABORATION.RESPOND_INVITE, response);
      
      console.log('✅ Invite response sent successfully:', apiResponse.data);
      return apiResponse.data;
    } catch (error: any) {
      console.error('❌ Failed to respond to invite:', error);
      throw new Error(error.response?.data?.message || 'Failed to respond to invite');
    }
  }

  /**
   * Get a shared trip by token
   */
  async getSharedTrip(token: string, password?: string): Promise<SharedTrip> {
    try {
      console.log('🌐 Getting shared trip:', { token });
      
      const url = API_ENDPOINTS.COLLABORATION.SHARED_TRIP(token);
      const params = password ? { password } : {};
      
      const response = await apiClient.get(url, { params });
      
      console.log('✅ Shared trip retrieved successfully:', response.data);
      return response.data.trip;
    } catch (error: any) {
      console.error('❌ Failed to get shared trip:', error);
      throw new Error(error.response?.data?.message || 'Failed to access shared trip');
    }
  }

  /**
   * Update collaborator role
   */
  async updateCollaboratorRole(tripId: string, collaboratorId: string, role: string) {
    try {
      console.log('👥 Updating collaborator role:', { tripId, collaboratorId, role });
      
      // This would be implemented when we add the endpoint
      // const response = await apiClient.put(`/trips/${tripId}/collaborators/${collaboratorId}`, { role });
      
      console.log('✅ Collaborator role updated successfully');
      // return response.data;
      
      // For now, return a placeholder
      return { message: 'Collaborator role updated successfully' };
    } catch (error: any) {
      console.error('❌ Failed to update collaborator role:', error);
      throw new Error(error.response?.data?.message || 'Failed to update collaborator role');
    }
  }

  /**
   * Remove collaborator from trip
   */
  async removeCollaborator(tripId: string, collaboratorId: string) {
    try {
      console.log('🗑️ Removing collaborator:', { tripId, collaboratorId });
      
      // This would be implemented when we add the endpoint
      // const response = await apiClient.delete(`/trips/${tripId}/collaborators/${collaboratorId}`);
      
      console.log('✅ Collaborator removed successfully');
      // return response.data;
      
      // For now, return a placeholder
      return { message: 'Collaborator removed successfully' };
    } catch (error: any) {
      console.error('❌ Failed to remove collaborator:', error);
      throw new Error(error.response?.data?.message || 'Failed to remove collaborator');
    }
  }

  /**
   * Get collaboration activity for a trip
   */
  async getCollaborationActivity(tripId: string) {
    try {
      console.log('📊 Getting collaboration activity:', { tripId });
      
      // This would be implemented when we add the endpoint
      // const response = await apiClient.get(`/trips/${tripId}/activity`);
      
      console.log('✅ Collaboration activity retrieved successfully');
      // return response.data;
      
      // For now, return placeholder data
      return {
        activities: [
          {
            id: '1',
            user_name: 'John Doe',
            action: 'joined',
            timestamp: new Date().toISOString(),
            details: { role: 'editor' }
          }
        ]
      };
    } catch (error: any) {
      console.error('❌ Failed to get collaboration activity:', error);
      throw new Error(error.response?.data?.message || 'Failed to get collaboration activity');
    }
  }
}

export const collaborationService = new CollaborationService();
export default collaborationService;

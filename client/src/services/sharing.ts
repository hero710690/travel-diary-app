import apiClient from './api';
import { API_ENDPOINTS } from '../config/api';

export interface ShareSettings {
  is_public: boolean;
  password?: string;
  allow_editing: boolean;
  expires_at?: string;
}

export interface ShareLink {
  token: string;
  url: string;
  settings: ShareSettings;
  created_at: string;
  expires_at?: string;
}

export interface CreateShareLinkRequest {
  trip_id: string;
  settings: ShareSettings;
}

export interface UpdateShareSettingsRequest {
  settings: ShareSettings;
}

class SharingService {
  /**
   * Generate a new share link for a trip
   */
  async createShareLink(tripId: string, settings: ShareSettings): Promise<ShareLink> {
    try {
      console.log('🔗 Creating share link for trip:', tripId, 'with settings:', settings);
      
      // Backend expects settings at root level, not nested under 'settings'
      const requestBody = {
        is_public: settings.is_public,
        password_protected: !!settings.password,
        password: settings.password || '',
        allow_editing: settings.allow_editing,
        expires_in_days: 30, // Default expiration
        send_email: false // Don't send email by default
      };
      
      console.log('🔗 Request body:', requestBody);
      const response = await apiClient.post(API_ENDPOINTS.TRIPS.SHARE(tripId), requestBody);
      console.log('✅ Share link response:', response.data);
      
      // Transform backend response to match our ShareLink interface
      const shareData = response.data.share_link;
      return {
        token: shareData.token,
        url: shareData.url,
        settings: {
          is_public: shareData.settings.is_public,
          password: shareData.settings.password,
          allow_editing: shareData.settings.allow_editing,
          expires_at: shareData.expires_at
        },
        created_at: shareData.created_at,
        expires_at: shareData.expires_at
      } as ShareLink;
    } catch (error: any) {
      console.error('❌ Share link creation error:', error);
      console.error('Error response data:', error.response?.data);
      console.error('Error status:', error.response?.status);
      throw new Error(error.response?.data?.message || 'Failed to create share link');
    }
  }

  /**
   * Get existing share link for a trip
   */
  async getShareLink(tripId: string): Promise<ShareLink | null> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.TRIPS.SHARE(tripId));
      return response.data as ShareLink;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw new Error(error.response?.data?.message || 'Failed to get share link');
    }
  }

  /**
   * Update share settings for an existing share link
   */
  async updateShareSettings(tripId: string, settings: ShareSettings): Promise<ShareLink> {
    try {
      const response = await apiClient.put(API_ENDPOINTS.TRIPS.SHARE(tripId), { settings });
      return response.data as ShareLink;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update share settings');
    }
  }

  /**
   * Delete/revoke a share link
   */
  async revokeShareLink(tripId: string): Promise<void> {
    try {
      await apiClient.delete(API_ENDPOINTS.TRIPS.SHARE(tripId));
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to revoke share link');
    }
  }

  /**
   * Get trip data via share token (with editing permissions if allowed)
   */
  async getSharedTripWithPermissions(token: string, password?: string): Promise<{
    trip: any;
    permissions: {
      can_view: boolean;
      can_edit: boolean;
    };
  }> {
    try {
      const url = `/shared/${token}/permissions${password ? `?password=${encodeURIComponent(password)}` : ''}`;
      const response = await apiClient.get(url);
      
      return response.data as {
        trip: any;
        permissions: {
          can_view: boolean;
          can_edit: boolean;
        };
      };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to access shared trip');
    }
  }

  /**
   * Generate a shareable URL for the frontend
   */
  generateShareUrl(token: string, password?: string): string {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/shared/${token}`;
    
    if (password) {
      return `${url}?password=${encodeURIComponent(password)}`;
    }
    
    return url;
  }

  /**
   * Generate an editable share URL that redirects to trip planning page
   */
  generateEditableShareUrl(token: string, password?: string): string {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/shared/${token}/edit`;
    
    if (password) {
      return `${url}?password=${encodeURIComponent(password)}`;
    }
    
    return url;
  }

  /**
   * Copy share link to clipboard
   */
  async copyToClipboard(url: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(url);
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  }
}

export const sharingService = new SharingService();
export default sharingService;

import { api } from './api';
import { API_CONFIG } from '../config/api';

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
      const response = await api.post(`/trips/${tripId}/share`, { settings });
      return response.data as ShareLink;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to create share link');
    }
  }

  /**
   * Get existing share link for a trip
   */
  async getShareLink(tripId: string): Promise<ShareLink | null> {
    try {
      const response = await api.get(`/trips/${tripId}/share`);
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
      const response = await api.put(`/trips/${tripId}/share`, { settings });
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
      await api.delete(`/trips/${tripId}/share`);
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
      const response = await api.get(url);
      
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

import apiClient from './api';
import { API_ENDPOINTS } from '../config/api';

// Enhanced invitation types for co-editing
export interface InvitationLink {
  id: string;
  token: string;
  url: string;
  trip_id: string;
  trip_title: string;
  inviter_name: string;
  inviter_email: string;
  role: 'viewer' | 'editor' | 'admin';
  message?: string;
  expires_at: string;
  created_at: string;
  requires_signup: boolean;
  invited_email?: string;
}

export interface CreateInvitationRequest {
  trip_id: string;
  email?: string; // Optional - if provided, creates targeted invite
  role: 'viewer' | 'editor' | 'admin';
  message?: string;
  expires_in_days?: number;
  allow_signup: boolean; // Allow new users to register through this link
}

export interface InvitationDetails {
  invitation: InvitationLink;
  trip: {
    id: string;
    title: string;
    description: string;
    destination: string;
    start_date: string;
    end_date: string;
    owner_name: string;
  };
  permissions: {
    can_view: boolean;
    can_edit: boolean;
    can_invite: boolean;
    can_manage: boolean;
  };
}

export interface RegisterWithInviteRequest {
  name: string;
  email: string;
  password: string;
  invite_token: string;
}

class InvitationService {
  /**
   * Create a new invitation link for co-editing
   */
  async createInvitationLink(request: CreateInvitationRequest): Promise<InvitationLink> {
    try {
      console.log('🔗 Creating invitation link:', request);
      
      const response = await apiClient.post(API_ENDPOINTS.TRIPS.INVITE_LINK(request.trip_id), {
        email: request.email,
        role: request.role,
        message: request.message,
        expires_in_days: request.expires_in_days || 7,
        allow_signup: request.allow_signup
      });
      
      console.log('✅ Invitation link created:', response.data);
      return response.data.invitation;
    } catch (error: any) {
      console.error('❌ Failed to create invitation link:', error);
      throw new Error(error.response?.data?.message || 'Failed to create invitation link');
    }
  }

  /**
   * Get invitation details by token (for both existing and new users)
   */
  async getInvitationDetails(token: string): Promise<InvitationDetails> {
    try {
      console.log('📋 Getting invitation details:', { token });
      
      const response = await apiClient.get(API_ENDPOINTS.INVITATIONS.DETAILS(token));
      
      console.log('✅ Invitation details retrieved:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to get invitation details:', error);
      throw new Error(error.response?.data?.message || 'Failed to get invitation details');
    }
  }

  /**
   * Register a new user through invitation link
   */
  async registerWithInvite(request: RegisterWithInviteRequest): Promise<{
    user: any;
    token: string;
    trip_access: {
      trip_id: string;
      role: string;
      permissions: any;
    };
  }> {
    try {
      console.log('👤 Registering user with invite:', { 
        email: request.email, 
        invite_token: request.invite_token 
      });
      
      const response = await apiClient.post(API_ENDPOINTS.AUTH.REGISTER_WITH_INVITE, request);
      
      console.log('✅ User registered with invite successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to register with invite:', error);
      throw new Error(error.response?.data?.message || 'Failed to register with invitation');
    }
  }

  /**
   * Accept invitation for existing user
   */
  async acceptInvitation(token: string): Promise<{
    trip_id: string;
    trip_title: string;
    role: string;
    permissions: any;
  }> {
    try {
      console.log('✅ Accepting invitation:', { token });
      
      const response = await apiClient.post('/invite/accept', {
        invite_token: token
      });
      
      console.log('✅ Invitation accepted successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to accept invitation:', error);
      throw new Error(error.response?.data?.message || 'Failed to accept invitation');
    }
  }

  /**
   * Generate shareable invitation URL
   */
  generateInvitationUrl(token: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/invite/${token}`;
  }

  /**
   * Copy invitation link to clipboard
   */
  async copyInvitationToClipboard(token: string): Promise<void> {
    const url = this.generateInvitationUrl(token);
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

  /**
   * Get user's pending invitations
   */
  async getPendingInvitations(): Promise<InvitationLink[]> {
    try {
      const response = await apiClient.get('/invitations/pending');
      return response.data.invitations;
    } catch (error: any) {
      console.error('❌ Failed to get pending invitations:', error);
      throw new Error(error.response?.data?.message || 'Failed to get pending invitations');
    }
  }

  /**
   * Revoke an invitation link
   */
  async revokeInvitation(token: string): Promise<void> {
    try {
      await apiClient.delete(`/invite/${token}`);
      console.log('✅ Invitation revoked successfully');
    } catch (error: any) {
      console.error('❌ Failed to revoke invitation:', error);
      throw new Error(error.response?.data?.message || 'Failed to revoke invitation');
    }
  }
}

export const invitationService = new InvitationService();
export default invitationService;

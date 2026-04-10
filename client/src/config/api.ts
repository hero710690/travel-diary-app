// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || 'https://trip-diary.web.app',
  API_V1: '/api/v1',
  TIMEOUT: 10000,
};

export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    REGISTER: '/api/v1/auth/register',
    LOGIN: '/api/v1/auth/login',
    ME: '/api/v1/auth/me',
    LOGOUT: '/api/v1/auth/logout',
    REGISTER_WITH_INVITE: '/api/v1/auth/register-with-invite',
  },
  // Trips
  TRIPS: {
    LIST: '/api/v1/trips/',
    CREATE: '/api/v1/trips/',
    GET: (id: string) => `/api/v1/trips/${id}`,
    UPDATE: (id: string) => `/api/v1/trips/${id}`,
    DELETE: (id: string) => `/api/v1/trips/${id}`,
    // Collaboration endpoints
    INVITE: (id: string) => `/api/v1/trips/${id}/invite`,
    INVITE_LINK: (id: string) => `/api/v1/trips/${id}/invite-link`,
    SHARE: (id: string) => `/api/v1/trips/${id}/share`,
  },
  // Collaboration & Invitations
  COLLABORATION: {
    RESPOND_INVITE: '/api/v1/invite/respond',
    SHARED_TRIP: (token: string) => `/api/v1/shared/${token}`,
  },
  // Invitations
  INVITATIONS: {
    DETAILS: (token: string) => `/api/v1/invite/${token}/details`,
    ACCEPT: '/api/v1/invite/accept',
    PENDING: '/api/v1/invitations/pending',
    REVOKE: (token: string) => `/api/v1/invite/${token}`,
  },
  // Health
  HEALTH: '/api/v1/health',
};

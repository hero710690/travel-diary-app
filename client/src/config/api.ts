// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || 'https://aprb1rgwqf.execute-api.ap-northeast-1.amazonaws.com/prod',
  API_V1: '/api/v1',
  TIMEOUT: 10000,
};

export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    ME: '/auth/me',
    LOGOUT: '/auth/logout',
  },
  // Trips
  TRIPS: {
    LIST: '/trips',
    CREATE: '/trips',
    GET: (id: string) => `/trips/${id}`,
    UPDATE: (id: string) => `/trips/${id}`,
    DELETE: (id: string) => `/trips/${id}`,
    // Collaboration endpoints
    INVITE: (id: string) => `/trips/${id}/invite`,
    SHARE: (id: string) => `/trips/${id}/share`,
  },
  // Collaboration
  COLLABORATION: {
    RESPOND_INVITE: '/invite/respond',
    SHARED_TRIP: (token: string) => `/shared/${token}`,
  },
  // Health
  HEALTH: '/health',
};

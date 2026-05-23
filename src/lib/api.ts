import axios, { type InternalAxiosRequestConfig } from 'axios';

// Extend AxiosRequestConfig to include useRefreshToken
declare module 'axios' {
  export interface AxiosRequestConfig {
    useRefreshToken?: boolean;
  }
}

export const api = axios.create({
  baseURL: '', // Always empty, use absolute or full paths
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let refreshPromise: Promise<any> | null = null;

const getRefreshToken = () => localStorage.getItem('token');
const getAccessToken = () => sessionStorage.getItem('access_token');
const setAccessToken = (token: string) => {
  sessionStorage.setItem('access_token', token);
  sessionStorage.setItem('access_token_timestamp', Date.now().toString());
};
const clearTokens = () => {
  localStorage.removeItem('token');
  sessionStorage.removeItem('access_token');
  sessionStorage.removeItem('access_token_timestamp');
};

const REFRESH_PATH = import.meta.env.VITE_API_REFRESH_PATH || '/auth/token';

// Request interceptor to add JWT token and handle URL prefixing
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  // Always send credentials
  config.withCredentials = true;
  
  // If useRefreshToken is true, use refresh token
  if (config.useRefreshToken) {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      config.headers.Authorization = refreshToken;
    }
    return config;
  }

  // Otherwise, use access token. Check if it's expired or missing first.
  // Don't auto-refresh if we are currently calling the refresh endpoint itself
  const isRefreshing = config.url === REFRESH_PATH || config.url?.endsWith(REFRESH_PATH);
  
  if (!isRefreshing) {
    const lastFetched = parseInt(sessionStorage.getItem('access_token_timestamp') || '0');
    const now = Date.now();
    
    if (!getAccessToken() || (now - lastFetched > CACHE_DURATION)) {
      if (!refreshPromise) {
        // Refresh token call itself needs the refresh token
        refreshPromise = api.get(REFRESH_PATH, { useRefreshToken: true }).finally(() => { 
          refreshPromise = null; 
        });
      }
      try {
        await refreshPromise;
      } catch (e) {
        // Refresh failed
      }
    }
  }

  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = token;
  }
  return config;
});

// Response interceptor to handle token storage and 401
api.interceptors.response.use(
  (response) => {
    // If this was a refresh call (via useRefreshToken), save the result as access token
    if (response.config.useRefreshToken && response.data?.token) {
      setAccessToken(response.data.token);
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      clearTokens();
      window.location.href = '/ui/';
    }
    return Promise.reject(error);
  }
);

export default api;


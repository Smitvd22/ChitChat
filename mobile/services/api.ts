// ChitChat Mobile - API Service
// Axios instance with auth interceptor, adapted from web's authService.js

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { API_URL } from '../constants/config';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach JWT token
api.interceptors.request.use(
  async (config) => {
    try {
      let userStr = null;
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') {
          userStr = window.localStorage.getItem('user');
        }
      } else {
        userStr = await SecureStore.getItemAsync('user');
      }
      
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user?.token) {
          config.headers.Authorization = `Bearer ${user.token}`;
        }
      }
    } catch (error) {
      console.error('Error reading auth token:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401/403 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.warn('Auth error - token may be expired');
      // Auth context will handle redirect to login
    }
    return Promise.reject(error);
  }
);

export default api;

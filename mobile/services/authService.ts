// ChitChat Mobile - Auth Service
// Adapted from client/src/services/authService.js
// Replaces localStorage with expo-secure-store

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import api from './api';
import { AuthData, LoginPayload, RegisterPayload } from '../types';

const USER_KEY = 'user';

// Helper to save securely based on platform
const saveSecureData = async (key: string, value: string) => {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, value);
    }
  } else {
    await SecureStore.setItemAsync(key, value);
  }
};

// Helper to get securely based on platform
const getSecureData = async (key: string): Promise<string | null> => {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem(key);
    }
    return null;
  } else {
    return await SecureStore.getItemAsync(key);
  }
};

// Helper to delete securely based on platform
const deleteSecureData = async (key: string) => {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(key);
    }
  } else {
    await SecureStore.deleteItemAsync(key);
  }
};

// Register a new user
export const register = async (userData: RegisterPayload): Promise<AuthData> => {
  const response = await api.post('/auth/register', userData);

  if (response.data?.token) {
    const authData: AuthData = {
      id: response.data.user.id,
      username: response.data.user.username,
      email: response.data.user.email,
      mobile: response.data.user.mobile,
      token: response.data.token,
    };
    await saveSecureData(USER_KEY, JSON.stringify(authData));
    return authData;
  }

  throw new Error('Registration failed - no token received');
};

// Login user
export const login = async (payload: LoginPayload): Promise<AuthData> => {
  const response = await api.post('/auth/login', {
    identifier: payload.identifier,
    password: payload.password,
  });

  if (response.data?.token) {
    const authData: AuthData = {
      id: response.data.user.id,
      username: response.data.user.username,
      email: response.data.user.email,
      mobile: response.data.user.mobile,
      token: response.data.token,
    };
    await saveSecureData(USER_KEY, JSON.stringify(authData));
    return authData;
  }

  throw new Error('Login failed - no token received');
};

// Logout
export const logout = async (): Promise<void> => {
  await deleteSecureData(USER_KEY);
};

// Get current user from secure storage
export const getCurrentUser = async (): Promise<AuthData | null> => {
  try {
    const userStr = await getSecureData(USER_KEY);
    if (!userStr) return null;

    const userData: AuthData = JSON.parse(userStr);
    if (!userData?.id || !userData?.token) {
      console.warn('Invalid user data in SecureStore');
      return null;
    }

    return userData;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

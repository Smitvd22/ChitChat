// ChitChat Mobile - Configuration Constants
// Configures API URLs for dev/production and Cloudinary settings

import { Platform } from 'react-native';
import Constants from 'expo-constants';

const getDevHost = () => {
  // If running in Expo Go on a physical phone, get the exact IP of the PC
  const debuggerHost = Constants.expoConfig?.hostUri;
  if (debuggerHost) {
    const ip = debuggerHost.split(':')[0];
    return `http://${ip}:5000`;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000'; // Fallback for Android emulator
  }
  return 'http://localhost:5000'; // Fallback for Web and iOS simulator
};

const DEV_HOST = getDevHost();
const DEV_API_URL = `${DEV_HOST}/api`;
const DEV_SOCKET_URL = DEV_HOST;

const PROD_API_URL = 'https://chitchat-3l35.onrender.com/api';
const PROD_SOCKET_URL = 'https://chitchat-3l35.onrender.com';

// Use __DEV__ which is a built-in React Native global
const isDev = __DEV__;

export const API_URL = isDev ? DEV_API_URL : PROD_API_URL;
export const SOCKET_URL = isDev ? DEV_SOCKET_URL : PROD_SOCKET_URL;

// The URL where your React frontend is hosted
const PROD_WEB_URL = 'https://chit-chat-nine-gamma.vercel.app'; 
const DEV_WEB_URL = `http://${DEV_HOST.replace('http://', '').split(':')[0]}:3000`;
export const WEB_APP_URL = isDev ? DEV_WEB_URL : PROD_WEB_URL;

// Cloudinary config - same as web app, safe for client-side
export const CLOUDINARY_CLOUD_NAME = 'drrcslcvk';
export const CLOUDINARY_UPLOAD_PRESET = 'chitchat';
export const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`;

// Pagination
export const MESSAGES_PER_PAGE = 20;

// App info
export const APP_NAME = 'ChitChat';

import axios from 'axios';
import io from 'socket.io-client';

// Singleton pattern for socket management
let socket = null;

// Fix URL and ensure correct endpoints with production fallback
let API_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://chitchat-3l35.onrender.com' 
    : `http://${window.location.hostname}:5000/api`);

// Dynamically replace localhost with actual IP for Mobile WebView compatibility
if (API_URL && API_URL.includes('localhost')) {
  API_URL = API_URL.replace('localhost', window.location.hostname);
}

export const register = async (userData) => {
  try {
    console.log(`[authService] Calling POST ${API_URL}/auth/register`);
    const response = await axios.post(`${API_URL}/auth/register`, userData);
    console.log('Registration response:', response.data);
    
    // Store user data consistently
    if (response.data && response.data.token) {
      // Store user data and token in a consistent format
      const authData = {
        id: response.data.user.id,
        username: response.data.user.username,
        email: response.data.user.email,
        mobile: response.data.user.mobile,
        token: response.data.token
      };
      localStorage.setItem('user', JSON.stringify(authData));
    }
    return response.data;
  } catch (error) {
    console.error('Registration error in service:', error);
    throw error;
  }
};

export const login = async (identifier, password) => {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      identifier,
      password
    });

    console.log('Login API response:', response.data);
    
    if (response.data && response.data.token) {
      // Store user data and token in a consistent format
      const authData = {
        id: response.data.user.id,
        username: response.data.user.username,
        email: response.data.user.email,
        mobile: response.data.user.mobile,
        token: response.data.token
      };
      localStorage.setItem('user', JSON.stringify(authData));
    }
    
    // Initialize socket immediately after successful login
    initializeSocket();
    
    return response.data;
  } catch (error) {
    console.error('Login error:', error);
    throw error.response?.data?.error || 'Failed to log in';
  }
};

export const logout = () => {
  // Clean up socket connection before removing user
  if (socket) {
    console.log('Cleaning up socket on logout');
    socket.disconnect();
    socket = null;
  }
  
  localStorage.removeItem('user');
};

export const getCurrentUser = () => {
  try {
    const userString = localStorage.getItem('user');
    
    if (!userString) {
      return null;
    }
    
    // Parse the user data from localStorage
    const userData = JSON.parse(userString);
    
    // Make sure we have at least a user ID and token
    if (!userData || !userData.id || !userData.token) {
      console.warn('Invalid user data in localStorage');
      return null;
    }
    
    return userData;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

// Update the initializeSocket function to include a debug parameter
export const initializeSocket = () => {
  if (socket) {
    // If it's already connected or currently connecting, just return it
    if (socket.connected || socket.active) {
      return socket;
    }
  }
  
  // Clean up completely disconnected socket
  if (socket) {
    console.log('Cleaning up disconnected socket');
    socket.disconnect();
    socket = null;
  }
  
  const user = getCurrentUser();
  if (!user) return null;
  
  console.log('Creating new socket connection');
  
  let socketUrl = process.env.REACT_APP_SOCKET_URL || 
    (process.env.NODE_ENV === 'production' 
      ? 'https://chitchat-3l35.onrender.com' 
      : `http://${window.location.hostname}:5000`
    );

  // Dynamically replace localhost with actual IP for Mobile WebView compatibility
  if (socketUrl && socketUrl.includes('localhost')) {
    socketUrl = socketUrl.replace('localhost', window.location.hostname);
  }
  
  console.log('Connecting to socket URL:', socketUrl);
  
  socket = io(socketUrl, {
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    transports: ['polling', 'websocket'], // Use polling first to prevent immediate websocket error in Android WebView
    auth: { userId: user.id },
    forceNew: false,
    upgrade: true
  });
  
  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
    // Join user's room immediately but only once
    socket.emit('join-user-room', `user-${user.id}`);
  });
  
  // Only log once in authService
  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });
  
  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });
  
  return socket;
};

// Add a getter to access the current socket instance
export const getSocket = () => {
  return socket;
};
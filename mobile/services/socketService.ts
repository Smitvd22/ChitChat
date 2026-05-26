// ChitChat Mobile - Socket Service
// Adapted from client/src/services/authService.js (socket parts)
// Singleton pattern matching the web app's socket management

import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../constants/config';
import { AuthData } from '../types';

let socket: Socket | null = null;

// Initialize socket connection
// Same config as web's initializeSocket()
export const initializeSocket = (user: AuthData): Socket => {
  if (socket?.connected) {
    return socket;
  }

  // Clean up disconnected socket
  if (socket && !socket.connected) {
    console.log('Cleaning up disconnected socket');
    socket.disconnect();
    socket = null;
  }

  console.log('Creating new socket connection to:', SOCKET_URL);

  socket = io(SOCKET_URL, {
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    transports: ['polling', 'websocket'],
    auth: { userId: user.id },
    forceNew: false,
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket?.id);
    // Join user's personal room (same as web)
    socket?.emit('join-user-room', `user-${user.id}`);
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message);
  });

  return socket;
};

// Get current socket instance
export const getSocket = (): Socket | null => {
  return socket;
};

// Disconnect and clean up socket
export const disconnectSocket = (): void => {
  if (socket) {
    console.log('Disconnecting socket');
    socket.disconnect();
    socket = null;
  }
};

// Join a chat room (same as web)
export const joinChatRoom = (roomId: string): void => {
  if (socket?.connected) {
    socket.emit('join-room', roomId);
  }
};

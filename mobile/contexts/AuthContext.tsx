// ChitChat Mobile - Auth Context
// Manages auth state, session restoration, and socket lifecycle
// Replaces the per-component getCurrentUser() pattern from the web app

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthData, LoginPayload, RegisterPayload } from '../types';
import * as authService from '../services/authService';
import { initializeSocket, disconnectSocket, getSocket } from '../services/socketService';
import { Socket } from 'socket.io-client';
import { useRouter } from 'expo-router';

interface AuthContextType {
  user: AuthData | null;
  socket: Socket | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  incomingCall: any | null;
  acceptCall: () => void;
  rejectCall: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  socket: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  incomingCall: null,
  acceptCall: () => {},
  rejectCall: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthData | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [incomingCall, setIncomingCall] = useState<any | null>(null);
  const router = useRouter();

  // Restore session on app launch
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedUser = await authService.getCurrentUser();
        if (storedUser) {
          setUser(storedUser);
          // Initialize socket with restored session
          const sock = initializeSocket(storedUser);
          setSocket(sock);
        }
      } catch (error) {
        console.error('Error restoring session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  // Listen for video calls
  useEffect(() => {
    if (!socket) return;

    const handleCallInvitation = (data: any) => {
      console.log('Incoming video call:', data);
      setIncomingCall(data);
    };

    const handleCallEnded = () => {
      setIncomingCall(null);
    };

    socket.on('video-call-invitation', handleCallInvitation);
    socket.on('call-ended-by-peer', handleCallEnded);
    socket.on('user-left-video-call', handleCallEnded);

    return () => {
      socket.off('video-call-invitation', handleCallInvitation);
      socket.off('call-ended-by-peer', handleCallEnded);
      socket.off('user-left-video-call', handleCallEnded);
    };
  }, [socket]);

  const acceptCall = useCallback(() => {
    if (incomingCall) {
      const callData = incomingCall;
      setIncomingCall(null);
      // Navigate to videocall screen, passing isInitiator=false
      router.push({
        pathname: '/(app)/videocall/[callId]',
        params: { callId: callData.callId, isInitiator: 'false', callerId: callData.fromUserId }
      });
    }
  }, [incomingCall, router]);

  const rejectCall = useCallback(() => {
    if (incomingCall && socket) {
      // Send rejection to server (which forwards to caller)
      socket.emit('end-video-call', incomingCall.callId);
      setIncomingCall(null);
    }
  }, [incomingCall, socket]);

  const login = useCallback(async (payload: LoginPayload) => {
    const authData = await authService.login(payload);
    setUser(authData);
    const sock = initializeSocket(authData);
    setSocket(sock);
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const authData = await authService.register(payload);
    setUser(authData);
    const sock = initializeSocket(authData);
    setSocket(sock);
  }, []);

  const logout = useCallback(async () => {
    disconnectSocket();
    setSocket(null);
    await authService.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        socket,
        isLoading,
        isAuthenticated: !!user?.token,
        login,
        register,
        logout,
        incomingCall,
        acceptCall,
        rejectCall,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

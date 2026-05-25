// ChitChat Mobile - Auth Context
// Manages auth state, session restoration, and socket lifecycle
// Replaces the per-component getCurrentUser() pattern from the web app

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthData, LoginPayload, RegisterPayload } from '../types';
import * as authService from '../services/authService';
import { initializeSocket, disconnectSocket, getSocket } from '../services/socketService';
import { Socket } from 'socket.io-client';

interface AuthContextType {
  user: AuthData | null;
  socket: Socket | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  socket: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthData | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

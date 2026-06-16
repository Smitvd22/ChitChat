import { createContext, useState, useEffect, useContext, useRef } from 'react';
import { initializeSocket } from '../services/authService';
import { getCurrentUser } from '../services/authService';

const CallContext = createContext();

export function CallProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  // Initialize socket for the app
  useEffect(() => {
    const user = getCurrentUser();
    if (!user) return;

    // Use existing socket
    const socketInstance = initializeSocket();
    if (!socketInstance) return;

    // Store socket references
    socketRef.current = socketInstance;
    setSocket(socketInstance);
    setIsConnected(socketInstance.connected);

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socketInstance.on('connect', onConnect);
    socketInstance.on('disconnect', onDisconnect);

    return () => {
      console.log('Cleaning up call context listeners');
      if (socketRef.current) {
        try {
          socketInstance.off('connect', onConnect);
          socketInstance.off('disconnect', onDisconnect);
        } catch (err) {
          console.error('Error removing listeners:', err);
        }
        socketRef.current = null;
      }
    };
  }, []);

  return (
    <CallContext.Provider
      value={{
        socket,
        isConnected,
        joinChatRoom: (roomId) => {
          if (socket && socket.connected) socket.emit('join-room', roomId);
        },
      }}
    >
      {children}
    </CallContext.Provider>
  );
}

export const useCall = () => useContext(CallContext);
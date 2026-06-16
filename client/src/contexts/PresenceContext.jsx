import React, { createContext, useContext } from 'react';
import { useCall } from './CallContext';
import { usePresence } from '../hooks/usePresence';

const PresenceContext = createContext({
  presenceMap: {},
  getPresence: () => ({ status: 'offline', lastSeen: null }),
  formatLastSeen: () => '',
  requestBulkPresence: () => {},
  requestUserPresence: () => {},
});

/**
 * PresenceProvider — Wraps the app with presence tracking.
 * Uses the socket from CallContext to avoid duplicate connections.
 */
export function PresenceProvider({ children }) {
  const { socket } = useCall();

  const presence = usePresence(socket);

  return (
    <PresenceContext.Provider value={presence}>
      {children}
    </PresenceContext.Provider>
  );
}

export const usePresenceContext = () => useContext(PresenceContext);

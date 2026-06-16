import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * usePresence — Client-side presence tracking hook.
 *
 * Features:
 * - Sends heartbeat every 25 seconds
 * - Listens for presence-update events
 * - Handles beforeunload → going-offline
 * - Handles visibilitychange → going-offline / heartbeat
 * - Formats lastSeen as human-readable string
 * - Requests bulk presence on mount
 */
export function usePresence(socket) {
  const [presenceMap, setPresenceMap] = useState({});
  const heartbeatIntervalRef = useRef(null);
  const hiddenSinceRef = useRef(null);

  const HEARTBEAT_INTERVAL = 25000; // 25 seconds
  const HIDDEN_OFFLINE_THRESHOLD = 30000; // 30 seconds of hidden = going offline

  /**
   * Send heartbeat to server
   */
  const sendHeartbeat = useCallback(() => {
    if (socket && socket.connected) {
      socket.emit('heartbeat');
    }
  }, [socket]);

  /**
   * Request presence for a list of user IDs
   */
  const requestBulkPresence = useCallback((userIds) => {
    if (!socket || !socket.connected || !userIds || userIds.length === 0) return;

    socket.emit('get-presence', { userIds }, (statuses) => {
      if (statuses) {
        setPresenceMap(prev => ({ ...prev, ...statuses }));
      }
    });
  }, [socket]);

  /**
   * Request presence for a single user
   */
  const requestUserPresence = useCallback((userId) => {
    if (!socket || !socket.connected) return;

    socket.emit('get-user-presence', { userId: String(userId) }, (status) => {
      if (status) {
        setPresenceMap(prev => ({
          ...prev,
          [String(userId)]: status,
        }));
      }
    });
  }, [socket]);

  /**
   * Get presence for a user ID
   */
  const getPresence = useCallback((userId) => {
    const uid = String(userId);
    return presenceMap[uid] || { status: 'offline', lastSeen: null };
  }, [presenceMap]);

  /**
   * Format lastSeen timestamp as a human-readable string
   */
  const formatLastSeen = useCallback((lastSeen) => {
    if (!lastSeen) return 'Offline';

    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 30) return 'Active just now';
    if (diffMin < 1) return `Active ${diffSec}s ago`;
    if (diffMin < 60) return `Active ${diffMin}m ago`;
    if (diffHour < 24) {
      return `Last seen today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (diffDay === 1) {
      return `Last seen yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return `Last seen ${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
  }, []);

  /**
   * Setup heartbeat interval
   */
  useEffect(() => {
    if (!socket) return;

    // Send initial heartbeat
    sendHeartbeat();

    // Start heartbeat interval
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [socket, sendHeartbeat]);

  /**
   * Listen for presence updates from server
   */
  useEffect(() => {
    if (!socket) return;

    const handlePresenceUpdate = (update) => {
      setPresenceMap(prev => ({
        ...prev,
        [String(update.userId)]: {
          status: update.status,
          lastSeen: update.lastSeen,
        },
      }));
    };

    socket.on('presence-update', handlePresenceUpdate);
    return () => socket.off('presence-update', handlePresenceUpdate);
  }, [socket]);

  /**
   * Handle beforeunload — notify server we're going offline
   */
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (socket && socket.connected) {
        socket.emit('going-offline');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [socket]);

  /**
   * Handle visibilitychange — going-offline when hidden for too long
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        hiddenSinceRef.current = Date.now();
      } else {
        // Tab is visible again
        if (hiddenSinceRef.current) {
          const hiddenDuration = Date.now() - hiddenSinceRef.current;

          if (hiddenDuration > HIDDEN_OFFLINE_THRESHOLD) {
            // We were hidden for a long time — send heartbeat to re-establish presence
            sendHeartbeat();
          }

          hiddenSinceRef.current = null;
        }

        // Always send heartbeat when becoming visible
        sendHeartbeat();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [socket, sendHeartbeat]);

  return {
    presenceMap,
    getPresence,
    formatLastSeen,
    requestBulkPresence,
    requestUserPresence,
  };
}

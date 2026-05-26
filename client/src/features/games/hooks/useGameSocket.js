/**
 * useGameSocket - Reusable hook for game socket communication
 * 
 * Provides a clean interface for any game to:
 * - Join/leave a game session
 * - Send moves
 * - Request state sync (reconnect-safe)
 * - Handle rematch flow
 * - Persist state to localStorage for reload safety
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { initializeSocket } from '../../../services/authService';

const STORAGE_PREFIX = 'chitchat_game_';

/**
 * Get localStorage key for a game session
 */
function storageKey(roomId, gameId) {
  return `${STORAGE_PREFIX}${roomId}:${gameId}`;
}

/**
 * Save game state to localStorage
 */
function saveGameState(roomId, gameId, state) {
  try {
    localStorage.setItem(storageKey(roomId, gameId), JSON.stringify(state));
  } catch (e) {
    console.warn('[useGameSocket] Failed to save game state to localStorage:', e);
  }
}

/**
 * Load game state from localStorage
 */
function loadGameState(roomId, gameId) {
  try {
    const data = localStorage.getItem(storageKey(roomId, gameId));
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.warn('[useGameSocket] Failed to load game state from localStorage:', e);
    return null;
  }
}

/**
 * Clear game state from localStorage
 */
function clearGameState(roomId, gameId) {
  try {
    localStorage.removeItem(storageKey(roomId, gameId));
  } catch (e) {
    // Ignore
  }
}

/**
 * @param {object} options
 * @param {string} options.roomId - Room ID (e.g., "3-7")
 * @param {string} options.gameId - Game identifier (e.g., "connect4")
 * @param {object} options.player - { id, username }
 */
export function useGameSocket({ roomId, gameId, player }) {
  const [gameState, setGameState] = useState(() => {
    // Try to load cached state for instant UI on reload
    return loadGameState(roomId, gameId);
  });
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const [rematchPending, setRematchPending] = useState(false);
  const [rematchRequested, setRematchRequested] = useState(false);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);

  const socketRef = useRef(null);
  const hasJoined = useRef(false);

  // Connect to socket and set up listeners
  useEffect(() => {
    const socket = initializeSocket();
    if (!socket) {
      console.error('[useGameSocket] No socket available');
      return;
    }

    socketRef.current = socket;
    setConnected(socket.connected);

    const handleConnect = () => {
      setConnected(true);
      // Re-join game on reconnect
      if (player && roomId && gameId) {
        socket.emit('game:join', { roomId, gameId, player });
        hasJoined.current = true;
      }
    };

    const handleDisconnect = () => {
      setConnected(false);
    };

    const handleGameState = (data) => {
      if (data.roomId === roomId && data.gameId === gameId) {
        setGameState(data.state);
        setOpponentDisconnected(false);

        if (data.state) {
          // Save to localStorage for reload safety
          saveGameState(roomId, gameId, data.state);

          // Reset rematch state on new game
          if (data.state.status === 'playing' && data.state.moveHistory?.length === 0) {
            setRematchPending(false);
            setRematchRequested(false);
          }

          // Clear localStorage when game is over and players leave
          // (we keep it during 'finished' for rematch flow)
        }
      }
    };

    const handleError = (data) => {
      console.error('[useGameSocket] Game error:', data.error);
      setError(data.error);
      setTimeout(() => setError(null), 3000);
    };

    const handleRematchRequest = () => {
      setRematchRequested(true);
    };

    const handleRematchPending = () => {
      setRematchPending(true);
    };

    const handlePlayerDisconnected = (data) => {
      const isOpponent = gameState?.players?.some(
        p => p.id === data.playerId && p.id !== player?.id
      );
      if (isOpponent) {
        setOpponentDisconnected(true);
      }
    };

    const handlePlayerLeft = (data) => {
      // Opponent left — game state update with forfeit will follow via game:state
      setOpponentDisconnected(false);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('game:state', handleGameState);
    socket.on('game:error', handleError);
    socket.on('game:rematch-request', handleRematchRequest);
    socket.on('game:rematch-pending', handleRematchPending);
    socket.on('game:player-disconnected', handlePlayerDisconnected);
    socket.on('game:player-left', handlePlayerLeft);

    // Join game if socket is already connected
    if (socket.connected && player && !hasJoined.current) {
      socket.emit('game:join', { roomId, gameId, player });
      hasJoined.current = true;
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('game:state', handleGameState);
      socket.off('game:error', handleError);
      socket.off('game:rematch-request', handleRematchRequest);
      socket.off('game:rematch-pending', handleRematchPending);
      socket.off('game:player-disconnected', handlePlayerDisconnected);
      socket.off('game:player-left', handlePlayerLeft);
      hasJoined.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, gameId, player?.id]);

  const makeMove = useCallback((payload) => {
    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit('game:move', { roomId, gameId, payload });
    }
  }, [roomId, gameId]);

  const requestRematch = useCallback(() => {
    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit('game:rematch', { roomId, gameId });
      setRematchPending(true);
    }
  }, [roomId, gameId]);

  const leaveGame = useCallback(() => {
    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit('game:leave', { roomId, gameId });
    }
    // Clear localStorage on explicit leave
    clearGameState(roomId, gameId);
    setGameState(null);
  }, [roomId, gameId]);

  const requestSync = useCallback(() => {
    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit('game:state', { roomId, gameId });
    }
  }, [roomId, gameId]);

  return {
    gameState,
    error,
    connected,
    rematchPending,
    rematchRequested,
    opponentDisconnected,
    makeMove,
    requestRematch,
    leaveGame,
    requestSync,
  };
}

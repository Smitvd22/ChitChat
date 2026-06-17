/**
 * Generic Game Socket Handler
 * Manages game sessions via Socket.IO, delegates game-specific logic to game modules.
 * 
 * All events use the namespace: game:*
 * Payload shape: { roomId, gameId, type, payload }
 */

import { createGame, makeMove, resetForRematch } from '../games/connect4.js';
import * as tictactoe from '../games/tictactoe.js';
import * as dotsboxes from '../games/dotsboxes.js';
import * as memorycards from '../games/memorycards.js';
import * as numberduel from '../games/numberduel.js';
import * as quoridor from '../games/quoridor.js';

// In-memory store of active game sessions
// Key: `${roomId}:${gameId}`, Value: game state
const gameSessions = new Map();

// Registry of supported games and their logic modules
const gameRegistry = {
  connect4: { createGame, makeMove, resetForRematch },
  tictactoe: tictactoe,
  'dots-boxes': dotsboxes,
  'memory-cards': memorycards,
  'number-duel': numberduel,
  'quoridor': quoridor,
};

/**
 * Get session key for a game
 */
function sessionKey(roomId, gameId) {
  return `${roomId}:${gameId}`;
}

/**
 * Broadcast game state to all players in the room
 */
function broadcastGameState(io, roomId, gameId, state) {
  io.to(`game:${roomId}:${gameId}`).emit('game:state', {
    roomId,
    gameId,
    state,
  });
}

/**
 * Sets up game socket handlers on the Socket.IO instance
 * @param {import('socket.io').Server} io
 */
export function setupGameSocket(io) {
  io.on('connection', (socket) => {

    // ====== JOIN GAME ======
    socket.on('game:join', (data) => {
      try {
        const { roomId, gameId, player } = data;
        console.log(`[Game] ${player.username} (${player.id}) joining ${gameId} in room ${roomId}`);

        const gameMod = gameRegistry[gameId];
        if (!gameMod) {
          socket.emit('game:error', { error: `Unknown game: ${gameId}` });
          return;
        }

        const key = sessionKey(roomId, gameId);
        const gameRoom = `game:${roomId}:${gameId}`;

        // Join the socket room for this game
        socket.join(gameRoom);
        socket.currentGame = { roomId, gameId, playerId: player.id };

        let session = gameSessions.get(key);

        if (!session) {
          // Create new game session
          session = gameMod.createGame([player]);
          session.roomId = roomId;
          gameSessions.set(key, session);
          console.log(`[Game] Created new ${gameId} session for room ${roomId}`);
        } else {
          // Check if player is already in the game (reconnect)
          const existingPlayer = session.players.find(p => p.id === player.id);

          if (existingPlayer) {
            console.log(`[Game] ${player.username} reconnected to ${gameId} in room ${roomId}`);
          } else if (session.players.length < 2) {
            // Add second player
            session.players.push(player);
            if (session.players.length === 2) {
              if (gameId === 'number-duel') {
                session.status = 'setup';
              } else {
                session.status = 'playing';
              }
            }
            console.log(`[Game] ${player.username} joined ${gameId} in room ${roomId}. Players: ${session.players.length}`);
          } else {
            // Game is full and this player isn't in it
            socket.emit('game:error', { error: 'Game is full' });
            return;
          }
        }

        // Send current state to all players
        broadcastGameState(io, roomId, gameId, session);
      } catch (error) {
        console.error('[Game] Error in game:join:', error);
        socket.emit('game:error', { error: 'Failed to join game' });
      }
    });

    // ====== MAKE MOVE ======
    socket.on('game:move', (data) => {
      try {
        const { roomId, gameId, payload } = data;
        const playerId = socket.currentGame?.playerId;

        if (!playerId) {
          socket.emit('game:error', { error: 'Not in a game' });
          return;
        }

        const gameMod = gameRegistry[gameId];
        if (!gameMod) {
          socket.emit('game:error', { error: `Unknown game: ${gameId}` });
          return;
        }

        const key = sessionKey(roomId, gameId);
        const session = gameSessions.get(key);

        if (!session) {
          socket.emit('game:error', { error: 'Game session not found' });
          return;
        }

        // Apply the move using game-specific logic
        const result = gameMod.makeMove(session, payload, playerId);

        if (!result.valid) {
          socket.emit('game:error', { error: result.error });
          return;
        }

        // Update session
        gameSessions.set(key, result.state);

        // Broadcast updated state to all players
        broadcastGameState(io, roomId, gameId, result.state);

        // If game is finished, schedule cleanup after a delay
        if (result.state.status === 'finished') {
          console.log(`[Game] ${gameId} in room ${roomId} finished. Winner: ${result.state.winner}`);
        }
      } catch (error) {
        console.error('[Game] Error in game:move:', error);
        socket.emit('game:error', { error: 'Failed to process move' });
      }
    });

    // ====== REQUEST STATE SYNC ======
    socket.on('game:state', (data) => {
      try {
        const { roomId, gameId } = data;
        const key = sessionKey(roomId, gameId);
        const session = gameSessions.get(key);

        if (session) {
          socket.emit('game:state', { roomId, gameId, state: session });
        } else {
          socket.emit('game:state', { roomId, gameId, state: null });
        }
      } catch (error) {
        console.error('[Game] Error in game:state:', error);
      }
    });

    // ====== REMATCH ======
    socket.on('game:rematch', (data) => {
      try {
        const { roomId, gameId } = data;
        const playerId = socket.currentGame?.playerId;

        if (!playerId) {
          socket.emit('game:error', { error: 'Not in a game' });
          return;
        }

        const gameMod = gameRegistry[gameId];
        const key = sessionKey(roomId, gameId);
        const session = gameSessions.get(key);

        if (!session || session.status !== 'finished') {
          socket.emit('game:error', { error: 'No finished game to rematch' });
          return;
        }

        // Track rematch requests
        if (!session.rematchRequests.includes(playerId)) {
          session.rematchRequests.push(playerId);
        }

        // If both players requested rematch
        if (session.rematchRequests.length >= 2) {
          const newState = gameMod.resetForRematch(session);
          newState.roomId = roomId;
          gameSessions.set(key, newState);
          console.log(`[Game] Rematch started for ${gameId} in room ${roomId}`);
          broadcastGameState(io, roomId, gameId, newState);
        } else {
          // Notify other player about rematch request
          const gameRoom = `game:${roomId}:${gameId}`;
          socket.to(gameRoom).emit('game:rematch-request', { playerId });
          socket.emit('game:rematch-pending', { message: 'Waiting for opponent' });
        }
      } catch (error) {
        console.error('[Game] Error in game:rematch:', error);
        socket.emit('game:error', { error: 'Failed to process rematch' });
      }
    });

    // ====== LEAVE GAME ======
    socket.on('game:leave', (data) => {
      try {
        const { roomId, gameId } = data;
        handlePlayerLeave(io, socket, roomId, gameId);
      } catch (error) {
        console.error('[Game] Error in game:leave:', error);
      }
    });

    // ====== DISCONNECT ======
    socket.on('disconnect', () => {
      if (socket.currentGame) {
        const { roomId, gameId } = socket.currentGame;
        // Don't immediately destroy the session on disconnect — allow reconnect
        const gameRoom = `game:${roomId}:${gameId}`;
        socket.to(gameRoom).emit('game:player-disconnected', {
          playerId: socket.currentGame.playerId,
        });
        console.log(`[Game] Player ${socket.currentGame.playerId} disconnected from ${gameId} in room ${roomId}`);
      }
    });
  });
}

/**
 * Handle player leaving a game
 */
function handlePlayerLeave(io, socket, roomId, gameId) {
  const key = sessionKey(roomId, gameId);
  const gameRoom = `game:${roomId}:${gameId}`;
  const playerId = socket.currentGame?.playerId;

  socket.leave(gameRoom);
  socket.currentGame = null;

  const session = gameSessions.get(key);
  if (session && playerId) {
    // Notify remaining players
    io.to(gameRoom).emit('game:player-left', { playerId });

    // If game was in progress, opponent wins by forfeit
    if (session.status === 'playing') {
      const leavingIndex = session.players.findIndex(p => p.id === playerId);
      if (leavingIndex !== -1) {
        session.status = 'finished';
        session.winner = leavingIndex === 0 ? 1 : 0;
        broadcastGameState(io, roomId, gameId, session);
      }
    }

    // Clean up session after both players leave
    const room = io.sockets.adapter.rooms.get(gameRoom);
    if (!room || room.size === 0) {
      gameSessions.delete(key);
      console.log(`[Game] Cleaned up ${gameId} session for room ${roomId}`);
    }
  }
}

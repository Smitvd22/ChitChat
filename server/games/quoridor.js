/**
 * Quoridor - Pure Game Logic Module
 */

export function createGame(players) {
  return {
    gameId: 'quoridor',
    players,
    status: players.length === 2 ? 'playing' : 'waiting', // waiting -> playing -> finished
    currentTurn: 0,
    pawns: [
      { r: 0, c: 4 }, // Player 1 starts top center
      { r: 8, c: 4 }, // Player 2 starts bottom center
    ],
    walls: [], // Array of { r, c, type: 'H' | 'V', placedBy: 0 | 1 }
    remainingWalls: [10, 10], // Player 1, Player 2
    winner: null,
    totalTurns: 0,
    rematchRequests: [],
    lastMoveTimestamp: Date.now(),
  };
}

// Helper to check if movement between two adjacent cells is blocked by a wall
function isMoveBlocked(r1, c1, r2, c2, walls) {
  if (r1 === r2) {
    // Horizontal move
    const leftC = Math.min(c1, c2);
    // Blocked if vertical wall at (r1, leftC) or (r1-1, leftC)
    return walls.some(
      w => w.type === 'V' && w.c === leftC && (w.r === r1 || w.r === r1 - 1)
    );
  } else if (c1 === c2) {
    // Vertical move
    const topR = Math.min(r1, r2);
    // Blocked if horizontal wall at (topR, c1) or (topR, c1-1)
    return walls.some(
      w => w.type === 'H' && w.r === topR && (w.c === c1 || w.c === c1 - 1)
    );
  }
  return true; // Invalid move (diagonal, etc)
}

// BFS to check if a player can reach their target row
function hasPath(startR, startC, targetR, walls) {
  const queue = [{ r: startR, c: startC }];
  const visited = new Set();
  visited.add(`${startR},${startC}`);

  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  let head = 0;
  while (head < queue.length) {
    const curr = queue[head++];
    if (curr.r === targetR) return true;

    for (const [dr, dc] of dirs) {
      const nr = curr.r + dr;
      const nc = curr.c + dc;

      if (nr >= 0 && nr <= 8 && nc >= 0 && nc <= 8) {
        if (!isMoveBlocked(curr.r, curr.c, nr, nc, walls)) {
          const key = `${nr},${nc}`;
          if (!visited.has(key)) {
            visited.add(key);
            queue.push({ r: nr, c: nc });
          }
        }
      }
    }
  }
  return false;
}

export function makeMove(state, payload, playerId) {
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) {
    return { valid: false, error: 'Player not in this game' };
  }

  const newState = { ...state, lastMoveTimestamp: Date.now() };

  // Playing phase actions
  if (state.status === 'playing') {
    if (playerIndex !== state.currentTurn) {
      return { valid: false, error: 'Not your turn' };
    }

    if (payload.action === 'move_pawn') {
      const { r, c } = payload.destination;
      const curr = state.pawns[playerIndex];

      // Validate bounds
      if (r < 0 || r > 8 || c < 0 || c > 8) {
        return { valid: false, error: 'Out of bounds' };
      }

      // Validate exactly 1 step adjacent
      const dr = Math.abs(r - curr.r);
      const dc = Math.abs(c - curr.c);
      if (dr + dc !== 1) {
        return { valid: false, error: 'Invalid move: must be 1 square adjacent' };
      }

      // Validate no wall blocking
      if (isMoveBlocked(curr.r, curr.c, r, c, state.walls)) {
        return { valid: false, error: 'Movement blocked by a wall' };
      }

      // Apply move
      const newPawns = [...state.pawns];
      newPawns[playerIndex] = { r, c };
      newState.pawns = newPawns;
      newState.totalTurns++;

      // Check win condition
      const targetRow = playerIndex === 0 ? 8 : 0;
      if (r === targetRow) {
        newState.status = 'finished';
        newState.winner = playerIndex;
      } else {
        newState.currentTurn = playerIndex === 0 ? 1 : 0;
      }

      return { valid: true, state: newState };
    }

    if (payload.action === 'place_wall') {
      if (state.remainingWalls[playerIndex] <= 0) {
        return { valid: false, error: 'No walls remaining' };
      }

      const { r, c, type } = payload.wall; // r: 0-7, c: 0-7, type: 'H' or 'V'

      // Validate bounds
      if (r < 0 || r > 7 || c < 0 || c > 7) {
        return { valid: false, error: 'Wall out of bounds' };
      }

      // Validate overlap & intersection
      for (const w of state.walls) {
        if (w.r === r && w.c === c) {
          return { valid: false, error: 'Walls cannot intersect or perfectly overlap' };
        }
        if (type === 'H' && w.type === 'H' && w.r === r && Math.abs(w.c - c) === 1) {
          return { valid: false, error: 'Walls cannot overlap partially' };
        }
        if (type === 'V' && w.type === 'V' && w.c === c && Math.abs(w.r - r) === 1) {
          return { valid: false, error: 'Walls cannot overlap partially' };
        }
      }

      const newWalls = [...state.walls, { r, c, type, placedBy: playerIndex }];

      // Validate paths
      if (!hasPath(state.pawns[0].r, state.pawns[0].c, 8, newWalls)) {
        return { valid: false, error: 'Wall completely blocks Player 1 path' };
      }
      if (!hasPath(state.pawns[1].r, state.pawns[1].c, 0, newWalls)) {
        return { valid: false, error: 'Wall completely blocks Player 2 path' };
      }

      // Apply placement
      newState.walls = newWalls;
      const newRemaining = [...state.remainingWalls];
      newRemaining[playerIndex]--;
      newState.remainingWalls = newRemaining;
      newState.totalTurns++;
      newState.currentTurn = playerIndex === 0 ? 1 : 0;

      return { valid: true, state: newState };
    }
  }

  return { valid: false, error: 'Invalid move' };
}

export function resetForRematch(state) {
  const newState = createGame(state.players);
  newState.status = 'playing'; // Rematch skips waiting since both are present
  return newState;
}

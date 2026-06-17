const SHIPS_CONFIG = [
  { id: 'carrier', name: 'Carrier', size: 5 },
  { id: 'battleship', name: 'Battleship', size: 4 },
  { id: 'cruiser', name: 'Cruiser', size: 3 },
  { id: 'submarine', name: 'Submarine', size: 3 },
  { id: 'destroyer', name: 'Destroyer', size: 2 },
];

export function createGame(players) {
  return {
    gameId: 'seabattle',
    players,
    status: players.length === 2 ? 'setup' : 'waiting',
    currentTurn: 0,
    boards: [
      { ready: false, ships: [], incomingShots: [] },
      { ready: false, ships: [], incomingShots: [] }
    ],
    winner: null,
    totalTurns: 0,
    message: '',
    rematchRequests: []
  };
}

/**
 * Strips hidden information from the state before sending to the client.
 * Players should not see the opponent's unsunk ships.
 */
export function filterState(state, playerId) {
  const filteredState = JSON.parse(JSON.stringify(state)); // Deep clone
  
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  
  // If player is not in game or game is waiting, just return state (no ships placed yet anyway)
  if (playerIndex === -1) return filteredState;

  const opponentIndex = playerIndex === 0 ? 1 : 0;

  // Redact opponent's ships that are NOT sunk
  if (filteredState.boards[opponentIndex]) {
    filteredState.boards[opponentIndex].ships = filteredState.boards[opponentIndex].ships.map(ship => {
      const isSunk = ship.hits === ship.size;
      if (isSunk || state.status === 'finished') {
        return { ...ship, isSunk: true }; // Reveal sunk ships or all ships if game over
      } else {
        // Redact location
        return { id: ship.id, name: ship.name, size: ship.size, hits: ship.hits, isSunk: false };
      }
    });
  }

  return filteredState;
}

// Helper to check overlap
function isOverlap(shipA, shipB) {
  const getCells = (ship) => {
    const cells = [];
    for (let i = 0; i < ship.size; i++) {
      if (ship.orientation === 'H') cells.push(`${ship.r},${ship.c + i}`);
      else cells.push(`${ship.r + i},${ship.c}`);
    }
    return cells;
  };
  
  const cellsA = getCells(shipA);
  const cellsB = getCells(shipB);
  
  return cellsA.some(cell => cellsB.includes(cell));
}

export function makeMove(state, payload, playerId) {
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return { valid: false, error: 'Not a player in this game' };

  const newState = { ...state, lastMoveTimestamp: Date.now() };
  const opponentIndex = playerIndex === 0 ? 1 : 0;

  // --- SETUP PHASE ---
  if (state.status === 'setup') {
    if (payload.action === 'place_ships') {
      const { ships } = payload;
      
      // Basic validation
      if (!Array.isArray(ships) || ships.length !== SHIPS_CONFIG.length) {
        return { valid: false, error: 'Invalid fleet configuration' };
      }

      // Validate bounds and overlaps
      for (let i = 0; i < ships.length; i++) {
        const ship = ships[i];
        const config = SHIPS_CONFIG.find(c => c.id === ship.id);
        if (!config) return { valid: false, error: `Invalid ship id: ${ship.id}` };

        // Check bounds
        if (ship.orientation === 'H' && (ship.c < 0 || ship.c + config.size > 10 || ship.r < 0 || ship.r > 9)) {
          return { valid: false, error: 'Ship out of bounds' };
        }
        if (ship.orientation === 'V' && (ship.r < 0 || ship.r + config.size > 10 || ship.c < 0 || ship.c > 9)) {
          return { valid: false, error: 'Ship out of bounds' };
        }

        // Check overlaps
        for (let j = 0; j < i; j++) {
          if (isOverlap({ ...ship, size: config.size }, { ...ships[j], size: SHIPS_CONFIG.find(c => c.id === ships[j].id).size })) {
            return { valid: false, error: 'Ships overlap' };
          }
        }
      }

      // Save ships
      newState.boards[playerIndex].ships = ships.map(s => ({
        ...s,
        size: SHIPS_CONFIG.find(c => c.id === s.id).size,
        name: SHIPS_CONFIG.find(c => c.id === s.id).name,
        hits: 0
      }));
      newState.boards[playerIndex].ready = true;

      // Check if both ready
      if (newState.boards[0].ready && newState.boards[1].ready) {
        newState.status = 'playing';
        newState.currentTurn = 0; // Player 0 always starts
        newState.message = 'Game started! Player 1 attacks first.';
      } else {
        newState.message = 'Waiting for opponent to place ships...';
      }

      return { valid: true, state: newState };
    }
    
    return { valid: false, error: 'Invalid action for setup phase' };
  }

  // --- PLAYING PHASE ---
  if (state.status === 'playing') {
    if (playerIndex !== state.currentTurn) {
      return { valid: false, error: 'Not your turn' };
    }

    if (payload.action === 'fire') {
      const { r, c } = payload.destination;
      
      if (r < 0 || r > 9 || c < 0 || c > 9) return { valid: false, error: 'Target out of bounds' };

      const opponentBoard = newState.boards[opponentIndex];
      
      // Check if already fired here
      if (opponentBoard.incomingShots.some(shot => shot.r === r && shot.c === c)) {
        return { valid: false, error: 'Already fired at this location' };
      }

      newState.totalTurns++;

      // Determine Hit or Miss
      let hitShip = null;
      for (const ship of opponentBoard.ships) {
        const isHit = ship.orientation === 'H' 
          ? (r === ship.r && c >= ship.c && c < ship.c + ship.size)
          : (c === ship.c && r >= ship.r && r < ship.r + ship.size);

        if (isHit) {
          hitShip = ship;
          break;
        }
      }

      if (hitShip) {
        hitShip.hits += 1;
        const isSunk = hitShip.hits === hitShip.size;
        
        opponentBoard.incomingShots.push({ r, c, status: 'hit', shipId: hitShip.id, sunk: isSunk });
        
        // Check win condition
        const allSunk = opponentBoard.ships.every(s => s.hits === s.size);
        if (allSunk) {
          newState.status = 'finished';
          newState.winner = playerIndex;
          newState.message = 'All enemy ships destroyed!';
        } else {
          // Extra turn!
          newState.message = isSunk 
            ? `Direct hit! You sunk the opponent's ${hitShip.name}! You get another shot.`
            : `Direct hit! You get another shot.`;
        }
      } else {
        opponentBoard.incomingShots.push({ r, c, status: 'miss' });
        newState.currentTurn = opponentIndex;
        newState.message = `Miss! Opponent's turn.`;
      }

      return { valid: true, state: newState };
    }

    return { valid: false, error: 'Invalid action' };
  }

  return { valid: false, error: 'Game is finished or waiting' };
}

export function resetForRematch(state) {
  const newState = createGame(state.players);
  // Status stays setup so players can re-place ships
  return newState;
}

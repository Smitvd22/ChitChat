/**
 * Memory Cards - Pure Game Logic Module
 *
 * Board: 4x4 grid (16 cards, 8 pairs)
 */

const EMOJIS = ['🍎', '🍌', '🍇', '🍉', '🍓', '🍒', '🍍', '🥝'];

// Helper to shuffle an array
function shuffle(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export function createGame(players) {
  const deck = shuffle([...EMOJIS, ...EMOJIS]); // 16 cards

  return {
    gameId: 'memory-cards',
    players,
    cards: deck,
    flippedIndices: [], // 0 or 1 item
    matchedIndices: [],
    lastMismatch: null,
    mismatchTimestamp: null,
    scores: [0, 0],
    currentTurn: 0,
    status: players.length === 2 ? 'playing' : 'waiting',
    winner: null,
    rematchRequests: [],
    moveHistory: [],
    lastMoveTimestamp: Date.now(),
  };
}

export function makeMove(state, payload, playerId) {
  if (state.status !== 'playing') {
    return { valid: false, error: 'Game is not in progress' };
  }

  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1 || playerIndex !== state.currentTurn) {
    return { valid: false, error: 'Not your turn' };
  }

  const { cellIndex } = payload;

  if (cellIndex < 0 || cellIndex > 15) {
    return { valid: false, error: 'Invalid card index' };
  }

  if (state.matchedIndices.includes(cellIndex) || state.flippedIndices.includes(cellIndex)) {
    return { valid: false, error: 'Card already flipped' };
  }

  const newState = {
    ...state,
    flippedIndices: [...state.flippedIndices],
    matchedIndices: [...state.matchedIndices],
    scores: [...state.scores],
    moveHistory: [...state.moveHistory, { cellIndex, player: playerIndex }],
    lastMoveTimestamp: Date.now(),
  };

  if (newState.flippedIndices.length === 0) {
    // Flip first card
    newState.flippedIndices = [cellIndex];
    newState.lastMismatch = null;
  } else if (newState.flippedIndices.length === 1) {
    // Flip second card
    const idx1 = newState.flippedIndices[0];
    const idx2 = cellIndex;

    if (newState.cards[idx1] === newState.cards[idx2]) {
      // Match!
      newState.matchedIndices.push(idx1, idx2);
      newState.scores[playerIndex]++;
      newState.flippedIndices = [];
      newState.lastMismatch = null;
    } else {
      // Mismatch
      newState.flippedIndices = [];
      newState.lastMismatch = [idx1, idx2];
      newState.mismatchTimestamp = Date.now();
      // Pass turn
      newState.currentTurn = playerIndex === 0 ? 1 : 0;
    }
  } else {
    // Should not happen, but safeguard
    newState.flippedIndices = [cellIndex];
    newState.lastMismatch = null;
  }

  // Check end condition
  if (newState.matchedIndices.length === 16) {
    newState.status = 'finished';
    if (newState.scores[0] > newState.scores[1]) newState.winner = 0;
    else if (newState.scores[1] > newState.scores[0]) newState.winner = 1;
    else newState.winner = 'draw';
  }

  return { valid: true, state: newState };
}

export function resetForRematch(state) {
  const newState = createGame(state.players);
  newState.currentTurn = state.players.length === 2 ? (state.currentTurn === 0 ? 1 : 0) : 0;
  newState.status = 'playing';
  return newState;
}

/**
 * Dots and Boxes - Pure Game Logic Module
 *
 * Board: 5x5 dots (4x4 boxes)
 */

const DOTS_R = 5;
const DOTS_C = 5;

export function createGame(players) {
  return {
    gameId: 'dots-boxes',
    players,
    // hLines: 5 rows of 4 lines
    hLines: Array(DOTS_R).fill(null).map(() => Array(DOTS_C - 1).fill(false)),
    // vLines: 4 rows of 5 lines
    vLines: Array(DOTS_R - 1).fill(null).map(() => Array(DOTS_C).fill(false)),
    // boxes: 4 rows of 4 boxes
    boxes: Array(DOTS_R - 1).fill(null).map(() => Array(DOTS_C - 1).fill(null)),
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

  const { type, r, c } = payload; // type: 'h' or 'v'

  // Validate bounds
  if (type === 'h') {
    if (r < 0 || r >= DOTS_R || c < 0 || c >= DOTS_C - 1) return { valid: false, error: 'Out of bounds' };
    if (state.hLines[r][c]) return { valid: false, error: 'Line already drawn' };
  } else if (type === 'v') {
    if (r < 0 || r >= DOTS_R - 1 || c < 0 || c >= DOTS_C) return { valid: false, error: 'Out of bounds' };
    if (state.vLines[r][c]) return { valid: false, error: 'Line already drawn' };
  } else {
    return { valid: false, error: 'Invalid line type' };
  }

  // Clone state
  const newState = {
    ...state,
    hLines: state.hLines.map(row => [...row]),
    vLines: state.vLines.map(row => [...row]),
    boxes: state.boxes.map(row => [...row]),
    scores: [...state.scores],
    moveHistory: [...state.moveHistory, { type, r, c, player: playerIndex }],
    lastMoveTimestamp: Date.now(),
  };

  // Apply move
  if (type === 'h') {
    newState.hLines[r][c] = true;
  } else {
    newState.vLines[r][c] = true;
  }

  // Check for completed boxes
  let boxesCompleted = 0;

  const checkAndClaimBox = (br, bc) => {
    if (br >= 0 && br < DOTS_R - 1 && bc >= 0 && bc < DOTS_C - 1) {
      if (
        newState.boxes[br][bc] === null &&
        newState.hLines[br][bc] &&
        newState.hLines[br + 1][bc] &&
        newState.vLines[br][bc] &&
        newState.vLines[br][bc + 1]
      ) {
        newState.boxes[br][bc] = playerIndex;
        newState.scores[playerIndex]++;
        boxesCompleted++;
      }
    }
  };

  if (type === 'h') {
    checkAndClaimBox(r - 1, c); // Box above
    checkAndClaimBox(r, c);     // Box below
  } else {
    checkAndClaimBox(r, c - 1); // Box left
    checkAndClaimBox(r, c);     // Box right
  }

  // Check end condition
  const totalBoxes = (DOTS_R - 1) * (DOTS_C - 1);
  if (newState.scores[0] + newState.scores[1] === totalBoxes) {
    newState.status = 'finished';
    if (newState.scores[0] > newState.scores[1]) newState.winner = 0;
    else if (newState.scores[1] > newState.scores[0]) newState.winner = 1;
    else newState.winner = 'draw';
  } else if (boxesCompleted === 0) {
    // Only advance turn if no boxes were completed
    newState.currentTurn = playerIndex === 0 ? 1 : 0;
  }

  return { valid: true, state: newState };
}

export function resetForRematch(state) {
  const newState = createGame(state.players);
  newState.currentTurn = state.players.length === 2 ? (state.currentTurn === 0 ? 1 : 0) : 0;
  newState.status = 'playing';
  return newState;
}

/**
 * Tic Tac Toe - Pure Game Logic Module
 * No socket/IO dependency — pure functions for game state management.
 *
 * Board: 3x3 grid, represented as a 1D array of 9 elements.
 * Values: 0 = empty, 1 = Player 1 (X), 2 = Player 2 (O)
 */

/**
 * Creates a fresh Tic Tac Toe game state
 * @param {Array<{id: string, username: string}>} players
 * @returns {object} Initial game state
 */
export function createGame(players) {
  return {
    gameId: 'tictactoe',
    players,
    board: Array(9).fill(0),
    currentTurn: 0, // index into players array
    status: players.length === 2 ? 'playing' : 'waiting',
    winner: null,    // null | 0 | 1 | 'draw'
    winningCells: null, // array of winning indices
    rematchRequests: [],
    moveHistory: [],
    lastMoveTimestamp: Date.now(),
  };
}

/**
 * Validates and applies a move
 * @param {object} state - Current game state
 * @param {object} payload - Move payload
 * @param {string} playerId - ID of the player making the move
 * @returns {{ valid: boolean, state?: object, error?: string }}
 */
export function makeMove(state, payload, playerId) {
  const cellIndex = payload.cellIndex;

  if (state.status !== 'playing') {
    return { valid: false, error: 'Game is not in progress' };
  }

  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) {
    return { valid: false, error: 'Player not in this game' };
  }
  if (playerIndex !== state.currentTurn) {
    return { valid: false, error: 'Not your turn' };
  }

  if (cellIndex < 0 || cellIndex > 8 || state.board[cellIndex] !== 0) {
    return { valid: false, error: 'Invalid move' };
  }

  // Apply move
  const newBoard = [...state.board];
  const playerValue = playerIndex + 1; // 1 or 2
  newBoard[cellIndex] = playerValue;

  const winResult = checkWinner(newBoard);
  const isDraw = !winResult && !newBoard.includes(0);

  const newState = {
    ...state,
    board: newBoard,
    moveHistory: [...state.moveHistory, { cellIndex, player: playerIndex }],
    lastMoveTimestamp: Date.now(),
  };

  if (winResult) {
    newState.status = 'finished';
    newState.winner = playerIndex;
    newState.winningCells = winResult;
  } else if (isDraw) {
    newState.status = 'finished';
    newState.winner = 'draw';
  } else {
    newState.currentTurn = playerIndex === 0 ? 1 : 0;
  }

  return { valid: true, state: newState };
}

/**
 * Checks for a winner
 * @param {number[]} board 
 * @returns {number[]|null} Array of winning cell indices, or null
 */
function checkWinner(board) {
  const winLines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
    [0, 4, 8], [2, 4, 6]             // Diagonals
  ];

  for (const line of winLines) {
    const [a, b, c] = line;
    if (board[a] !== 0 && board[a] === board[b] && board[a] === board[c]) {
      return line;
    }
  }

  return null;
}

/**
 * Resets a game for rematch (swaps who goes first)
 */
export function resetForRematch(state) {
  const newState = createGame(state.players);
  newState.currentTurn = state.players.length === 2 ? (state.currentTurn === 0 ? 1 : 0) : 0;
  newState.status = 'playing';
  return newState;
}

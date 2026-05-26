/**
 * Connect 4 - Pure Game Logic Module
 * No socket/IO dependency — pure functions for game state management.
 *
 * Board: 6 rows × 7 columns
 * Values: 0 = empty, 1 = Player 1, 2 = Player 2
 */

const ROWS = 6;
const COLS = 7;
const WIN_LENGTH = 4;

/**
 * Creates a fresh Connect 4 game state
 * @param {Array<{id: string, username: string}>} players
 * @returns {object} Initial game state
 */
export function createGame(players) {
  return {
    gameId: 'connect4',
    players,
    board: Array.from({ length: ROWS }, () => Array(COLS).fill(0)),
    currentTurn: 0, // index into players array
    status: players.length === 2 ? 'playing' : 'waiting',
    winner: null,    // null | 0 | 1 | 'draw'
    winningCells: null, // array of [row, col] for winning line
    rematchRequests: [],
    moveHistory: [],
    lastMoveTimestamp: Date.now(),
  };
}

/**
 * Finds the lowest empty row in a column
 * @param {number[][]} board
 * @param {number} col
 * @returns {number} Row index or -1 if column is full
 */
function findAvailableRow(board, col) {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[row][col] === 0) {
      return row;
    }
  }
  return -1;
}

/**
 * Validates and applies a move
 * @param {object} state - Current game state
 * @param {number} col - Column to drop disc (0-6)
 * @param {string} playerId - ID of the player making the move
 * @returns {{ valid: boolean, state?: object, error?: string }}
 */
export function makeMove(state, col, playerId) {
  // Validate game is active
  if (state.status !== 'playing') {
    return { valid: false, error: 'Game is not in progress' };
  }

  // Validate it's this player's turn
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) {
    return { valid: false, error: 'Player not in this game' };
  }
  if (playerIndex !== state.currentTurn) {
    return { valid: false, error: 'Not your turn' };
  }

  // Validate column
  if (col < 0 || col >= COLS) {
    return { valid: false, error: 'Invalid column' };
  }

  // Find available row
  const row = findAvailableRow(state.board, col);
  if (row === -1) {
    return { valid: false, error: 'Column is full' };
  }

  // Apply move — create new board (immutable)
  const newBoard = state.board.map(r => [...r]);
  const discValue = playerIndex + 1; // 1 or 2
  newBoard[row][col] = discValue;

  // Check for winner
  const winResult = checkWinner(newBoard, row, col, discValue);

  // Check for draw
  const isDraw = !winResult && checkDraw(newBoard);

  // Build new state
  const newState = {
    ...state,
    board: newBoard,
    moveHistory: [...state.moveHistory, { row, col, player: playerIndex }],
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
    // Next player's turn
    newState.currentTurn = playerIndex === 0 ? 1 : 0;
  }

  return { valid: true, state: newState };
}

/**
 * Checks if the last move created a win
 * @param {number[][]} board
 * @param {number} row - Row of last move
 * @param {number} col - Column of last move
 * @param {number} disc - Disc value (1 or 2)
 * @returns {Array<[number,number]>|null} Winning cells or null
 */
function checkWinner(board, row, col, disc) {
  const directions = [
    [0, 1],  // horizontal
    [1, 0],  // vertical
    [1, 1],  // diagonal down-right
    [1, -1], // diagonal down-left
  ];

  for (const [dr, dc] of directions) {
    const cells = [[row, col]];

    // Check in positive direction
    for (let i = 1; i < WIN_LENGTH; i++) {
      const r = row + dr * i;
      const c = col + dc * i;
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === disc) {
        cells.push([r, c]);
      } else {
        break;
      }
    }

    // Check in negative direction
    for (let i = 1; i < WIN_LENGTH; i++) {
      const r = row - dr * i;
      const c = col - dc * i;
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === disc) {
        cells.push([r, c]);
      } else {
        break;
      }
    }

    if (cells.length >= WIN_LENGTH) {
      return cells;
    }
  }

  return null;
}

/**
 * Checks if the board is completely full (draw)
 * @param {number[][]} board
 * @returns {boolean}
 */
function checkDraw(board) {
  return board[0].every(cell => cell !== 0);
}

/**
 * Resets a game for rematch (swaps who goes first)
 * @param {object} state - Finished game state
 * @returns {object} New game state
 */
export function resetForRematch(state) {
  const newState = createGame(state.players);
  // Swap who goes first
  newState.currentTurn = state.players.length === 2 ? (state.currentTurn === 0 ? 1 : 0) : 0;
  newState.status = 'playing';
  return newState;
}

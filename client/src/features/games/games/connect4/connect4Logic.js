/**
 * Connect 4 - Client-side Logic
 * Mirrors server validation for instant UI feedback.
 */

const ROWS = 6;
const COLS = 7;

/**
 * Check if a column has space for a new disc
 * @param {number[][]} board
 * @param {number} col
 * @returns {boolean}
 */
export function isColumnAvailable(board, col) {
  return board[0][col] === 0;
}

/**
 * Find the row where a disc would land in a column
 * @param {number[][]} board
 * @param {number} col
 * @returns {number} Row index or -1
 */
export function findLandingRow(board, col) {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[row][col] === 0) {
      return row;
    }
  }
  return -1;
}

/**
 * Check if a cell is part of the winning line
 * @param {Array<[number,number]>|null} winningCells
 * @param {number} row
 * @param {number} col
 * @returns {boolean}
 */
export function isWinningCell(winningCells, row, col) {
  if (!winningCells) return false;
  return winningCells.some(([r, c]) => r === row && c === col);
}

export { ROWS, COLS };

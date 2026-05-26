import React from 'react';

/**
 * TicTacToeBoard - The main board UI component
 * Renders 3x3 grid
 */
const TicTacToeBoard = ({ board, currentTurn, myPlayerIndex, status, winningCells, onCellClick }) => {
  const isMyTurn = currentTurn === myPlayerIndex && status === 'playing';

  const handleClick = (index) => {
    if (isMyTurn && board && board[index] === 0) {
      onCellClick(index);
    }
  };

  if (!board) return null;

  return (
    <div className="ttt-board-wrapper">
      <div className="ttt-board">
        {board.map((cell, index) => {
          const isWinning = winningCells && winningCells.includes(index);
          const cellValue = cell === 1 ? 'X' : cell === 2 ? 'O' : '';
          const playerClass = cell === 1 ? 'ttt-player1' : cell === 2 ? 'ttt-player2' : '';
          const winningClass = isWinning ? 'ttt-winning' : '';
          const clickableClass = (isMyTurn && cell === 0) ? 'ttt-clickable' : '';
          
          return (
            <div
              key={index}
              className={`ttt-cell ${playerClass} ${winningClass} ${clickableClass}`}
              onClick={() => handleClick(index)}
            >
              {cellValue}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TicTacToeBoard;

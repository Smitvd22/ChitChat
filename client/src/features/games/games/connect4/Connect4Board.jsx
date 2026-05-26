import React, { useState } from 'react';
import Connect4Disc from './Connect4Disc';
import { COLS, isColumnAvailable, isWinningCell } from './connect4Logic';

/**
 * Connect4Board - The main board UI component
 * Renders 6×7 grid with hover previews, disc drops, and winning highlights.
 */
const Connect4Board = ({ board, currentTurn, myPlayerIndex, status, winningCells, onColumnClick }) => {
  const [hoverCol, setHoverCol] = useState(null);

  const isMyTurn = currentTurn === myPlayerIndex && status === 'playing';
  const canInteract = isMyTurn && status === 'playing';

  const handleColumnHover = (col) => {
    if (canInteract && board && isColumnAvailable(board, col)) {
      setHoverCol(col);
    } else {
      setHoverCol(null);
    }
  };

  const handleColumnClick = (col) => {
    if (canInteract && board && isColumnAvailable(board, col)) {
      onColumnClick(col);
      setHoverCol(null);
    }
  };

  if (!board) return null;

  return (
    <div className="c4-board-wrapper">
      {/* Column hover indicators */}
      <div className="c4-column-indicators">
        {Array.from({ length: COLS }, (_, col) => (
          <div
            key={`indicator-${col}`}
            className={`c4-column-indicator ${hoverCol === col ? 'c4-indicator-active' : ''}`}
            onMouseEnter={() => handleColumnHover(col)}
            onMouseLeave={() => setHoverCol(null)}
            onClick={() => handleColumnClick(col)}
          >
            {hoverCol === col && canInteract && (
              <div className={`c4-preview-disc c4-disc-player${myPlayerIndex + 1}`} />
            )}
          </div>
        ))}
      </div>

      {/* Board grid */}
      <div className="c4-board">
        {board.map((row, rowIndex) => (
          <div key={`row-${rowIndex}`} className="c4-row">
            {row.map((cell, colIndex) => {
              const winning = isWinningCell(winningCells, rowIndex, colIndex);
              return (
                <div
                  key={`cell-${rowIndex}-${colIndex}`}
                  className={`c4-cell ${hoverCol === colIndex && canInteract ? 'c4-cell-hover' : ''}`}
                  onMouseEnter={() => handleColumnHover(colIndex)}
                  onMouseLeave={() => setHoverCol(null)}
                  onClick={() => handleColumnClick(colIndex)}
                >
                  <div className="c4-cell-hole">
                    {cell !== 0 && (
                      <Connect4Disc
                        player={cell}
                        isWinning={winning}
                        row={rowIndex}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Connect4Board;

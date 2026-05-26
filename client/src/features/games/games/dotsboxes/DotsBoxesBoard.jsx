import React from 'react';

const DOTS_R = 5;
const DOTS_C = 5;

const DotsBoxesBoard = ({ gameState, myPlayerIndex, onLineClick }) => {
  if (!gameState) return null;
  const { hLines, vLines, boxes, currentTurn, status } = gameState;
  
  const isMyTurn = currentTurn === myPlayerIndex && status === 'playing';

  // Grid will be 9x9 elements
  const gridCells = [];
  
  for (let r = 0; r < DOTS_R * 2 - 1; r++) {
    for (let c = 0; c < DOTS_C * 2 - 1; c++) {
      const isEvenRow = r % 2 === 0;
      const isEvenCol = c % 2 === 0;
      
      if (isEvenRow && isEvenCol) {
        // Dot
        gridCells.push(<div key={`${r}-${c}`} className="db-dot" />);
      } else if (isEvenRow && !isEvenCol) {
        // Horizontal line
        const lineR = r / 2;
        const lineC = Math.floor((c - 1) / 2);
        const isDrawn = hLines[lineR]?.[lineC];
        const canClick = isMyTurn && !isDrawn;
        
        gridCells.push(
          <div 
            key={`${r}-${c}`} 
            className={`db-hline ${isDrawn ? 'db-drawn' : ''} ${canClick ? 'db-clickable' : ''}`}
            onClick={() => canClick && onLineClick('h', lineR, lineC)}
          />
        );
      } else if (!isEvenRow && isEvenCol) {
        // Vertical line
        const lineR = Math.floor((r - 1) / 2);
        const lineC = c / 2;
        const isDrawn = vLines[lineR]?.[lineC];
        const canClick = isMyTurn && !isDrawn;
        
        gridCells.push(
          <div 
            key={`${r}-${c}`} 
            className={`db-vline ${isDrawn ? 'db-drawn' : ''} ${canClick ? 'db-clickable' : ''}`}
            onClick={() => canClick && onLineClick('v', lineR, lineC)}
          />
        );
      } else {
        // Box
        const boxR = Math.floor((r - 1) / 2);
        const boxC = Math.floor((c - 1) / 2);
        const owner = boxes[boxR]?.[boxC];
        const playerClass = owner === 0 ? 'db-box-p1' : owner === 1 ? 'db-box-p2' : '';
        
        gridCells.push(
          <div key={`${r}-${c}`} className={`db-box ${playerClass}`} />
        );
      }
    }
  }

  return (
    <div className="db-board-wrapper">
      <div className="db-scores">
        <div className="db-score db-score-p1">
          {gameState.scores[0]}
        </div>
        <div className="db-score db-score-p2">
          {gameState.scores[1]}
        </div>
      </div>
      <div className="db-board">
        {gridCells}
      </div>
    </div>
  );
};

export default DotsBoxesBoard;

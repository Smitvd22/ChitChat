import React, { useState } from 'react';
import './QuoridorBoard.css';

const QuoridorBoard = ({ gameState, playerId, makeMove }) => {
  const [wallOrientation, setWallOrientation] = useState('H'); // 'H' or 'V'
  const [hoveredWall, setHoveredWall] = useState(null); // { r, c, type }

  if (!gameState) return null;

  const { status, players, currentTurn, pawns, walls, remainingWalls, winner, totalTurns } = gameState;
  
  const playerIndex = players.findIndex(p => p.id === playerId);
  const isMyTurn = status === 'playing' && currentTurn === playerIndex;

  const handleCellClick = (r, c) => {
    if (!isMyTurn) return;
    makeMove({ action: 'move_pawn', destination: { r, c } });
  };

  const handleWallClick = (r, c) => {
    if (!isMyTurn) return;
    makeMove({ action: 'place_wall', wall: { r, c, type: wallOrientation } });
  };

  // Helper to check if movement between two adjacent cells is blocked
  const isMoveBlockedLocal = (r1, c1, r2, c2) => {
    if (r1 === r2) {
      const leftC = Math.min(c1, c2);
      return walls.some(w => w.type === 'V' && w.c === leftC && (w.r === r1 || w.r === r1 - 1));
    } else if (c1 === c2) {
      const topR = Math.min(r1, r2);
      return walls.some(w => w.type === 'H' && w.r === topR && (w.c === c1 || w.c === c1 - 1));
    }
    return true;
  };

  // Compute valid move cells for highlighting
  const validMoves = [];
  if (isMyTurn) {
    const myPawn = pawns[playerIndex];
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of dirs) {
      const nr = myPawn.r + dr;
      const nc = myPawn.c + dc;
      if (nr >= 0 && nr <= 8 && nc >= 0 && nc <= 8) {
        if (!isMoveBlockedLocal(myPawn.r, myPawn.c, nr, nc)) {
          validMoves.push(`${nr},${nc}`);
        }
      }
    }
  }

  // Render a 9x9 grid of cells
  const renderCells = () => {
    const cells = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const isValid = validMoves.includes(`${r},${c}`);
        const hasP1 = pawns[0].r === r && pawns[0].c === c;
        const hasP2 = pawns[1].r === r && pawns[1].c === c;

        cells.push(
          <div
            key={`cell-${r}-${c}`}
            className={`q-cell ${isValid ? 'valid-move' : ''}`}
            style={{ top: r * 50, left: c * 50 }}
            onClick={() => handleCellClick(r, c)}
          >
            {hasP1 && <div className="q-pawn p1"></div>}
            {hasP2 && <div className="q-pawn p2"></div>}
          </div>
        );
      }
    }
    return cells;
  };

  // Render placed walls
  const renderPlacedWalls = () => {
    return walls.map((w, i) => {
      const style = w.type === 'H' 
        ? { top: w.r * 50 + 40, left: w.c * 50, width: 90, height: 10 }
        : { top: w.r * 50, left: w.c * 50 + 40, width: 10, height: 90 };
      
      return (
        <div 
          key={`wall-${i}`} 
          className={`q-wall placed p${w.placedBy + 1}`} 
          style={style} 
        />
      );
    });
  };

  // Render wall slots for hovering/clicking
  const renderWallSlots = () => {
    const slots = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        // Only render slots if it's my turn and I have walls
        if (isMyTurn && remainingWalls[playerIndex] > 0) {
          // A generic 40x40 region in the bottom-right corner of cell (r,c) to catch hovers
          // Actually, let's just make interactive slot areas
          const isHoveredH = hoveredWall && hoveredWall.r === r && hoveredWall.c === c && hoveredWall.type === 'H';
          const isHoveredV = hoveredWall && hoveredWall.r === r && hoveredWall.c === c && hoveredWall.type === 'V';
          
          const slotStyle = wallOrientation === 'H'
            ? { top: r * 50 + 40, left: c * 50, width: 90, height: 10 }
            : { top: r * 50, left: c * 50 + 40, width: 10, height: 90 };

          // Determine if slot is already occupied
          const isOccupied = walls.some(w => {
            if (w.r === r && w.c === c) return true; // Direct intersection clash
            if (wallOrientation === 'H' && w.type === 'H' && w.r === r && Math.abs(w.c - c) === 1) return true;
            if (wallOrientation === 'V' && w.type === 'V' && w.c === c && Math.abs(w.r - r) === 1) return true;
            return false;
          });

          slots.push(
            <div
              key={`slot-${r}-${c}`}
              className={`q-wall-slot ${wallOrientation} ${isOccupied ? 'occupied' : ''}`}
              style={slotStyle}
              onMouseEnter={() => setHoveredWall({ r, c, type: wallOrientation })}
              onMouseLeave={() => setHoveredWall(null)}
              onClick={() => { if (!isOccupied) handleWallClick(r, c); }}
            >
              {(isHoveredH || isHoveredV) && !isOccupied && (
                <div className={`q-wall preview p${playerIndex + 1}`} />
              )}
            </div>
          );
        }
      }
    }
    return slots;
  };

  return (
    <div className="quoridor-board-container">
      {(status === 'playing' || status === 'finished') && (
        <div className="q-game-area">
          <div className="q-player-info p1">
            <h3>{players[0].username} (Player 1)</h3>
            <p>Walls: <strong>{remainingWalls[0]}</strong></p>
            <p className="q-target">Target: Bottom Row</p>
          </div>

          <div className="q-center-column">
            {status === 'playing' && (
              <div className={`q-turn-indicator ${isMyTurn ? 'my-turn' : ''}`}>
                {isMyTurn ? "Your Turn" : "Opponent's Turn"}
              </div>
            )}
            
            {status === 'finished' && (
              <div className="q-winner-banner">
                <h2>{winner === playerIndex ? 'You Win!' : 'You Lose!'}</h2>
                <p>{players[winner].username} reached the opposite side!</p>
                <p>Total turns: {totalTurns}</p>
              </div>
            )}

            {status === 'playing' && isMyTurn && remainingWalls[playerIndex] > 0 && (
              <div className="q-wall-controls">
                <span>Wall Mode:</span>
                <button 
                  className={wallOrientation === 'H' ? 'active' : ''} 
                  onClick={() => setWallOrientation('H')}
                >
                  Horizontal
                </button>
                <button 
                  className={wallOrientation === 'V' ? 'active' : ''} 
                  onClick={() => setWallOrientation('V')}
                >
                  Vertical
                </button>
              </div>
            )}

            <div className="q-board">
              {renderCells()}
              {renderPlacedWalls()}
              {renderWallSlots()}
            </div>
          </div>

          <div className="q-player-info p2">
            <h3>{players[1]?.username} (Player 2)</h3>
            <p>Walls: <strong>{remainingWalls[1]}</strong></p>
            <p className="q-target">Target: Top Row</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuoridorBoard;

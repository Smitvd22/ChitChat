import React, { useState} from 'react';
import './SeaBattleBoard.css';

const SHIPS_CONFIG = [
  { id: 'carrier', name: 'Carrier', size: 5 },
  { id: 'battleship', name: 'Battleship', size: 4 },
  { id: 'cruiser', name: 'Cruiser', size: 3 },
  { id: 'submarine', name: 'Submarine', size: 3 },
  { id: 'destroyer', name: 'Destroyer', size: 2 },
];

const SeaBattleBoard = ({ gameState, playerId, makeMove }) => {
  const [placedShips, setPlacedShips] = useState([]);
  const [selectedShipId, setSelectedShipId] = useState('carrier');
  const [orientation, setOrientation] = useState('H'); // 'H' or 'V'
  const [hoveredCell, setHoveredCell] = useState(null);

  const { status, players, currentTurn, boards, message } = gameState;
  const playerIndex = players.findIndex(p => p.id === playerId);
  const opponentIndex = playerIndex === 0 ? 1 : 0;
  
  const myBoard = boards[playerIndex];
  const oppBoard = boards[opponentIndex];
  const isMyTurn = status === 'playing' && currentTurn === playerIndex;

  // Check if a ship can be placed at a location
  const canPlaceShip = (shipConfig, r, c, orient) => {
    if (orient === 'H' && c + shipConfig.size > 10) return false;
    if (orient === 'V' && r + shipConfig.size > 10) return false;

    // Check overlap
    const cells = [];
    for (let i = 0; i < shipConfig.size; i++) {
      if (orient === 'H') cells.push(`${r},${c + i}`);
      else cells.push(`${r + i},${c}`);
    }

    const occupied = new Set();
    placedShips.forEach(ship => {
      for (let i = 0; i < ship.size; i++) {
        if (ship.orientation === 'H') occupied.add(`${ship.r},${ship.c + i}`);
        else occupied.add(`${ship.r + i},${ship.c}`);
      }
    });

    return !cells.some(cell => occupied.has(cell));
  };

  const handleSetupCellClick = (r, c) => {
    if (myBoard?.ready) return;
    
    const config = SHIPS_CONFIG.find(s => s.id === selectedShipId);
    if (!config) return;

    if (canPlaceShip(config, r, c, orientation)) {
      const newShips = [...placedShips.filter(s => s.id !== selectedShipId), {
        id: selectedShipId,
        size: config.size,
        r, c,
        orientation
      }];
      setPlacedShips(newShips);
      
      // Auto-select next available ship
      const nextAvailable = SHIPS_CONFIG.find(s => !newShips.some(ns => ns.id === s.id));
      if (nextAvailable) setSelectedShipId(nextAvailable.id);
      else setSelectedShipId(null);
    }
  };

  const handleCommitShips = () => {
    if (placedShips.length === SHIPS_CONFIG.length) {
      makeMove({ action: 'place_ships', ships: placedShips });
    }
  };

  const handleAttack = (r, c) => {
    if (!isMyTurn) return;
    makeMove({ action: 'fire', destination: { r, c } });
  };

  const renderSetupGrid = () => {
    const grid = [];
    const config = SHIPS_CONFIG.find(s => s.id === selectedShipId);

    const isHoverValid = hoveredCell && config && canPlaceShip(config, hoveredCell.r, hoveredCell.c, orientation);
    
    // Calculate preview cells
    const previewCells = new Set();
    if (hoveredCell && config) {
      for (let i = 0; i < config.size; i++) {
        if (orientation === 'H') previewCells.add(`${hoveredCell.r},${hoveredCell.c + i}`);
        else previewCells.add(`${hoveredCell.r + i},${hoveredCell.c}`);
      }
    }

    // Calculate placed cells
    const placedCells = {};
    placedShips.forEach(ship => {
      for (let i = 0; i < ship.size; i++) {
        if (ship.orientation === 'H') placedCells[`${ship.r},${ship.c + i}`] = ship.id;
        else placedCells[`${ship.r + i},${ship.c}`] = ship.id;
      }
    });

    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        const key = `${r},${c}`;
        const isPlaced = !!placedCells[key];
        const isPreview = previewCells.has(key);
        
        let classes = 'sb-cell setup-cell';
        if (isPlaced) classes += ' placed';
        if (isPreview) classes += isHoverValid ? ' preview-valid' : ' preview-invalid';

        grid.push(
          <div 
            key={key} 
            className={classes}
            onClick={() => handleSetupCellClick(r, c)}
            onMouseEnter={() => setHoveredCell({ r, c })}
            onMouseLeave={() => setHoveredCell(null)}
          />
        );
      }
    }
    return grid;
  };

  const renderPersonalGrid = () => {
    const grid = [];
    
    // Map my ships
    const myShipCells = {};
    myBoard.ships.forEach(ship => {
      for (let i = 0; i < ship.size; i++) {
        const cellKey = ship.orientation === 'H' ? `${ship.r},${ship.c + i}` : `${ship.r + i},${ship.c}`;
        myShipCells[cellKey] = {
          isSunk: ship.hits === ship.size,
          id: ship.id
        };
      }
    });

    // Map incoming shots
    const incoming = {};
    myBoard.incomingShots.forEach(shot => {
      incoming[`${shot.r},${shot.c}`] = shot.status; // 'hit' or 'miss'
    });

    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        const key = `${r},${c}`;
        const ship = myShipCells[key];
        const status = incoming[key];
        
        let classes = 'sb-cell';
        if (ship) classes += ' my-ship';
        if (ship?.isSunk) classes += ' sunk';
        if (status === 'hit') classes += ' hit';
        if (status === 'miss') classes += ' miss';

        grid.push(
          <div key={key} className={classes}>
            {status === 'hit' && <span className="marker-hit">💥</span>}
            {status === 'miss' && <span className="marker-miss">💧</span>}
          </div>
        );
      }
    }
    return grid;
  };

  const renderAttackGrid = () => {
    const grid = [];
    
    // Map outgoing shots (which are opponent's incoming shots)
    const outgoing = {};
    oppBoard.incomingShots.forEach(shot => {
      outgoing[`${shot.r},${shot.c}`] = { status: shot.status, sunk: shot.sunk };
    });

    // Map opponent's sunk ships (since filterState only reveals sunk ones)
    const oppShipCells = {};
    oppBoard.ships.forEach(ship => {
      if (ship.isSunk || status === 'finished') {
        for (let i = 0; i < ship.size; i++) {
          const cellKey = ship.orientation === 'H' ? `${ship.r},${ship.c + i}` : `${ship.r + i},${ship.c}`;
          oppShipCells[cellKey] = true;
        }
      }
    });

    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        const key = `${r},${c}`;
        const shot = outgoing[key];
        const isRevealedShip = oppShipCells[key];
        
        let classes = 'sb-cell attack-cell';
        if (isRevealedShip) classes += ' sunk-ship-revealed';
        if (shot?.status === 'hit') classes += ' hit';
        if (shot?.status === 'miss') classes += ' miss';
        if (isMyTurn && !shot) classes += ' targetable';

        grid.push(
          <div 
            key={key} 
            className={classes}
            onClick={() => { if (!shot) handleAttack(r, c); }}
          >
            {shot?.status === 'hit' && <span className="marker-hit">💥</span>}
            {shot?.status === 'miss' && <span className="marker-miss">💧</span>}
          </div>
        );
      }
    }
    return grid;
  };

  return (
    <div className="sb-board-container">
      {message && <div className="sb-message-banner">{message}</div>}

      {status === 'setup' && (
        <div className="sb-setup-phase">
          <h2>Fleet Placement</h2>
          {myBoard.ready ? (
            <div className="sb-waiting-msg">
              <div className="game-waiting-spinner small" />
              <p>Waiting for opponent to place ships...</p>
            </div>
          ) : (
            <div className="sb-setup-content">
              <div className="sb-fleet-selector">
                <h3>Select Ship</h3>
                <div className="sb-ship-list">
                  {SHIPS_CONFIG.map(config => {
                    const isPlaced = placedShips.some(s => s.id === config.id);
                    return (
                      <button 
                        key={config.id}
                        className={`sb-ship-btn ${selectedShipId === config.id ? 'active' : ''} ${isPlaced ? 'placed' : ''}`}
                        onClick={() => setSelectedShipId(config.id)}
                      >
                        {config.name} ({config.size})
                        {isPlaced && ' ✓'}
                      </button>
                    );
                  })}
                </div>
                
                <div className="sb-controls">
                  <button 
                    className="sb-toggle-btn"
                    onClick={() => setOrientation(o => o === 'H' ? 'V' : 'H')}
                  >
                    Orientation: {orientation === 'H' ? 'Horizontal ➡️' : 'Vertical ⬇️'}
                  </button>
                  
                  <button 
                    className="sb-commit-btn"
                    disabled={placedShips.length < SHIPS_CONFIG.length}
                    onClick={handleCommitShips}
                  >
                    Confirm Fleet
                  </button>
                </div>
              </div>

              <div className="sb-grid-wrapper">
                <div className="sb-grid">
                  {renderSetupGrid()}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {(status === 'playing' || status === 'finished') && (
        <div className="sb-playing-phase stacked-layout">
          <div className="sb-board-section">
            <h3 className={isMyTurn ? 'active-turn-text' : ''}>Target Radar (Attack Board)</h3>
            <div className="sb-grid">
              {renderAttackGrid()}
            </div>
          </div>
          
          <div className="sb-board-section personal-section">
            <h3>Your Fleet</h3>
            <div className="sb-grid">
              {renderPersonalGrid()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeaBattleBoard;

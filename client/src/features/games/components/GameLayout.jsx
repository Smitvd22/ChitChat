import React from 'react';

/**
 * GameLayout - Reusable wrapper layout for all games
 * Provides consistent player info, turn indicators, and action buttons.
 */
const GameLayout = ({
  players = [],
  currentTurn,
  currentPlayerId,
  status,
  winner,
  onLeave,
  children,
  gameName = 'Game',
}) => {
  const getPlayerLabel = (index) => {
    const player = players[index];
    if (!player) return 'Waiting...';
    const isYou = player.id === currentPlayerId;
    return `${player.username}${isYou ? ' (You)' : ''}`;
  };

  const getStatusText = () => {
    if (status === 'waiting') return 'Waiting for opponent...';
    if (status === 'finished') {
      if (winner === 'draw') return "It's a draw!";
      if (winner !== null && winner !== undefined) {
        const winnerPlayer = players[winner];
        const isYou = winnerPlayer?.id === currentPlayerId;
        return isYou ? '🎉 You won!' : `${winnerPlayer?.username || 'Opponent'} wins!`;
      }
    }
    // Playing
    const turnPlayer = players[currentTurn];
    const isYourTurn = turnPlayer?.id === currentPlayerId;
    return isYourTurn ? 'Your turn' : `${turnPlayer?.username || 'Opponent'}'s turn`;
  };

  const isYourTurn = players[currentTurn]?.id === currentPlayerId;

  return (
    <div className="game-layout">
      {/* Header */}
      <div className="game-layout-header">
        <button className="game-leave-btn" onClick={onLeave} title="Leave Game">
          ← Back
        </button>
        <h2 className="game-title">{gameName}</h2>
        <div className="game-header-spacer" />
      </div>

      {/* Player Bar */}
      <div className="game-players-bar">
        <div className={`game-player-info ${currentTurn === 0 && status === 'playing' ? 'active-turn' : ''} ${winner === 0 ? 'winner' : ''}`}>
          <div className="player-disc player-1-disc" />
          <span className="player-name">{getPlayerLabel(0)}</span>
        </div>

        <div className="game-status-badge">
          <span className={`status-text ${isYourTurn && status === 'playing' ? 'pulse-status' : ''}`}>
            {getStatusText()}
          </span>
        </div>

        <div className={`game-player-info ${currentTurn === 1 && status === 'playing' ? 'active-turn' : ''} ${winner === 1 ? 'winner' : ''}`}>
          <span className="player-name">{getPlayerLabel(1)}</span>
          <div className="player-disc player-2-disc" />
        </div>
      </div>

      {/* Game Area */}
      <div className="game-content-area">
        {children}
      </div>
    </div>
  );
};

export default GameLayout;

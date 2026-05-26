import React from 'react';

/**
 * GameCard - Card component for the games lobby
 */
const GameCard = ({ name, emoji, description, available, onPlay }) => {
  return (
    <div className={`game-card ${available ? 'game-card-available' : 'game-card-coming-soon'}`}>
      <div className="game-card-emoji">{emoji}</div>
      <h3 className="game-card-name">{name}</h3>
      <p className="game-card-description">{description}</p>
      {available ? (
        <button className="game-card-play-btn" onClick={onPlay}>
          ▶ Play
        </button>
      ) : (
        <span className="game-card-badge">Coming Soon</span>
      )}
    </div>
  );
};

export default GameCard;

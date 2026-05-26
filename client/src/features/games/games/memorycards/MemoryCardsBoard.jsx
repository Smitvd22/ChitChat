import React, { useState, useEffect } from 'react';

const MemoryCardsBoard = ({ gameState, myPlayerIndex, onCardClick }) => {
  const [mismatchState, setMismatchState] = useState(null);

  // Handle the delay to show mismatched cards before they flip back
  useEffect(() => {
    if (gameState?.lastMismatch) {
      setMismatchState(gameState.lastMismatch);
      const timer = setTimeout(() => {
        setMismatchState(null);
      }, 1200);
      return () => clearTimeout(timer);
    } else {
      setMismatchState(null);
    }
  }, [gameState?.lastMismatch, gameState?.mismatchTimestamp]);

  if (!gameState || !gameState.cards) return null;
  const { cards, flippedIndices, matchedIndices, currentTurn, status } = gameState;
  
  const isMyTurn = currentTurn === myPlayerIndex && status === 'playing';

  return (
    <div className="mc-board-wrapper">
      <div className="db-scores">
        <div className="db-score db-score-p1">
          {gameState.scores[0]}
        </div>
        <div className="db-score db-score-p2">
          {gameState.scores[1]}
        </div>
      </div>
      
      <div className="mc-board">
        {cards.map((emoji, index) => {
          const isMatched = matchedIndices.includes(index);
          const isFlipped = isMatched || flippedIndices.includes(index) || mismatchState?.includes(index);
          const canClick = isMyTurn && !isFlipped && !mismatchState;
          
          return (
            <div 
              key={index} 
              className={`mc-card-container ${canClick ? 'mc-clickable' : ''}`}
              onClick={() => canClick && onCardClick(index)}
            >
              <div className={`mc-card ${isFlipped ? 'mc-flipped' : ''} ${isMatched ? 'mc-matched' : ''}`}>
                <div className="mc-card-front">
                  <span>?</span>
                </div>
                <div className="mc-card-back">
                  {emoji}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MemoryCardsBoard;

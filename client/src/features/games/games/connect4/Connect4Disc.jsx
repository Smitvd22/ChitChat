import React from 'react';

/**
 * Connect4Disc - Animated disc that drops into a cell
 */
const Connect4Disc = ({ player, isWinning, row }) => {
  if (!player) return null;

  return (
    <div
      className={`c4-disc c4-disc-player${player} ${isWinning ? 'c4-disc-winning' : ''}`}
      style={{ '--drop-row': row }}
    />
  );
};

export default Connect4Disc;

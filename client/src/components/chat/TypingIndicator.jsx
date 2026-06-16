import React from 'react';

/**
 * TypingIndicator — Animated dots showing that a friend is typing.
 */
const TypingIndicator = ({ username }) => {
  return (
    <div className="typing-indicator-wrapper">
      <div className="typing-indicator-bubble">
        <div className="typing-dots">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </div>
        <span className="typing-label">{username || 'Friend'} is typing</span>
      </div>
    </div>
  );
};

export default React.memo(TypingIndicator);

import React from 'react';

/**
 * NewMessagesIndicator — Floating button that appears when new messages
 * arrive while the user is scrolled up reading older messages.
 */
const NewMessagesIndicator = ({ count, onClick }) => {
  if (!count || count <= 0) return null;

  return (
    <button
      className="new-messages-indicator"
      onClick={onClick}
      aria-label={`${count} new message${count > 1 ? 's' : ''} — click to scroll down`}
    >
      <span className="new-messages-arrow">↓</span>
      <span className="new-messages-text">
        {count === 1 ? '1 new message' : `${count} new messages`}
      </span>
    </button>
  );
};

export default React.memo(NewMessagesIndicator);

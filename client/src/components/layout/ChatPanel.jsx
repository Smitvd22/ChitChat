import React from 'react';
import CompactChat from './CompactChat';

const ChatPanel = ({ friendId }) => {
  return (
    <div className="chat-panel">
      <CompactChat friendId={friendId} />
    </div>
  );
};

export default ChatPanel;

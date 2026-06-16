import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useCall } from '../../contexts/CallContext';
import { useChatMessages } from '../../hooks/useChatMessages';
import { useSmartScroll } from '../../hooks/useSmartScroll';
import { usePresenceContext } from '../../contexts/PresenceContext';
import { getCurrentUser } from '../../services/authService';
import MessageBubble from '../chat/MessageBubble';
import MessageSkeleton from '../chat/MessageSkeleton';
import NewMessagesIndicator from '../chat/NewMessagesIndicator';
import TypingIndicator from '../chat/TypingIndicator';
import axios from 'axios';

/**
 * CompactChat — Reusable chat component for split layouts (sidebar/drawer).
 */
const CompactChat = ({ friendId, isActive = true, onUnreadChange }) => {
  const { socket, isConnected, joinChatRoom } = useCall();
  const { getPresence, formatLastSeen, requestUserPresence } = usePresenceContext();
  
  const [friendInfo, setFriendInfo] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  
  const messagesContainerRef = useRef(null);

  const API_URL = process.env.REACT_APP_API_URL ||
    (process.env.NODE_ENV === 'production'
      ? 'https://chitchat-3l35.onrender.com'
      : 'http://localhost:5000/api');

  const {
    unreadCount,
    scrollToBottom,
    saveScrollPosition,
    restoreScrollPosition,
    onNewMessage: onNewMessageScroll,
  } = useSmartScroll(messagesContainerRef);

  const handleNewMessage = useCallback((isOwnMessage) => {
    onNewMessageScroll(isOwnMessage);
    if (!isOwnMessage && isActive) {
      setTimeout(() => {
        const currentUser = getCurrentUser();
        if (currentUser && currentUser.token) {
          axios.put(`${API_URL}/messages/read/${friendId}`, {}, {
            headers: { Authorization: `Bearer ${currentUser.token}` }
          }).catch(console.error);
        }
      }, 500);
    }
  }, [onNewMessageScroll, friendId, API_URL, isActive]);

  const {
    messages,
    loading,
    loadingMore,
    hasMore,
    friendTyping,
    loadOlderMessages,
    sendMessage,
    emitTyping,
    markAsRead,
  } = useChatMessages({
    friendId,
    socket,
    onNewMessage: handleNewMessage,
  });

  // Fetch friend information
  useEffect(() => {
    const fetchFriendInfo = async () => {
      try {
        const currentUser = getCurrentUser();
        if (!currentUser) return;

        const response = await axios.get(`${API_URL}/friends`, {
          headers: { Authorization: `Bearer ${currentUser.token}` }
        });
        const friend = response.data.find(f => f.id === parseInt(friendId, 10));
        if (friend) setFriendInfo(friend);
      } catch (err) {
        console.error('Error fetching friend in compact chat:', err);
      }
    };
    fetchFriendInfo();
  }, [friendId, API_URL]);

  // Request real-time presence on mount and join room
  useEffect(() => {
    if (isConnected) {
      requestUserPresence(friendId);
      
      const currentUser = getCurrentUser();
      if (currentUser) {
        const roomId = [currentUser.id, friendId].sort().join('-');
        joinChatRoom(roomId);
      }
    }
  }, [friendId, requestUserPresence, isConnected, joinChatRoom]);

  // Initial scroll to first unread or bottom
  useEffect(() => {
    if (!loading && messages.length > 0) {
      requestAnimationFrame(() => {
        const firstUnread = messages.find(m => !m.read && String(m.senderId) === String(friendId));

        if (firstUnread) {
          const el = document.querySelector(`[data-message-id="${firstUnread.id}"]`);
          if (el) {
            el.scrollIntoView({ behavior: 'auto', block: 'center' });
          } else {
            scrollToBottom(false);
          }
        } else {
          scrollToBottom(false);
        }
        if (isActive) {
          markAsRead();
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // Mark as read when becoming active
  useEffect(() => {
    if (isActive && messages.length > 0) {
      const hasUnread = messages.some(m => !m.read && String(m.senderId) === String(friendId));
      if (hasUnread) {
        markAsRead();
      }
    }
  }, [isActive, messages, friendId, markAsRead]);

  // Report unread count
  useEffect(() => {
    if (onUnreadChange && messages) {
      const count = messages.filter(m => !m.read && String(m.senderId) === String(friendId)).length;
      onUnreadChange(count);
    }
  }, [messages, friendId, onUnreadChange]);

  // Restore scroll
  useEffect(() => {
    if (!loadingMore) restoreScrollPosition();
  }, [loadingMore, restoreScrollPosition]);

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container || loadingMore || !hasMore) return;
    if (container.scrollTop < 80) {
      saveScrollPosition();
      loadOlderMessages();
    }
  }, [loadingMore, hasMore, saveScrollPosition, loadOlderMessages]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    const success = await sendMessage({
      content: messageInput,
      receiverId: friendId,
      replyToId: null,
    });

    if (success) setMessageInput('');
  };

  const handleInputChange = (e) => {
    setMessageInput(e.target.value);
    if (e.target.value.trim()) emitTyping();
  };

  const friendPresence = getPresence(friendId);
  const isOnline = friendPresence.status === 'online';
  const friendName = friendInfo?.username || 'Friend';
  const currentUserId = getCurrentUser()?.id;

  return (
    <div className="compact-chat-container">
      <div className="compact-chat-header">
        <div className="compact-avatar">
          {friendName.charAt(0).toUpperCase()}
          {isOnline && <div className="online-dot-small" />}
        </div>
        <div className="compact-header-info">
          <span className="compact-name">{friendName}</span>
          <span className={`compact-status ${isOnline ? 'online' : 'offline'}`}>
            {friendTyping ? 'typing...' : isOnline ? 'Online' : formatLastSeen(friendPresence.lastSeen)}
          </span>
        </div>
      </div>

      <div className="compact-messages" ref={messagesContainerRef}>
        {loadingMore && <div className="loading-more-small">Loading...</div>}
        
        {loading ? (
          <MessageSkeleton />
        ) : messages.length === 0 ? (
          <div className="no-messages-small">No messages yet.</div>
        ) : (
          messages.map(msg => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isCurrentUser={String(msg.senderId) === String(currentUserId)}
              onReply={() => {}}
              onReact={() => {}}
              onScrollToMessage={() => {}}
              showEmojiPicker={false}
            />
          ))
        )}
        
        {friendTyping && <TypingIndicator username={friendName} />}
      </div>

      <NewMessagesIndicator count={unreadCount} onClick={() => scrollToBottom(true)} />

      <form className="compact-chat-form" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={messageInput}
          onChange={handleInputChange}
          placeholder="Type a message..."
          disabled={loading}
        />
        <button type="submit" disabled={!messageInput.trim() || loading}>➤</button>
      </form>
    </div>
  );
};

export default CompactChat;

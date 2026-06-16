import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../services/authService';
import { useCall } from '../contexts/CallContext';
import { useChatMessages } from '../hooks/useChatMessages';
import { useSmartScroll } from '../hooks/useSmartScroll';
import { usePresenceContext } from '../contexts/PresenceContext';
import MediaUpload from '../components/MediaUpload';
import MessageBubble from '../components/chat/MessageBubble';
import MessageSkeleton from '../components/chat/MessageSkeleton';
import NewMessagesIndicator from '../components/chat/NewMessagesIndicator';
import TypingIndicator from '../components/chat/TypingIndicator';
import { useVibeType } from '../components/vibetype/useVibeType';
import VibeTypeButton from '../components/vibetype/VibeTypeButton';
import axios from 'axios';
import '../styles/Chat.css';

function Chat() {
  const { friendId } = useParams();
  const navigate = useNavigate();
  const { socket } = useCall();
  const { getPresence, formatLastSeen, requestUserPresence } = usePresenceContext();

  const [friendInfo, setFriendInfo] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);
  const [showConnectionWarning, setShowConnectionWarning] = useState(false);
  const [initialConnecting, setInitialConnecting] = useState(true);
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const [vibeMetadata, setVibeMetadata] = useState(null);

  // Reply & reaction state
  const [replyingTo, setReplyingTo] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeReactionMessage, setActiveReactionMessage] = useState(null);

  const messagesContainerRef = useRef(null);
  const hasJoinedRoom = useRef(false);
  const messagesEndRef = useRef(null);

  const API_URL = process.env.REACT_APP_API_URL ||
    (process.env.NODE_ENV === 'production'
      ? 'https://chitchat-3l35.onrender.com'
      : 'http://localhost:5000/api');

  const { launchVibeType } = useVibeType(useCallback((payload) => {
    setMessageInput(prev => prev + (prev && payload.text ? ' ' : '') + payload.text);
    if (payload.metadata && (payload.metadata.expressions?.length || payload.metadata.gestures?.length)) {
      setVibeMetadata(payload.metadata);
    }
  }, []));

  const {
    unreadCount,
    scrollToBottom,
    saveScrollPosition,
    restoreScrollPosition,
    onNewMessage: onNewMessageScroll,
  } = useSmartScroll(messagesContainerRef);

  // Wrap scroll handler to also mark incoming messages as read
  const handleNewMessage = useCallback((isOwnMessage) => {
    onNewMessageScroll(isOwnMessage);
    if (!isOwnMessage) {
      // Small delay to ensure the message is in the DOM/state
      setTimeout(() => {
        const currentUser = getCurrentUser();
        if (currentUser && currentUser.token) {
          axios.put(`${API_URL}/messages/read/${friendId}`, {}, {
            headers: { Authorization: `Bearer ${currentUser.token}` }
          }).catch(console.error);
        }
      }, 500);
    }
  }, [onNewMessageScroll, friendId, API_URL]);

  // Chat messages hook
  const {
    messages,
    loading,
    loadingMore,
    error,
    setError,
    hasMore,
    friendTyping,
    loadOlderMessages,
    sendMessage,
    sendMediaMessage,
    sendReaction,
    emitTyping,
    markAsRead,
  } = useChatMessages({
    friendId,
    socket,
    onNewMessage: handleNewMessage,
  });

  // Fetch friend information
  const fetchFriendInfo = useCallback(async () => {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser || !currentUser.token) {
        setError("Authentication error. Please login again.");
        navigate('/login');
        return;
      }

      const friendsResponse = await axios.get(`${API_URL}/friends`, {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });

      const friend = friendsResponse.data.find(f => f.id === parseInt(friendId, 10));
      if (friend) {
        setFriendInfo(friend);
      } else {
        throw new Error("Friend not found");
      }
    } catch (err) {
      console.error('Error fetching friend info:', err);
      setError('Could not load friend information. Please go back and try again.');
    }
  }, [API_URL, friendId, navigate, setError]);

  // Initial load
  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser || !currentUser.token) {
      navigate('/login');
      return;
    }
    
    // Request instant presence
    requestUserPresence(friendId);
    fetchFriendInfo();
  }, [friendId, fetchFriendInfo, navigate, requestUserPresence]);

  // Scroll to first unread or bottom on initial message load
  useEffect(() => {
    if (!loading && messages.length > 0) {
      requestAnimationFrame(() => {
        // Find the first unread message sent by the friend
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
        
        // Mark as read after we've rendered and scrolled
        markAsRead();
      });
    }
    // Only on initial load transition
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // Restore scroll after loading older messages
  useEffect(() => {
    if (!loadingMore) {
      restoreScrollPosition();
    }
  }, [loadingMore, restoreScrollPosition]);

  // Scroll handler for loading older messages
  const handleScrollForOlderMessages = useCallback(() => {
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

    let ticking = false;
    const throttledHandler = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScrollForOlderMessages();
          ticking = false;
        });
        ticking = true;
      }
    };

    container.addEventListener('scroll', throttledHandler, { passive: true });
    return () => container.removeEventListener('scroll', throttledHandler);
  }, [handleScrollForOlderMessages]);

  // Socket connection management — NO messages in deps
  useEffect(() => {
    if (!socket || !friendId) return;

    const currentUser = getCurrentUser();
    if (!currentUser) return;

    const roomId = [currentUser.id, friendId].sort().join('-');

    setSocketConnected(socket.connected);

    const handleConnect = () => {
      setSocketConnected(true);
      setInitialConnecting(false);

      if (!hasJoinedRoom.current) {
        socket.emit('join-room', roomId);
        hasJoinedRoom.current = true;
      }
    };

    const handleDisconnect = () => {
      setSocketConnected(false);
      hasJoinedRoom.current = false;
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      hasJoinedRoom.current = false;
    };
  }, [socket, friendId]); // Removed messages from deps — critical fix

  // Connection warning with delay
  useEffect(() => {
    let warningTimer;
    if (!socketConnected && !initialConnecting) {
      warningTimer = setTimeout(() => setShowConnectionWarning(true), 2000);
    } else {
      setShowConnectionWarning(false);
      if (socketConnected) setInitialConnecting(false);
    }
    return () => { if (warningTimer) clearTimeout(warningTimer); };
  }, [socketConnected, initialConnecting]);

  // Reply handlers
  const handleReply = useCallback((message) => {
    setReplyingTo(message);
    setTimeout(() => {
      const inputField = document.querySelector('.message-form input');
      if (inputField) inputField.focus();
    }, 100);
  }, []);

  const cancelReply = useCallback(() => {
    setReplyingTo(null);
  }, []);

  // Reaction handlers
  const handleReaction = useCallback((messageId) => {
    setActiveReactionMessage(prev => prev === messageId ? null : messageId);
    setShowEmojiPicker(prev => activeReactionMessage === messageId ? !prev : true);
  }, [activeReactionMessage]);

  const handleSendReaction = useCallback(async (messageId, emoji) => {
    await sendReaction(messageId, emoji);
    setShowEmojiPicker(false);
    setActiveReactionMessage(null);
  }, [sendReaction]);

  const closeEmojiPicker = useCallback(() => {
    setShowEmojiPicker(false);
    setActiveReactionMessage(null);
  }, []);

  // Send message handler
  const handleSendMessage = useCallback(async (e) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    if (!socketConnected) {
      setError('Connection issue. Message will be sent when connection is restored.');
      setTimeout(() => setError(''), 3000);
    }

    const success = await sendMessage({
      content: messageInput,
      receiverId: friendId,
      replyToId: replyingTo ? replyingTo.id : null,
      vibeMetadata,
    });

    if (success) {
      setMessageInput('');
      setVibeMetadata(null);
      setReplyingTo(null);
    }
  }, [messageInput, friendId, replyingTo, vibeMetadata, socketConnected, sendMessage, setError]);

  // Media upload handler
  const handleMediaUploadSuccess = useCallback(async (mediaData) => {
    const success = await sendMediaMessage(mediaData);
    if (success) setShowMediaUpload(false);
  }, [sendMediaMessage]);

  // Scroll to message (for reply context clicks)
  const scrollToMessage = useCallback((messageId) => {
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (!messageElement) {
      setError('Message not found in current view. Try loading more messages.');
      setTimeout(() => setError(''), 3000);
      return;
    }

    messageElement.classList.add('highlight-message');
    const container = messagesContainerRef.current;
    container.scrollTo({
      top: messageElement.offsetTop - 100,
      behavior: 'smooth',
    });

    setTimeout(() => messageElement.classList.remove('highlight-message'), 2000);
  }, [setError]);

  // Video call
  const startVideoCall = useCallback(() => {
    if (!socketConnected) {
      setError('Not connected to server. Please wait and try again.');
      return;
    }
    const currentUser = getCurrentUser();
    if (!socket || !currentUser) return;

    const callId = `call_${friendId}_${currentUser.id}`;

    socket.emit('video-call-invitation', {
      callId,
      fromUserId: currentUser.id,
      toUserId: parseInt(friendId),
      fromUsername: currentUser.username,
    });

    navigate(`/videocall/${callId}`, {
      replace: true,
      state: {
        isInitiator: true,
        fromUserId: currentUser.id,
        toUserId: parseInt(friendId),
      },
    });
  }, [socket, socketConnected, friendId, navigate, setError]);

  // Video call invitation listener
  useEffect(() => {
    if (!socket) return;

    const handleVideoCallInvitation = (data) => {
      const { callId, fromUserId, fromUsername } = data;
      const shouldJoin = window.confirm(
        `${fromUsername} is inviting you to a video call. Do you want to join?`
      );

      if (shouldJoin) {
        navigate(`/videocall/${callId}`, {
          replace: true,
          state: {
            isInitiator: false,
            fromUserId,
            toUserId: getCurrentUser().id,
          },
        });
      }
    };

    socket.on('video-call-invitation', handleVideoCallInvitation);
    return () => socket.off('video-call-invitation', handleVideoCallInvitation);
  }, [socket, navigate]);

  // Mobile layout optimization
  useEffect(() => {
    document.body.classList.add('chat-page-active');
    const setViewportHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    setViewportHeight();
    window.addEventListener('resize', setViewportHeight);
    return () => {
      document.body.classList.remove('chat-page-active');
      window.removeEventListener('resize', setViewportHeight);
    };
  }, []);

  // Input change with typing indicator
  const handleInputChange = useCallback((e) => {
    setMessageInput(e.target.value);
    if (e.target.value.trim()) {
      emitTyping();
    }
  }, [emitTyping]);

  // Memoize friend display info
  const friendName = useMemo(() => {
    return friendInfo
      ? (friendInfo.username || (friendInfo.user && friendInfo.user.username) || 'Friend')
      : 'Loading...';
  }, [friendInfo]);

  const friendInitial = useMemo(() => {
    return friendName && friendName !== 'Loading...' ? friendName.charAt(0).toUpperCase() : '?';
  }, [friendName]);

  // Memoize messages lookup for reply context
  const messagesById = useMemo(() => {
    const map = {};
    messages.forEach(m => { map[m.id] = m; });
    return map;
  }, [messages]);

  const currentUserId = useMemo(() => getCurrentUser()?.id, []);

  // Get real presence
  const friendPresence = getPresence(friendId);
  const isFriendOnline = friendPresence.status === 'online';

  return (
    <div className="chat-container chat-fullscreen">
      <div className="chat-header">
        <div className="chat-header-left">
          <button className="back-button" onClick={() => navigate('/friends')}>
            ← <span>Back</span>
          </button>
          <div className="chat-friend-avatar">
            {friendInitial}
            {isFriendOnline && <div className="chat-friend-online-dot" />}
          </div>
          <div className="chat-header-info">
            <p className="chat-header-name">{friendName}</p>
            {friendTyping ? (
              <div className="chat-header-status typing">
                typing...
              </div>
            ) : isFriendOnline ? (
              <div className="chat-header-status">Online</div>
            ) : (
              <div className="chat-header-status offline">
                {formatLastSeen(friendPresence.lastSeen)}
              </div>
            )}
          </div>
        </div>

        <div className="chat-actions">
          <button onClick={() => navigate(`/games/${friendId}`)} className="games-btn">
            🎮 <span>Games</span>
          </button>
          <button onClick={startVideoCall} className="video-call-btn">
            📹 <span>Video Call</span>
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {showConnectionWarning && !socketConnected && (
        <div className="connection-warning">
          ⚠️ Connection lost. Messages may not be delivered immediately.
        </div>
      )}

      <div className="messages-container" ref={messagesContainerRef}>
        {loadingMore && (
          <div className="loading-more-messages">
            <div className="spinner" />
            Loading older messages...
          </div>
        )}

        {!hasMore && messages.length > 0 && (
          <div className="no-more-messages">Beginning of conversation</div>
        )}

        {loading ? (
          <MessageSkeleton />
        ) : messages.length === 0 ? (
          <div className="no-messages">
            <span className="no-messages-icon">💬</span>
            <p>No messages yet.<br />Send your first message to start chatting! 💕</p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isCurrentUser={message.senderId === currentUserId}
              replyToMessage={message.replyToId ? messagesById[message.replyToId] : null}
              onReply={handleReply}
              onReact={handleReaction}
              onSendReaction={handleSendReaction}
              onScrollToMessage={scrollToMessage}
              showEmojiPicker={showEmojiPicker}
              activeReactionMessage={activeReactionMessage}
              onCloseEmojiPicker={closeEmojiPicker}
            />
          ))
        )}

        {/* Typing indicator */}
        {friendTyping && <TypingIndicator username={friendName} />}

        <div ref={messagesEndRef} />
      </div>

      {/* New messages indicator */}
      <NewMessagesIndicator
        count={unreadCount}
        onClick={() => scrollToBottom(true)}
      />

      {/* Media upload */}
      {showMediaUpload && (
        <MediaUpload
          onUploadSuccess={handleMediaUploadSuccess}
          onCancel={() => setShowMediaUpload(false)}
        />
      )}

      {/* Reply preview */}
      {replyingTo && (
        <div className="reply-preview">
          <div className="reply-preview-content">
            <span className="reply-to-label">Reply to: </span>
            <span className="reply-text">
              {replyingTo.content
                ? replyingTo.content.substring(0, 30) + (replyingTo.content.length > 30 ? '...' : '')
                : '[Media]'
              }
            </span>
          </div>
          <button className="cancel-reply" onClick={cancelReply} title="Cancel reply">
            ✕
          </button>
        </div>
      )}

      {/* Message form */}
      <form className="message-form" onSubmit={handleSendMessage}>
        <VibeTypeButton onClick={launchVibeType} disabled={loading} />
        <button
          type="button"
          className="media-button"
          onClick={() => setShowMediaUpload(!showMediaUpload)}
        >
          {showMediaUpload ? '✕' : '+'}
        </button>
        <input
          type="text"
          value={messageInput}
          onChange={handleInputChange}
          placeholder={replyingTo ? "Type your reply..." : "Type a message..."}
          disabled={loading}
        />
        <button type="submit" disabled={!messageInput.trim() || loading} title="Send message">
          ➤
        </button>
      </form>
    </div>
  );
}

export default Chat;
import { useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';
import { getCurrentUser } from '../services/authService';

const MESSAGES_PER_PAGE = 20;

/**
 * useChatMessages — Manages all message state, fetching, and socket listeners.
 *
 * Features:
 * - Paginated message fetching
 * - Optimistic message sending
 * - Socket listener management
 * - Deduplication
 * - Typing indicator support
 */
export function useChatMessages({ friendId, socket, onNewMessage }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [friendTyping, setFriendTyping] = useState(false);

  const pageRef = useRef(1);
  const isFetchingRef = useRef(false);
  const typingTimeoutRef = useRef(null);
  const lastTypingEmitRef = useRef(0);

  const API_URL = process.env.REACT_APP_API_URL ||
    (process.env.NODE_ENV === 'production'
      ? 'https://chitchat-3l35.onrender.com'
      : 'http://localhost:5000/api');

  /**
   * Preprocess a message for display (ensure media types are set)
   */
  const preprocessMessage = useCallback((message) => {
    if (!message) return message;
    const processed = { ...message };

    if (processed.mediaUrl && !processed.mediaType) {
      const url = processed.mediaUrl.toLowerCase();
      if (url.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)($|\?)/)) {
        processed.mediaType = 'image';
      } else if (url.match(/\.(mp4|webm|mov|avi|flv|wmv|mkv)($|\?)/)) {
        processed.mediaType = 'video';
      } else if (url.match(/\.(mp3|wav|ogg|aac|flac)($|\?)/)) {
        processed.mediaType = 'audio';
      } else {
        processed.mediaType = 'image';
      }
    }
    return processed;
  }, []);

  /**
   * Fetch chat history with pagination
   */
  const fetchMessages = useCallback(async (pageNum = 1, append = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const currentUser = getCurrentUser();
      if (!currentUser || !currentUser.token) return;

      if (!append) setLoading(true);
      else setLoadingMore(true);

      const response = await axios.get(
        `${API_URL}/messages/${friendId}?page=${pageNum}&limit=${MESSAGES_PER_PAGE}`,
        { headers: { Authorization: `Bearer ${currentUser.token}` } }
      );

      const fetchedMessages = response.data.messages || response.data;

      if (fetchedMessages.length < MESSAGES_PER_PAGE) {
        setHasMore(false);
      }

      const processed = fetchedMessages.map(preprocessMessage);

      if (append) {
        // Prepend older messages (deduplicated)
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const unique = processed.filter(m => !existingIds.has(m.id));
          return [...unique, ...prev];
        });
      } else {
        setMessages(processed);
      }

      setError('');
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError('Could not load chat history');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      isFetchingRef.current = false;
    }
  }, [API_URL, friendId, preprocessMessage]);

  /**
   * Load the next page of older messages
   */
  const loadOlderMessages = useCallback(() => {
    if (loadingMore || !hasMore || isFetchingRef.current) return null;

    const nextPage = pageRef.current + 1;
    pageRef.current = nextPage;

    return fetchMessages(nextPage, true);
  }, [loadingMore, hasMore, fetchMessages]);

  /**
   * Send a text message with optimistic update
   */
  const sendMessage = useCallback(async ({ content, receiverId, replyToId, vibeMetadata }) => {
    const currentUser = getCurrentUser();
    if (!currentUser || !currentUser.token) {
      setError('You need to be logged in');
      return false;
    }

    // Build final content
    let finalContent = content;
    if (vibeMetadata) {
      finalContent += `|VIBE_META:${JSON.stringify(vibeMetadata)}`;
    }

    // Create optimistic message
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const optimisticMessage = {
      id: tempId,
      content: finalContent,
      senderId: currentUser.id,
      receiverId,
      replyToId: replyToId || null,
      createdAt: new Date().toISOString(),
      reactions: [],
      _optimistic: true,
    };

    // Add to messages immediately
    setMessages(prev => [...prev, optimisticMessage]);

    // Notify parent about new message (for scroll)
    if (onNewMessage) onNewMessage(true);

    // Stop typing indicator
    if (socket && socket.connected) {
      const roomId = [currentUser.id, receiverId].sort().join('-');
      socket.emit('typing-stop', { roomId, userId: currentUser.id });
    }

    try {
      await axios.post(`${API_URL}/messages`, {
        content: finalContent,
        receiverId,
        senderId: currentUser.id,
        replyToId: replyToId || null,
      }, {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });

      // The server will emit 'new-message' via socket, which will replace the optimistic one
      return true;
    } catch (err) {
      console.error('Error sending message:', err);
      // Mark optimistic message as failed
      setMessages(prev => prev.map(m =>
        m.id === tempId ? { ...m, _failed: true, _optimistic: true } : m
      ));
      setError('Failed to send message');
      setTimeout(() => setError(''), 3000);
      return false;
    }
  }, [API_URL, socket, onNewMessage]);

  /**
   * Send a media message
   */
  const sendMediaMessage = useCallback(async (mediaData) => {
    const currentUser = getCurrentUser();
    if (!currentUser || !currentUser.token) {
      setError('You need to be logged in');
      return false;
    }

    try {
      await axios.post(`${API_URL}/messages/media`, {
        mediaUrl: mediaData.url,
        mediaType: mediaData.resourceType,
        publicId: mediaData.publicId,
        format: mediaData.format,
        receiverId: friendId,
      }, {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });

      if (onNewMessage) onNewMessage(true);
      return true;
    } catch (err) {
      console.error('Error sending media message:', err);
      setError('Failed to send media');
      setTimeout(() => setError(''), 3000);
      return false;
    }
  }, [API_URL, friendId, onNewMessage]);

  /**
   * Send a reaction
   */
  const sendReaction = useCallback(async (messageId, emoji) => {
    const currentUser = getCurrentUser();
    if (!currentUser || !currentUser.token) return;

    try {
      await axios.post(`${API_URL}/messages/reactions`, {
        messageId,
        emoji: emoji.unified,
        emojiName: emoji.names ? emoji.names[0] : emoji.name,
      }, {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });
    } catch (err) {
      console.error('Error adding reaction:', err);
      setError('Failed to add reaction');
      setTimeout(() => setError(''), 3000);
    }
  }, [API_URL]);

  /**
   * Mark all unread messages from this friend as read
   */
  const markAsRead = useCallback(async () => {
    const currentUser = getCurrentUser();
    if (!currentUser || !currentUser.token) return;

    try {
      const response = await axios.put(`${API_URL}/messages/read/${friendId}`, {}, {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });
      
      if (response.data.updatedCount > 0) {
        setMessages(prev => prev.map(msg => 
          String(msg.senderId) === String(friendId) && !msg.read
            ? { ...msg, read: true }
            : msg
        ));
      }
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  }, [API_URL, friendId]);

  /**
   * Emit typing indicator (throttled to once per 2 seconds)
   */
  const emitTyping = useCallback(() => {
    if (!socket || !socket.connected) return;

    const now = Date.now();
    if (now - lastTypingEmitRef.current < 2000) return;
    lastTypingEmitRef.current = now;

    const currentUser = getCurrentUser();
    if (!currentUser) return;

    const roomId = [currentUser.id, friendId].sort().join('-');
    socket.emit('typing-start', { roomId, userId: currentUser.id, username: currentUser.username });

    // Auto-stop after 3 seconds
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing-stop', { roomId, userId: currentUser.id });
    }, 3000);
  }, [socket, friendId]);

  /**
   * Socket listeners for real-time updates
   */
  useEffect(() => {
    if (!socket) return;

    const currentUser = getCurrentUser();
    if (!currentUser) return;

    const handleNewMessage = (message) => {
      const processed = preprocessMessage(message);

      setMessages(prev => {
        // Replace optimistic message if this is the server confirmation
        const optimisticIndex = prev.findIndex(m =>
          m._optimistic &&
          m.content === processed.content &&
          String(m.senderId) === String(processed.senderId)
        );

        if (optimisticIndex !== -1) {
          const updated = [...prev];
          updated[optimisticIndex] = processed;
          return updated;
        }

        // Check for duplicates
        if (prev.some(m => m.id === processed.id)) {
          return prev;
        }

        return [...prev, processed];
      });

      // Notify scroll handler if it's not our own message
      if (String(processed.senderId) !== String(currentUser.id)) {
        if (onNewMessage) onNewMessage(false);
      }
    };

    const handleNewReaction = (reaction) => {
      setMessages(prev => prev.map(msg => {
        if (msg.id === reaction.messageId) {
          const reactions = msg.reactions || [];
          const existingIdx = reactions.findIndex(
            r => r.userId === reaction.userId && r.emoji === reaction.emoji
          );
          if (existingIdx >= 0) {
            const updated = [...reactions];
            updated[existingIdx] = reaction;
            return { ...msg, reactions: updated };
          }
          return { ...msg, reactions: [...reactions, reaction] };
        }
        return msg;
      }));
    };

    const handleReactionRemoved = (reaction) => {
      setMessages(prev => prev.map(msg => {
        if (msg.id === reaction.messageId && msg.reactions) {
          return {
            ...msg,
            reactions: msg.reactions.filter(
              r => !(r.userId === reaction.userId && r.emoji === reaction.emoji)
            ),
          };
        }
        return msg;
      }));
    };

    const handleTypingStart = (data) => {
      if (String(data.userId) !== String(currentUser.id)) {
        setFriendTyping(true);
        // Auto-clear after 4 seconds (safety)
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setFriendTyping(false), 4000);
      }
    };

    const handleTypingStop = (data) => {
      if (String(data.userId) !== String(currentUser.id)) {
        setFriendTyping(false);
      }
    };

    const handleMessagesRead = (data) => {
      // If the friend read my messages
      if (String(data.readerId) === String(friendId)) {
        setMessages(prev => prev.map(msg => 
          String(msg.senderId) === String(currentUser.id) && !msg.read
            ? { ...msg, read: true }
            : msg
        ));
      }
    };

    socket.on('new-message', handleNewMessage);
    socket.on('new-reaction', handleNewReaction);
    socket.on('reaction-removed', handleReactionRemoved);
    socket.on('typing-start', handleTypingStart);
    socket.on('typing-stop', handleTypingStop);
    socket.on('messages-read', handleMessagesRead);

    return () => {
      socket.off('new-message', handleNewMessage);
      socket.off('new-reaction', handleNewReaction);
      socket.off('reaction-removed', handleReactionRemoved);
      socket.off('typing-start', handleTypingStart);
      socket.off('typing-stop', handleTypingStop);
      socket.off('messages-read', handleMessagesRead);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [socket, preprocessMessage, onNewMessage, friendId]);

  /**
   * Reset state when friendId changes
   */
  useEffect(() => {
    pageRef.current = 1;
    setMessages([]);
    setHasMore(true);
    setError('');
    setFriendTyping(false);
    fetchMessages(1, false);
  }, [friendId, fetchMessages]);

  return {
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
    fetchMessages,
    markAsRead,
  };
}

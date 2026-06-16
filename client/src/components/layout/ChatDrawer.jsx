import React, { useState, useRef, useEffect } from 'react';
import CompactChat from './CompactChat';
import { usePresenceContext } from '../../contexts/PresenceContext';
import { getCurrentUser } from '../../services/authService';
import axios from 'axios';

/**
 * ChatDrawer — Mobile bottom sheet for chat during games.
 * Snap points: 60px (collapsed), 45vh (half), 85vh (full).
 */
const ChatDrawer = ({ friendId }) => {
  const [snapState, setSnapState] = useState('collapsed'); // 'collapsed', 'half', 'full'
  const [friendName, setFriendName] = useState('Chat');
  const [unreadCount, setUnreadCount] = useState(0);
  
  const drawerRef = useRef(null);
  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const isDraggingRef = useRef(false);

  const { getPresence } = usePresenceContext();
  const presence = getPresence(friendId);
  const isOnline = presence.status === 'online';

  const API_URL = process.env.REACT_APP_API_URL ||
    (process.env.NODE_ENV === 'production'
      ? 'https://chitchat-3l35.onrender.com'
      : 'http://localhost:5000/api');

  useEffect(() => {
    const fetchFriend = async () => {
      try {
        const user = getCurrentUser();
        if (!user) return;
        const res = await axios.get(`${API_URL}/friends`, {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        const f = res.data.find(f => f.id === parseInt(friendId, 10));
        if (f) setFriendName(f.username);
      } catch (err) { }
    };
    fetchFriend();
  }, [friendId, API_URL]);

  const handleTouchStart = (e) => {
    isDraggingRef.current = true;
    startYRef.current = e.touches[0].clientY;
    if (drawerRef.current) {
      drawerRef.current.style.transition = 'none';
    }
  };

  const handleTouchMove = (e) => {
    if (!isDraggingRef.current) return;
    const deltaY = e.touches[0].clientY - startYRef.current;
    currentYRef.current = deltaY;
    
    if (drawerRef.current) {
      const vh = window.innerHeight;
      const baseHeight = snapState === 'full' ? vh * 0.85 : snapState === 'half' ? vh * 0.5 : 60;
      drawerRef.current.style.height = `${baseHeight - deltaY}px`;
    }
  };

  const handleTouchEnd = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    
    if (drawerRef.current) {
      drawerRef.current.style.transition = 'height 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      drawerRef.current.style.height = ''; // Remove inline style to let CSS class take over
    }

    const dragDistance = currentYRef.current;
    currentYRef.current = 0;

    // Determine new snap state based on drag distance and velocity (simplified)
    if (dragDistance < -50) {
      // Swipe up
      if (snapState === 'collapsed') setSnapState('half');
      else if (snapState === 'half') setSnapState('full');
    } else if (dragDistance > 50) {
      // Swipe down
      if (snapState === 'full') setSnapState('half');
      else if (snapState === 'half') setSnapState('collapsed');
    }
  };

  const toggleDrawer = () => {
    if (snapState === 'collapsed') setSnapState('half');
    else setSnapState('collapsed');
  };

  return (
    <div 
      className={`chat-drawer state-${snapState}`} 
      ref={drawerRef}
    >
      <div 
        className="drawer-handle-area"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={toggleDrawer}
      >
        <div className="drawer-handle" />
        <div className="drawer-header-compact">
          <span className="drawer-title">Chat with {friendName}</span>
          <span className={`drawer-online-dot ${!isOnline ? 'offline' : ''}`} />
          {snapState === 'collapsed' && unreadCount > 0 && (
            <span className="drawer-unread-badge">{unreadCount}</span>
          )}
        </div>
      </div>
      
      <div className="drawer-content">
        <CompactChat 
          friendId={friendId} 
          isActive={snapState !== 'collapsed'} 
          onUnreadChange={setUnreadCount}
        />
      </div>
    </div>
  );
};

export default ChatDrawer;

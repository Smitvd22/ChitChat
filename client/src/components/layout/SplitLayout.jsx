import React, { useState, useEffect, useRef } from 'react';
import ChatPanel from './ChatPanel';
import ChatDrawer from './ChatDrawer';
import './SplitLayout.css';

/**
 * SplitLayout — Side-by-side Game and Chat on Desktop, 
 * Full-screen Game with Bottom Sheet Chat on Mobile.
 */
const SplitLayout = ({ friendId, children }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [chatWidth, setChatWidth] = useState(35); // percentage for desktop chat panel
  const isDragging = useRef(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const startDrag = (e) => {
    isDragging.current = true;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  };

  const onDrag = (e) => {
    if (!isDragging.current) return;
    const newWidth = 100 - (e.clientX / window.innerWidth) * 100;
    // Keep chat panel between 25% and 50%
    if (newWidth > 25 && newWidth < 50) {
      setChatWidth(newWidth);
    }
  };

  const stopDrag = () => {
    if (isDragging.current) {
      isDragging.current = false;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }
  };

  useEffect(() => {
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);
    return () => {
      document.removeEventListener('mousemove', onDrag);
      document.removeEventListener('mouseup', stopDrag);
    };
  }, []);

  // Hide the global navbar when using split layout to maximize space
  useEffect(() => {
    document.body.classList.add('game-page-active');
    return () => document.body.classList.remove('game-page-active');
  }, []);

  if (isMobile) {
    return (
      <div className="split-layout-mobile">
        <div className="split-main-mobile">
          {children}
        </div>
        <ChatDrawer friendId={friendId} />
      </div>
    );
  }

  return (
    <div className="split-layout-desktop">
      <div 
        className="split-main-desktop" 
        style={{ width: `${100 - chatWidth}%` }}
      >
        {children}
      </div>
      
      <div 
        className="split-divider"
        onMouseDown={startDrag}
      />
      
      <div 
        className="split-side-desktop" 
        style={{ width: `${chatWidth}%` }}
      >
        <ChatPanel friendId={friendId} />
      </div>
    </div>
  );
};

export default SplitLayout;

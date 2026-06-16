import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * useSmartScroll — Smart scroll management for chat containers.
 *
 * Features:
 * - Auto-scroll only when user is near the bottom
 * - Preserve scroll position when prepending older messages
 * - Track unread count when scrolled away
 * - Expose scrollToBottom for manual scroll
 */
export function useSmartScroll(containerRef) {
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevScrollHeightRef = useRef(0);
  const isRestoringScrollRef = useRef(false);
  const rafRef = useRef(null);

  const NEAR_BOTTOM_THRESHOLD = 150; // px from bottom to consider "near"

  /**
   * Check if user is near the bottom of the scroll container
   */
  const checkIfNearBottom = useCallback(() => {
    const container = containerRef.current;
    if (!container) return true;

    const { scrollTop, scrollHeight, clientHeight } = container;
    return scrollHeight - scrollTop - clientHeight < NEAR_BOTTOM_THRESHOLD;
  }, [containerRef]);

  /**
   * Scroll to the bottom of the container
   */
  const scrollToBottom = useCallback((smooth = true) => {
    const container = containerRef.current;
    if (!container) return;

    setUnreadCount(0);
    setIsNearBottom(true);

    if (smooth) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth',
      });
    } else {
      container.scrollTop = container.scrollHeight;
    }
  }, [containerRef]);

  /**
   * Call this BEFORE prepending older messages to save scroll position.
   */
  const saveScrollPosition = useCallback(() => {
    const container = containerRef.current;
    if (container) {
      prevScrollHeightRef.current = container.scrollHeight;
      isRestoringScrollRef.current = true;
    }
  }, [containerRef]);

  /**
   * Call this AFTER prepending older messages to restore scroll position.
   * Keeps the user's viewport at the same messages they were reading.
   */
  const restoreScrollPosition = useCallback(() => {
    const container = containerRef.current;
    if (container && isRestoringScrollRef.current) {
      const newScrollHeight = container.scrollHeight;
      const scrollDiff = newScrollHeight - prevScrollHeightRef.current;
      container.scrollTop += scrollDiff;
      isRestoringScrollRef.current = false;
    }
  }, [containerRef]);

  /**
   * Call when a new message arrives. Auto-scrolls if near bottom,
   * otherwise increments unread count.
   */
  const onNewMessage = useCallback((isOwnMessage = false) => {
    if (isOwnMessage || checkIfNearBottom()) {
      // Use requestAnimationFrame to wait for DOM update
      requestAnimationFrame(() => {
        scrollToBottom(true);
      });
    } else {
      setUnreadCount(prev => prev + 1);
    }
  }, [checkIfNearBottom, scrollToBottom]);

  /**
   * Throttled scroll handler using requestAnimationFrame
   */
  const handleScroll = useCallback(() => {
    if (rafRef.current) return; // Already scheduled

    rafRef.current = requestAnimationFrame(() => {
      const nearBottom = checkIfNearBottom();
      setIsNearBottom(nearBottom);

      if (nearBottom) {
        setUnreadCount(0);
      }
      rafRef.current = null;
    });
  }, [checkIfNearBottom]);

  /**
   * Attach scroll listener
   */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [containerRef, handleScroll]);

  return {
    isNearBottom,
    unreadCount,
    scrollToBottom,
    saveScrollPosition,
    restoreScrollPosition,
    onNewMessage,
    setUnreadCount,
  };
}

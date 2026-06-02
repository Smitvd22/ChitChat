import { useEffect, useCallback } from 'react';

const VIBETYPE_URL = process.env.REACT_APP_VIBETYPE_URL || 'http://localhost:3001';

export function useVibeType(onMessageReceived) {
  const launchVibeType = useCallback(() => {
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
      // Mobile: open in new tab
      window.open(VIBETYPE_URL, '_blank');
    } else {
      // Desktop: open in popup window
      const width = 900;
      const height = 800;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      window.open(
        VIBETYPE_URL,
        'vibetype',
        `width=${width},height=${height},left=${left},top=${top}`
      );
    }
  }, []);

  useEffect(() => {
    const handleMessage = (event) => {
      // Validate origin
      if (event.origin !== VIBETYPE_URL) {
        return;
      }

      const data = event.data;
      if (data && data.type === 'VIBETYPE_MESSAGE') {
        // Sanitize and structure the payload
        const payload = {
          text: data.text || '',
          emojis: Array.isArray(data.emojis) ? data.emojis : [],
          metadata: data.metadata || null
        };
        
        if (onMessageReceived) {
          onMessageReceived(payload);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [onMessageReceived]);

  return { launchVibeType };
}

import React from 'react';

/**
 * MessageSkeleton — Shimmer loading skeleton for chat messages.
 * Replaces the plain "Loading messages..." text with an animated skeleton.
 */
const MessageSkeleton = () => {
  const skeletonLines = [
    { align: 'left', width: '55%', height: 44 },
    { align: 'right', width: '45%', height: 36 },
    { align: 'left', width: '65%', height: 52 },
    { align: 'right', width: '50%', height: 44 },
    { align: 'left', width: '40%', height: 36 },
    { align: 'right', width: '60%', height: 48 },
    { align: 'left', width: '50%', height: 40 },
    { align: 'right', width: '55%', height: 44 },
  ];

  return (
    <div className="message-skeleton-container">
      {skeletonLines.map((line, index) => (
        <div
          key={index}
          className={`message-skeleton ${line.align === 'right' ? 'skeleton-sent' : 'skeleton-received'}`}
          style={{ animationDelay: `${index * 0.08}s` }}
        >
          <div
            className="skeleton-bubble"
            style={{
              width: line.width,
              height: `${line.height}px`,
            }}
          >
            <div className="skeleton-shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default React.memo(MessageSkeleton);

import React from 'react';

const VibeTypeCard = ({ metadata }) => {
  if (!metadata || (!metadata.expressions?.length && !metadata.gestures?.length)) {
    return null;
  }

  return (
    <div className="vibetype-card" style={{
      marginTop: '8px',
      padding: '10px 14px',
      background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.1) 0%, rgba(79, 70, 229, 0.1) 100%)',
      borderRadius: '12px',
      border: '1px solid rgba(147, 51, 234, 0.2)',
      fontSize: '0.85rem',
      color: 'inherit'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span>🎭</span> VibeType Message
      </div>
      
      {metadata.expressions && metadata.expressions.length > 0 && (
        <div style={{ marginBottom: '4px' }}>
          <span style={{ opacity: 0.8 }}>Expressions: </span>
          <span style={{ fontWeight: '500' }}>
            {metadata.expressions.map(e => e.charAt(0).toUpperCase() + e.slice(1)).join(', ')}
          </span>
        </div>
      )}
      
      {metadata.gestures && metadata.gestures.length > 0 && (
        <div>
          <span style={{ opacity: 0.8 }}>Gestures: </span>
          <span style={{ fontWeight: '500' }}>
            {metadata.gestures.map(g => g.charAt(0).toUpperCase() + g.slice(1)).join(', ')}
          </span>
        </div>
      )}
    </div>
  );
};

export default VibeTypeCard;

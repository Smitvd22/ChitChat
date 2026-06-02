import React from 'react';

const VibeTypeButton = ({ onClick, disabled }) => {
  return (
    <button
      type="button"
      className="vibetype-button"
      onClick={onClick}
      disabled={disabled}
      title="Open VibeType"
      style={{
        background: 'none',
        border: 'none',
        fontSize: '1.2rem',
        cursor: disabled ? 'not-allowed' : 'pointer',
        padding: '0 8px',
        opacity: disabled ? 0.5 : 1,
        transition: 'transform 0.2s',
      }}
      onMouseOver={(e) => !disabled && (e.currentTarget.style.transform = 'scale(1.1)')}
      onMouseOut={(e) => !disabled && (e.currentTarget.style.transform = 'scale(1)')}
    >
      🎭
    </button>
  );
};

export default VibeTypeButton;

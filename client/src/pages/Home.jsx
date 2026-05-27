import React from 'react';
import { Link } from 'react-router-dom';

function Home() {
  return (
    <div className="home-container">
      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-orb hero-orb-1" />
        <div className="hero-orb hero-orb-2" />

        <div className="hero-eyebrow">
          <span>💫</span> Made for couples & friends
        </div>

        <h1>
          Connect, Chat &<br />
          <span className="highlight">Play Together</span>
        </h1>

        <p>
          The most immersive platform for couples to message, video call, 
          and play games in a neon-romantic universe built just for you two.
        </p>

        <div className="auth-buttons">
          <Link to="/register" className="btn btn-primary">
            🚀 Get Started Free
          </Link>
          <Link to="/login" className="btn btn-outline">
            Sign In →
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="home-stats">
        <div className="stat-item">
          <div className="stat-value">∞</div>
          <div className="stat-label">Messages Sent</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">💕</div>
          <div className="stat-label">Couples Connected</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">4+</div>
          <div className="stat-label">Games to Play</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">24/7</div>
          <div className="stat-label">Always Online</div>
        </div>
      </div>

      {/* Features Section */}
      <div className="features-section">
        <h2>Everything You Need to Connect ✨</h2>
        <div className="features-grid">
          <div className="feature-card" style={{ animationDelay: '0s' }}>
            <span className="feature-card-icon">💬</span>
            <h3>Real-time Messaging</h3>
            <p>Send messages, reactions, media, and replies instantly. Your conversations feel alive with smooth real-time updates.</p>
          </div>
          <div className="feature-card" style={{ animationDelay: '0.1s' }}>
            <span className="feature-card-icon">📹</span>
            <h3>HD Video Calls</h3>
            <p>Crystal-clear face-to-face conversations no matter the distance. Feel close even when you're far apart.</p>
          </div>
          <div className="feature-card" style={{ animationDelay: '0.2s' }}>
            <span className="feature-card-icon">🎮</span>
            <h3>Play Games Together</h3>
            <p>Challenge each other in Connect 4, Tic Tac Toe, Memory Cards, Dots & Boxes — right inside the chat!</p>
          </div>
          <div className="feature-card" style={{ animationDelay: '0.15s' }}>
            <span className="feature-card-icon">💌</span>
            <h3>Express Yourself</h3>
            <p>React to messages with emojis, reply to specific messages, and share photos & videos to tell your story.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
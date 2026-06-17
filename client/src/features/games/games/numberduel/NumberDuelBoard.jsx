import React, { useState } from 'react';
import './NumberDuelBoard.css';

const NumberDuelBoard = ({ gameState, playerId, makeMove }) => {
  const [secretInput, setSecretInput] = useState('');
  const [guessInput, setGuessInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!gameState) return null;

  const { status, players, currentTurn, mode, guesses, secrets, winner, p1GuessedCorrectly } = gameState;
  
  const playerIndex = players.findIndex(p => p.id === playerId);
  const opponentIndex = playerIndex === 0 ? 1 : 0;
  const isMyTurn = status === 'playing' && currentTurn === playerIndex;

  const handleToggleMode = (newMode) => {
    makeMove({ action: 'toggle_mode', mode: newMode });
  };

  const handleSetSecret = (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (secretInput.length !== 4) {
      setErrorMsg('Must be 4 digits.');
      return;
    }
    const unique = new Set(secretInput.split(''));
    if (unique.size !== 4) {
      setErrorMsg('Digits must be unique.');
      return;
    }
    makeMove({ action: 'set_secret', secret: secretInput });
    setSecretInput('');
  };

  const handleGuess = (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (guessInput.length !== 4) {
      setErrorMsg('Must be 4 digits.');
      return;
    }
    const unique = new Set(guessInput.split(''));
    if (unique.size !== 4) {
      setErrorMsg('Digits must be unique.');
      return;
    }
    makeMove({ action: 'guess', guess: guessInput });
    setGuessInput('');
  };

  const renderFeedbackEasy = (feedback) => {
    return (
      <div className="feedback-easy">
        {feedback.map((f, i) => (
          <div key={i} className={`feedback-digit status-${f.status}`}>
            {f.digit}
          </div>
        ))}
      </div>
    );
  };

  const renderFeedbackHard = (feedback) => {
    return (
      <div className="feedback-hard">
        <span className="feedback-badge correct">🟩 {feedback.correct}</span>
        <span className="feedback-badge position">🟨 {feedback.position}</span>
      </div>
    );
  };

  const renderGuesses = (guessList) => {
    if (!guessList || guessList.length === 0) {
      return <div className="no-guesses">No guesses yet.</div>;
    }
    return (
      <div className="guess-list">
        {guessList.map((g, i) => (
          <div key={i} className="guess-item">
            <div className="guess-number">{g.guess}</div>
            <div className="guess-feedback">
              {mode === 'easy' ? renderFeedbackEasy(g.feedback) : renderFeedbackHard(g.feedback)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const mySecret = secrets[playerId];
  const opponentId = players[opponentIndex]?.id;
  const opponentSecretSet = !!secrets[opponentId];
  const myGuesses = guesses[playerId] || [];
  const opponentGuesses = guesses[opponentId] || [];

  return (
    <div className="number-duel-board">
      
      {status === 'setup' && (
        <div className="setup-container">
          <h2 className="setup-title">Prepare for Duel</h2>
          
          <div className="mode-selector">
            <span className="mode-label">Mode:</span>
            <div className="mode-toggle">
              <button 
                className={`mode-btn ${mode === 'easy' ? 'active' : ''}`}
                onClick={() => handleToggleMode('easy')}
              >
                Easy
              </button>
              <button 
                className={`mode-btn ${mode === 'hard' ? 'active' : ''}`}
                onClick={() => handleToggleMode('hard')}
              >
                Hard
              </button>
            </div>
            <p className="mode-desc">
              {mode === 'easy' ? "Detailed per-digit feedback (Colors)." : "Only total correct and total in right position."}
            </p>
          </div>

          <div className="secret-input-section">
            {!mySecret ? (
              <form onSubmit={handleSetSecret} className="secret-form">
                <label>Set your 4-digit secret code (unique digits):</label>
                <input
                  type="number"
                  value={secretInput}
                  onChange={(e) => setSecretInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                  placeholder="e.g. 1942"
                  autoFocus
                />
                <button type="submit" className="submit-btn" disabled={secretInput.length !== 4}>Ready</button>
                {errorMsg && <div className="error-msg">{errorMsg}</div>}
              </form>
            ) : (
              <div className="waiting-status">
                <p>Your secret code is set: <strong>{mySecret}</strong></p>
                <p>Waiting for {players[opponentIndex].username} to be ready...</p>
              </div>
            )}
            <div className="opponent-status">
              {opponentSecretSet ? "Opponent is ready!" : "Opponent is picking their code..."}
            </div>
          </div>
        </div>
      )}

      {(status === 'playing' || status === 'finished') && (
        <div className="playing-container">
          <div className="game-header">
            <div className="mode-badge">Mode: {mode.toUpperCase()}</div>
            <div className="my-secret-display">Your Code: <span>{mySecret}</span></div>
          </div>

          {status === 'playing' && (
            <div className={`turn-indicator ${isMyTurn ? 'my-turn' : 'opponent-turn'}`}>
              {isMyTurn ? "Your Turn to Guess!" : `Waiting for ${players[opponentIndex].username}'s Guess...`}
              {p1GuessedCorrectly && playerIndex === 1 && <div className="last-chance-msg">🚨 Last Chance! Guess correctly to draw!</div>}
              {p1GuessedCorrectly && playerIndex === 0 && <div className="last-chance-msg">🚨 Opponent has one last chance to draw!</div>}
            </div>
          )}

          {status === 'finished' && (
            <div className="game-over-banner">
              <h2>Game Over</h2>
              {winner === 'draw' ? (
                <p>It's a Draw! Both codes cracked!</p>
              ) : winner === playerIndex ? (
                <p className="win-text">You Win! You cracked the code!</p>
              ) : (
                <p className="lose-text">You Lose! {players[opponentIndex].username} cracked your code!</p>
              )}
              <div className="revealed-secrets">
                <p>Opponent's Code was: <strong>{secrets[opponentId]}</strong></p>
              </div>
            </div>
          )}

          <div className="duel-arena">
            <div className="player-panel">
              <h3>Your Guesses</h3>
              {renderGuesses(myGuesses)}
              {isMyTurn && status === 'playing' && (
                <form onSubmit={handleGuess} className="guess-form">
                  <input
                    type="number"
                    value={guessInput}
                    onChange={(e) => setGuessInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                    placeholder="Enter 4-digit guess"
                    disabled={!isMyTurn}
                    autoFocus
                  />
                  <button type="submit" disabled={guessInput.length !== 4}>Guess</button>
                  {errorMsg && <div className="error-msg">{errorMsg}</div>}
                </form>
              )}
            </div>
            
            <div className="opponent-panel">
              <h3>{players[opponentIndex].username}'s Guesses</h3>
              {renderGuesses(opponentGuesses)}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default NumberDuelBoard;

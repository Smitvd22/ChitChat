import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../../../../services/authService';
import { useGameSocket } from '../../hooks/useGameSocket';
import GameLayout from '../../components/GameLayout';
import DotsBoxesBoard from './DotsBoxesBoard';
import '../../styles/Games.css';

const DotsBoxesPage = () => {
  const { friendId } = useParams();
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  const roomId = useMemo(() => {
    if (!currentUser?.id || !friendId) return null;
    return [currentUser.id, friendId].sort((a, b) => a - b).join('-');
  }, [currentUser?.id, friendId]);

  const player = useMemo(() => {
    if (!currentUser) return null;
    return { id: String(currentUser.id), username: currentUser.username };
  }, [currentUser]);

  const {
    gameState,
    error,
    connected,
    rematchPending,
    rematchRequested,
    opponentDisconnected,
    makeMove,
    requestRematch,
    leaveGame,
  } = useGameSocket({
    roomId,
    gameId: 'dots-boxes',
    player,
  });

  const myPlayerIndex = useMemo(() => {
    if (!gameState?.players || !currentUser) return -1;
    return gameState.players.findIndex(p => p.id === String(currentUser.id));
  }, [gameState?.players, currentUser]);

  const handleLineClick = (type, r, c) => {
    makeMove({ type, r, c });
  };

  const handleLeave = () => {
    leaveGame();
    navigate(`/games/${friendId}`);
  };

  const handleRematch = () => {
    requestRematch();
  };

  if (!currentUser || !roomId) {
    return (
      <div className="games-lobby-container">
        <div className="game-loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="game-page-container">
      <GameLayout
        players={gameState?.players || []}
        currentTurn={gameState?.currentTurn}
        currentPlayerId={String(currentUser.id)}
        status={gameState?.status || 'waiting'}
        winner={gameState?.winner}
        onLeave={handleLeave}
        gameName="Dots & Boxes"
      >
        {/* Connection / Error banners */}
        {!connected && (
          <div className="game-banner game-banner-warning">
            ⚠️ Reconnecting...
          </div>
        )}
        {error && (
          <div className="game-banner game-banner-error">
            {error}
          </div>
        )}
        {opponentDisconnected && (
          <div className="game-banner game-banner-warning">
            ⏳ Opponent disconnected. Waiting for reconnect...
          </div>
        )}

        {/* Waiting state */}
        {(!gameState || gameState.status === 'waiting') && (
          <div className="game-waiting-state">
            <div className="game-waiting-spinner" />
            <p>Waiting for your friend to join...</p>
            <p className="game-waiting-hint">Share this game from the chat!</p>
          </div>
        )}

        {/* Game board */}
        {gameState && gameState.status !== 'waiting' && (
          <>
            <DotsBoxesBoard
              gameState={gameState}
              myPlayerIndex={myPlayerIndex}
              onLineClick={handleLineClick}
            />

            {/* Game over actions */}
            {gameState.status === 'finished' && (
              <div className="game-over-actions">
                {rematchPending ? (
                  <div className="game-rematch-pending">
                    <div className="game-waiting-spinner small" />
                    <span>Waiting for opponent...</span>
                  </div>
                ) : rematchRequested ? (
                  <div className="game-rematch-request">
                    <p>Opponent wants a rematch!</p>
                    <button className="game-rematch-btn" onClick={handleRematch}>
                      🔄 Accept Rematch
                    </button>
                  </div>
                ) : (
                  <button className="game-rematch-btn" onClick={handleRematch}>
                    🔄 Rematch
                  </button>
                )}
                <button className="game-leave-action-btn" onClick={handleLeave}>
                  🚪 Leave Game
                </button>
              </div>
            )}
          </>
        )}
      </GameLayout>
    </div>
  );
};

export default DotsBoxesPage;

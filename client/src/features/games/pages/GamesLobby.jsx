import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import GameCard from '../components/GameCard';
import SplitLayout from '../../../components/layout/SplitLayout';
import '../styles/Games.css';

const GAMES = [
  {
    id: 'number-duel',
    name: 'Number Duel',
    emoji: '🔢',
    description: 'Crack your opponent\'s code before they crack yours!',
    available: true,
  },
  {
    id: 'connect4',
    name: 'Connect 4',
    emoji: '🔴',
    description: 'Drop discs to connect four in a row!',
    available: true,
  },
  {
    id: 'quoridor',
    name: 'Quoridor',
    emoji: '🧱',
    description: 'Race to the other side while building walls to block your opponent.',
    available: true,
  },
  {
    id: 'tictactoe',
    name: 'Tic-Tac-Toe',
    emoji: '❌',
    description: 'The classic game of X\'s and O\'s. Simple, fast, and competitive.',
    available: true,
  },
  {
    id: 'seabattle',
    name: 'Sea Battle',
    emoji: '🚢',
    description: 'Deploy your fleet and sink the enemy before they sink you!',
    available: true,
  },

  {
    id: 'dots-boxes',
    name: 'Dots & Boxes',
    emoji: '🔲',
    description: 'Connect dots to claim boxes.',
    available: true,
  },
  {
    id: 'memory-cards',
    name: 'Memory Cards',
    emoji: '🃏',
    description: 'Find the matching pairs.',
    available: true,
  }
];

const GamesLobby = () => {
  const { friendId } = useParams();
  const navigate = useNavigate();

  const handlePlay = (gameId) => {
    navigate(`/games/${friendId}/${gameId}`);
  };

  return (
    <SplitLayout friendId={friendId}>
      <div className="game-page-container">
        <div className="games-lobby-container">
          <div className="games-lobby-header">
            <button className="game-leave-btn" onClick={() => navigate(`/chat/${friendId}`)}>
              ← Back to Chat
            </button>
            <h1 className="games-lobby-title">
              <span className="games-lobby-emoji">🎮</span> Game Zone
            </h1>
            <div className="game-header-spacer" />
          </div>

          <p className="games-lobby-subtitle">
            ⚡ Choose a game and challenge your partner!
          </p>

          <div className="games-grid">
            {GAMES.map((game) => (
              <GameCard
                key={game.id}
                name={game.name}
                emoji={game.emoji}
                description={game.description}
                available={game.available}
                onPlay={() => handlePlay(game.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </SplitLayout>
  );
};

export default GamesLobby;

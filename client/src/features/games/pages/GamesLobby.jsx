import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import GameCard from '../components/GameCard';
import '../styles/Games.css';

const GAMES = [
  {
    id: 'connect4',
    name: 'Connect 4',
    emoji: '🔴',
    description: 'Drop discs to connect four in a row!',
    available: true,
  },
  {
    id: 'tictactoe',
    name: 'Tic Tac Toe',
    emoji: '❌',
    description: 'Classic X and O battle.',
    available: false,
  },
  {
    id: 'reaction-tap',
    name: 'Reaction Tap',
    emoji: '⚡',
    description: 'Test your reflexes against a friend.',
    available: false,
  },
  {
    id: 'dots-boxes',
    name: 'Dots & Boxes',
    emoji: '🔲',
    description: 'Connect dots to claim boxes.',
    available: false,
  },
  {
    id: 'memory-cards',
    name: 'Memory Cards',
    emoji: '🃏',
    description: 'Flip and match pairs to win.',
    available: false,
  },
  {
    id: 'ping-pong',
    name: 'Ping Pong',
    emoji: '🏓',
    description: 'Fast-paced table tennis action.',
    available: false,
  },
  {
    id: 'snake-battle',
    name: 'Snake Battle',
    emoji: '🐍',
    description: 'Grow your snake, outlast your rival.',
    available: false,
  },
];

const GamesLobby = () => {
  const { friendId } = useParams();
  const navigate = useNavigate();

  const handlePlay = (gameId) => {
    navigate(`/games/${friendId}/${gameId}`);
  };

  return (
    <div className="games-lobby-container">
      <div className="games-lobby-header">
        <button className="game-leave-btn" onClick={() => navigate(`/chat/${friendId}`)}>
          ← Back to Chat
        </button>
        <h1 className="games-lobby-title">
          <span className="games-lobby-emoji">🎮</span> Games
        </h1>
        <div className="game-header-spacer" />
      </div>

      <p className="games-lobby-subtitle">Choose a game to play with your friend!</p>

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
  );
};

export default GamesLobby;

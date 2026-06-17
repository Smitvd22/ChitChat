/**
 * Number Duel - Pure Game Logic Module
 */

export function createGame(players) {
  return {
    gameId: 'number-duel',
    players,
    mode: 'easy', // 'easy' or 'hard'
    status: players.length === 2 ? 'setup' : 'waiting', // waiting -> setup -> playing -> finished
    currentTurn: 0, // index into players array
    secrets: {}, // { [playerId]: "1234" }
    guesses: {}, // { [playerId]: [{ guess: "1234", feedback: [...] }] }
    winner: null, // null | 0 | 1 | 'draw'
    rematchRequests: [],
    lastMoveTimestamp: Date.now(),
    p1GuessedCorrectly: false, // Flag to indicate if player 0 guessed correctly on their turn
  };
}

function isValidSecret(secret) {
  if (typeof secret !== 'string' || secret.length !== 4) return false;
  if (!/^\d{4}$/.test(secret)) return false;
  const uniqueDigits = new Set(secret.split(''));
  return uniqueDigits.size === 4;
}

function calculateFeedback(guess, secret, mode) {
  if (mode === 'easy') {
    return guess.split('').map((digit, i) => {
      if (digit === secret[i]) {
        return { digit, status: 'correct' }; // Green
      } else if (secret.includes(digit)) {
        return { digit, status: 'position' }; // Yellow
      } else {
        return { digit, status: 'none' }; // Gray
      }
    });
  } else {
    let correct = 0;
    let position = 0;
    for (let i = 0; i < 4; i++) {
      if (guess[i] === secret[i]) {
        correct++;
      } else if (secret.includes(guess[i])) {
        position++;
      }
    }
    return { correct, position };
  }
}

export function makeMove(state, payload, playerId) {
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) {
    return { valid: false, error: 'Player not in this game' };
  }

  const newState = { ...state, lastMoveTimestamp: Date.now() };

  // Setup phase actions
  if (state.status === 'setup') {
    if (payload.action === 'toggle_mode') {
      newState.mode = payload.mode; // 'easy' or 'hard'
      return { valid: true, state: newState };
    }

    if (payload.action === 'set_secret') {
      const secret = payload.secret;
      if (!isValidSecret(secret)) {
        return { valid: false, error: 'Invalid secret number. Must be 4 unique digits.' };
      }

      newState.secrets = { ...state.secrets, [playerId]: secret };
      newState.guesses = { ...state.guesses, [playerId]: [] }; // Initialize guesses

      // Check if both players have set their secrets
      if (Object.keys(newState.secrets).length === 2) {
        newState.status = 'playing';
        newState.currentTurn = 0;
      }
      return { valid: true, state: newState };
    }
  }

  // Playing phase actions
  if (state.status === 'playing') {
    if (payload.action === 'guess') {
      if (playerIndex !== state.currentTurn) {
        return { valid: false, error: 'Not your turn' };
      }

      const guess = payload.guess;
      if (!isValidSecret(guess)) {
        return { valid: false, error: 'Invalid guess. Must be 4 unique digits.' };
      }

      const opponentIndex = playerIndex === 0 ? 1 : 0;
      const opponentId = state.players[opponentIndex].id;
      const secret = state.secrets[opponentId];

      const feedback = calculateFeedback(guess, secret, state.mode);
      const isCorrect = guess === secret;

      const newGuesses = [...(state.guesses[playerId] || []), { guess, feedback, isCorrect }];
      newState.guesses = { ...state.guesses, [playerId]: newGuesses };

      // Win / Draw logic
      if (isCorrect) {
        if (playerIndex === 0) {
          // Player 0 guessed correctly. Give Player 1 a last chance.
          newState.p1GuessedCorrectly = true;
          newState.currentTurn = 1;
        } else {
          // Player 1 guessed correctly.
          if (state.p1GuessedCorrectly) {
            // Player 1 also guessed correctly on their last chance -> Draw
            newState.status = 'finished';
            newState.winner = 'draw';
          } else {
            // Player 1 guessed correctly and Player 0 didn't -> Player 1 wins
            newState.status = 'finished';
            newState.winner = 1;
          }
        }
      } else {
        if (playerIndex === 1 && state.p1GuessedCorrectly) {
          // Player 1 failed their last chance -> Player 0 wins
          newState.status = 'finished';
          newState.winner = 0;
        } else {
          // Normal turn transition
          newState.currentTurn = playerIndex === 0 ? 1 : 0;
        }
      }

      return { valid: true, state: newState };
    }
  }

  return { valid: false, error: 'Invalid move' };
}

export function resetForRematch(state) {
  const newState = createGame(state.players);
  // Optional: keep the same mode, but let's reset to easy or keep it
  newState.mode = state.mode; 
  // We keep mode, but currentTurn will be 0 on setup phase (doesn't matter much for setup)
  // Actually setup is parallel. Whoever sets secret first is fine.
  newState.status = 'setup';
  return newState;
}

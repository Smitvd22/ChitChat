import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Friends from './pages/Friends';
import Chat from './pages/Chat';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import { getCurrentUser } from './services/authService';
import { CallProvider } from './contexts/CallContext';
import { ThemeProvider } from './contexts/ThemeContext';
import './App.css';
import './styles/LoveTheme.css';
import VideoCall from './pages/VideoCall';
import { GamesLobby, Connect4Page, TicTacToePage, DotsBoxesPage, MemoryCardsPage } from './features/games';

function App() {
  // Function to check if user is authenticated
  const isAuthenticated = () => {
    const user = getCurrentUser();
    return !!user && !!user.token;
  };

  // Check if loaded inside Mobile App WebView
  const isWebView = new URLSearchParams(window.location.search).get('webview') === 'true';

  return (
    <ThemeProvider>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <CallProvider>
          <div className="App">
            <div className="floating-hearts">
              {[...Array(15)].map((_, i) => (
                <div
                  key={`heart-${i}`}
                  className="heart"
                  style={{
                    left: `${Math.random() * 100}%`,
                    animationDuration: `${15 + Math.random() * 15}s`,
                    animationDelay: `${Math.random() * 10}s`,
                    width: `${10 + Math.random() * 14}px`,
                    height: `${10 + Math.random() * 14}px`,
                  }}
                />
              ))}
            </div>
            {!isWebView && <Navbar />}
            <Routes>
              {/* Public routes */}
              <Route path="/home" element={<Home />} />
              <Route
                path="/login"
                element={isAuthenticated() ? <Navigate to="/friends" /> : <Login />}
              />
              <Route
                path="/register"
                element={isAuthenticated() ? <Navigate to="/friends" /> : <Register />}
              />

              <Route path="/" element={<Home />} />

              {/* Protected routes */}
              <Route
                path="/friends"
                element={
                  <ProtectedRoute>
                    <Friends />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/chat/:friendId"
                element={
                  <ProtectedRoute>
                    <Chat />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/videocall/:callId"
                element={
                  <ProtectedRoute>
                    <VideoCall />
                  </ProtectedRoute>
                }
              />
              {/* Game routes */}
              <Route
                path="/games/:friendId"
                element={
                  <ProtectedRoute>
                    <GamesLobby />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/games/:friendId/connect4"
                element={
                  <ProtectedRoute>
                    <Connect4Page />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/games/:friendId/tictactoe"
                element={
                  <ProtectedRoute>
                    <TicTacToePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/games/:friendId/dots-boxes"
                element={
                  <ProtectedRoute>
                    <DotsBoxesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/games/:friendId/memory-cards"
                element={
                  <ProtectedRoute>
                    <MemoryCardsPage />
                  </ProtectedRoute>
                }
              />
              {/* Redirect all other routes */}
              <Route path="*" element={isAuthenticated() ? <Navigate to="/friends" /> : <Navigate to="/login" />} />
            </Routes>
          </div>
        </CallProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
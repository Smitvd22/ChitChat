import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { login, getCurrentUser } from '../services/authService';
import '../styles/Auth.css';

function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Reset component state when mounted
  useEffect(() => {
    setIdentifier('');
    setPassword('');
    setError('');
    setLoading(false);
    setSuccess('');
    const user = getCurrentUser();
    if (user) navigate('/friends');
  }, [navigate, location.search]);

  // Check if user was redirected after registration or from a protected route
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('registered') === 'true') setSuccess('Registration successful! Please log in.');
    if (params.get('from')) setError(`Please login to access ${params.get('from')}`);
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!identifier || !password) { setError('Please enter your login details'); return; }
    try {
      setLoading(true);
      await login(identifier, password);
      setLoading(false);
      const from = new URLSearchParams(location.search).get('from') || '/friends';
      navigate(from);
    } catch (err) {
      setLoading(false);
      setError(err.toString());
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* Brand */}
        <div className="auth-brand">
          <img src={process.env.PUBLIC_URL + '/ChitChatLogo.png'} alt="ChitChat" className="auth-logo-img" />
        </div>

        <h2>Welcome Back</h2>
        <p className="auth-subtitle">Sign in to continue your conversations ✨</p>

        {error && <div className="auth-error">⚠️ {error}</div>}
        {success && <div className="auth-success">✅ {success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="identifier">Username / Email / Mobile</label>
            <input
              type="text"
              id="identifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Enter your username, email, or mobile"
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? '✨ Signing in...' : '💫 Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account? <Link to="/register">Create one →</Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
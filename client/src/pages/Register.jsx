import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../services/authService';
import logoImg from '../assets/ChitChatLogo.png';
import '../styles/Auth.css';

function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.username || !formData.email || !formData.mobile || !formData.password) {
      setError('All fields are required');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }
    const phoneRegex = /^\d{10,12}$/;
    if (!phoneRegex.test(formData.mobile)) {
      setError('Please enter a valid mobile number (10-12 digits)');
      return;
    }

    try {
      setLoading(true);
      setDebugInfo('Sending registration request...');
      const userData = {
        username: formData.username,
        email: formData.email,
        mobile: formData.mobile,
        password: formData.password
      };
      const apiUrl = process.env.REACT_APP_API_URL ||
        (process.env.NODE_ENV === 'production'
          ? 'https://chitchat-3l35.onrender.com'
          : 'http://localhost:5000/api');
      setDebugInfo(`Sending request to: ${apiUrl}/auth/register`);
      console.log('Registration data:', userData);
      const response = await register(userData);
      console.log('Registration response:', response);
      setDebugInfo('Registration successful');
      setLoading(false);
      navigate('/friends?registered=true');
    } catch (err) {
      setLoading(false);
      console.error('Registration error details:', err);
      let errorMsg = 'Unknown error occurred';
      let statusCode = 'unknown status';
      if (err.response) {
        statusCode = err.response.status;
        errorMsg = err.response.data?.error || err.response.statusText;
        console.log('Error response:', err.response);
      } else if (err.request) {
        errorMsg = 'No response from server - check if server is running';
        console.log('Error request:', err.request);
      } else {
        errorMsg = err.message;
      }
      setError(errorMsg);
      setDebugInfo(`Error: ${errorMsg} (${statusCode})`);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* Brand */}
        <div className="auth-brand">
          <img src={logoImg} alt="ChitChat" className="auth-logo-img" />
        </div>

        <h2>Create Account</h2>
        <p className="auth-subtitle">Join and start connecting with your loved ones 💕</p>

        {error && <div className="auth-error">⚠️ {error}</div>}
        {process.env.NODE_ENV === 'development' && debugInfo && (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: '8px 0', padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
            Debug: {debugInfo}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Choose a username"
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="mobile">Mobile Number</label>
            <input
              type="tel"
              id="mobile"
              name="mobile"
              value={formData.mobile}
              onChange={handleChange}
              placeholder="10-12 digit mobile number"
              autoComplete="tel"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Create a strong password"
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm your password"
              autoComplete="new-password"
            />
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? '✨ Creating Account...' : '🚀 Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in →</Link>
        </div>
      </div>
    </div>
  );
}

export default Register;
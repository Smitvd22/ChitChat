import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getCurrentUser, logout } from '../services/authService';
import { useTheme } from '../contexts/ThemeContext';
import logoImg from '../assets/ChitChatLogoSmall.png';
import '../styles/Navbar.css';

const Navbar = () => {
  const [user, setUser] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showNavbar, setShowNavbar] = useState(true);
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  // Update user state when location changes or component mounts
  useEffect(() => {
    const updateUserState = () => {
      const currentUser = getCurrentUser();
      setUser(currentUser);
    };
    updateUserState();
    const handleStorageChange = () => updateUserState();
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [location.pathname]);

  // Close dropdown/menu on route change
  useEffect(() => {
    setShowDropdown(false);
    setMenuOpen(false);
  }, [location.pathname]);

  // Handle scroll events to show/hide navbar
  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollingDown = window.scrollY > lastScrollY + 5;
          const scrollingUp = window.scrollY < lastScrollY - 5;
          if (scrollingDown && window.scrollY > 50) {
            setShowNavbar(false);
          } else if (scrollingUp) {
            setShowNavbar(true);
          }
          lastScrollY = window.scrollY;
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMenu = () => setMenuOpen(!menuOpen);

  const handleLogout = () => {
    logout();
    setUser(null);
    setShowDropdown(false);
    window.location.href = '/home';
  };

  const getInitial = (name) => (name ? name.charAt(0).toUpperCase() : 'U');

  return (
    <nav className={`navbar ${showNavbar ? 'navbar-visible' : 'navbar-hidden'}`}>
      <div className="navbar-container">
        {/* Logo */}
        <Link to="/home" className="navbar-logo">
          <img src={logoImg} alt="ChitChat" className="navbar-logo-img" />
          <span className="navbar-logo-text">ChitChat</span>
        </Link>

        {/* Desktop Nav Menu */}
        <div className={`nav-menu ${menuOpen ? 'active' : ''}`}>
          {!user ? (
            <>
              <Link to="/login" className="nav-item" onClick={() => setMenuOpen(false)}>Login</Link>
              <Link to="/register" className="nav-item" onClick={() => setMenuOpen(false)}>Register</Link>
            </>
          ) : (
            <>
              <Link to="/friends" className="nav-item" onClick={() => setMenuOpen(false)}>💬 Friends</Link>
              <div className="profile-container">
                <div
                  className="profile-menu"
                  onClick={() => setShowDropdown(!showDropdown)}
                >
                  <div className="avatar">{getInitial(user.username)}</div>
                  <span className="username">{user.username || 'User'}</span>
                  <span className="profile-chevron">▼</span>
                </div>
                {showDropdown && (
                  <div className="profile-dropdown">
                    <div className="dropdown-user-info">
                      <div className="dropdown-avatar">{getInitial(user.username)}</div>
                      <div>
                        <p className="dropdown-username">{user.username || 'User'}</p>
                        <p className="dropdown-email">{user.email || 'No email'}</p>
                      </div>
                    </div>
                    <div className="dropdown-divider" />
                    <Link
                      to="/friends"
                      className="dropdown-item"
                      onClick={() => setShowDropdown(false)}
                    >
                      <span className="dropdown-item-icon">👥</span> Friends
                    </Link>
                    <div className="dropdown-divider" />
                    <div className="dropdown-item logout" onClick={handleLogout}>
                      <span className="dropdown-item-icon">🚪</span> Logout
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right side: Theme toggle + Hamburger */}
        <div className="nav-right">
          <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          <div
            className={`menu-toggle ${menuOpen ? 'active' : ''}`}
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
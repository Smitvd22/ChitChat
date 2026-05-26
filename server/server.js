import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { pool } from './config/db.js';
import { initializeSocketIO } from './sockets/index.js';
import { initializeDatabase } from './config/initDb.js';
import authRoutes from './routes/authRoutes.js';
import friendRoutes from './routes/friendRoutes.js';
import userRoutes from './routes/userRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import { v4 as uuidv4 } from 'uuid';
import { setupPeerServer } from './peerServer.js';

const app = express();
const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = createServer(app);

// Middleware
app.use(express.json());

// Request logging middleware for debugging
app.use((req, res, next) => {
  console.log(`[DEBUG] ${req.method} ${req.url} - Origin: ${req.headers.origin || 'none'}`);
  next();
});

// Enhanced CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',')
      : [
          'http://localhost:3000',
          'http://127.0.0.1:3000',
          'http://localhost:8081',
          'http://127.0.0.1:8081',
          'https://chitchat-3l35.onrender.com'
        ];
    
    if (allowedOrigins.indexOf(origin) !== -1 || 
        origin.match(/^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+):\d+$/) ||
        origin.match(/^https:\/\/.*\.loca\.lt$/) ||
        origin.match(/^https:\/\/.*\.pinggy-free\.link$/)) {
      callback(null, true);
    } else {
      console.warn('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Initialize database schema
initializeDatabase().catch(console.error);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);

// Status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    environment: NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Room creation endpoint
app.get('/api/videoroom/create', (req, res) => {
  const roomId = uuidv4();
  res.json({ roomId });
});

app.get('/', (req, res) => {
  res.send(`
    <h1>ChitChat API Server</h1>
    <p>Environment: ${NODE_ENV}</p>
    <p>Timestamp: ${new Date().toISOString()}</p>
    <p><a href="/api/status">API Status (JSON)</a></p>
  `);
});

// Database Test
pool.query('SELECT NOW()', (err) => {
  if (err) console.error('DB Connection Error:', err);
  else console.log(`Connected to database (${NODE_ENV} environment)`);
});

// Start server
server.listen(PORT, () => {
  const isProduction = NODE_ENV === 'production';
  const baseUrl = isProduction ? 'https://chitchat-3l35.onrender.com' : `http://localhost:${PORT}`;
  
  console.log(`🚀 Server running on port ${PORT} in ${NODE_ENV} mode`);
  console.log(`📡 API Status: ${baseUrl}/api/status`);
  console.log(`🌐 Server: \x1b[36m${baseUrl}\x1b[0m`);
  console.log(`🎥 Video calls using cloud PeerJS service`); // Add this line
});

// Initialize Socket.IO with unified handlers
initializeSocketIO(server, app);

// Setup PeerJS server for development
setupPeerServer(server);
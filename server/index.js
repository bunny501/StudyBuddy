require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5174',
  'https://study-buddy-opal.vercel.app'
];

if (process.env.CLIENT_URL) {
  process.env.CLIENT_URL.split(',').forEach(u => allowedOrigins.push(u.trim()));
}

app.use(cors({
  origin: (origin, callback) => {
    if (
      !origin ||
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      origin.endsWith('.onrender.com') ||
      origin.endsWith('.railway.app') ||
      origin.endsWith('.koyeb.app') ||
      process.env.NODE_ENV !== 'production'
    ) {
      return callback(null, true);
    }
    return callback(new Error('CORS not allowed by server'), false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));

app.use(express.json());

// Attach io instance to request for routes to broadcast real-time events
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/notes', require('./routes/notes'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/tests', require('./routes/tests'));
app.use('/api/battles', require('./routes/battles'));
app.use('/api/doubts', require('./routes/doubts'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// Serve built frontend assets if present
const clientDistPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  // Express 5 compatible SPA fallback
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => res.json({ status: 'Study Buddy API running' }));
}

// Socket.io (Map of userId -> Set of socketIds)
const onlineUsers = new Map();

io.on('connection', (socket) => {
  socket.on('user:online', (userId) => {
    if (!userId) return;
    const uid = userId.toString();
    if (!onlineUsers.has(uid)) onlineUsers.set(uid, new Set());
    onlineUsers.get(uid).add(socket.id);
    io.emit('users:online', Array.from(onlineUsers.keys()));
  });

  // DM
  socket.on('dm:send', async ({ from, fromUsername, to, toUsername, text }) => {
    try {
      const msg = await Message.create({ from, fromUsername, to, toUsername, text, type: 'dm' });
      const toSockets = onlineUsers.get(to?.toString());
      if (toSockets) {
        toSockets.forEach(sid => io.to(sid).emit('dm:receive', msg));
      }
      socket.emit('dm:receive', msg);
    } catch (e) { console.error(e); }
  });

  // Group chat
  socket.on('group:join', (groupId) => socket.join(`group:${groupId}`));
  socket.on('group:leave', (groupId) => socket.leave(`group:${groupId}`));
  socket.on('group:send', async ({ from, fromUsername, groupId, text }) => {
    try {
      const msg = await Message.create({ from, fromUsername, groupId, text, type: 'group' });
      io.to(`group:${groupId}`).emit('group:receive', msg);
    } catch (e) { console.error(e); }
  });

  // Battle room
  socket.on('battle:join', (battleId) => socket.join(`battle:${battleId}`));
  socket.on('battle:leave', (battleId) => socket.leave(`battle:${battleId}`));
  socket.on('battle:update', (data) => io.to(`battle:${data.battleId}`).emit('battle:updated', data));

  // Test room
  socket.on('test:join', (testId) => socket.join(`test:${testId}`));
  socket.on('test:leave', (testId) => socket.leave(`test:${testId}`));
  socket.on('test:update', (data) => io.to(`test:${data.testId}`).emit('test:updated', data));

  socket.on('disconnect', () => {
    for (const [uid, sids] of onlineUsers.entries()) {
      if (sids.has(socket.id)) {
        sids.delete(socket.id);
        if (sids.size === 0) onlineUsers.delete(uid);
        break;
      }
    }
    io.emit('users:online', Array.from(onlineUsers.keys()));
  });
});

const PORT = process.env.PORT || 5000;

if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI)
    .then(() => {
      console.log('MongoDB connected');
      server.listen(PORT, () => console.log(`Server on port ${PORT}`));
    })
    .catch(e => {
      console.error('DB error:', e.message);
      server.listen(PORT, () => console.log(`Server on port ${PORT} (no DB)`));
    });
} else {
  console.warn('Warning: MONGO_URI is not set. Running server without DB.');
  server.listen(PORT, () => console.log(`Server on port ${PORT} (no DB)`));
}


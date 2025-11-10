// ------------------- Imports -------------------
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path'); // ✅ FIX #1: Added missing import
const Rooms = require('./rooms');

// ------------------- Setup ---------------------
const app = express();
const server = http.createServer(app);

// ✅ FIX #2: Proper CORS setup (cross-device support)
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const rooms = new Rooms();

// ------------------- Serve Frontend ------------
app.use(express.static(path.join(__dirname, '../client'))); // ✅ FIX #3: Correct static path

// ✅ Serve index.html for any route (needed on Render)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// ------------------- Socket.IO Logic ------------
io.on('connection', socket => {
  console.log('🟢 User connected:', socket.id);

  socket.on('join', ({ roomId, userName }) => {
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.userName = userName || 'Anon';

    rooms.addUser(roomId, socket.id, socket.data.userName);
    const state = rooms.getRoomState(roomId);

    socket.emit('init-state', state);
    io.to(roomId).emit('users-update', rooms.getUsers(roomId));
    console.log(`${socket.data.userName} joined ${roomId}`);
  });

  socket.on('stroke-data', (payload) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;

    const stamped = rooms.addStroke(roomId, payload);
    io.to(roomId).emit('stroke-broadcast', stamped);
  });

  socket.on('cursor', data => {
    const roomId = socket.data.roomId;
    if (!roomId) return;

    io.to(roomId)
      .except(socket.id)
      .emit('cursor-update', {
        socketId: socket.id,
        userName: socket.data.userName,
        ...data
      });
  });

  socket.on('undo', () => {
    const roomId = socket.data.roomId;
    const op = rooms.undo(roomId, socket.id);
    if (op) io.to(roomId).emit('history-update', { op });
  });

  socket.on('redo', () => {
    const roomId = socket.data.roomId;
    const op = rooms.redo(roomId, socket.id);
    if (op) io.to(roomId).emit('history-update', { op });
  });

  socket.on('disconnect', () => {
    const roomId = socket.data.roomId;
    if (roomId) {
      rooms.removeUser(roomId, socket.id);
      io.to(roomId).emit('users-update', rooms.getUsers(roomId));
      console.log(`🔴 ${socket.data.userName} disconnected from ${roomId}`);
    }
  });
});

// ------------------- Start Server ---------------
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`✅ Server listening on ${PORT}`));

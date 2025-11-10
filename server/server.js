const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const Rooms = require('./rooms');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const rooms = new Rooms();

app.use(express.static(__dirname + '../client'));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});


io.on('connection', socket => {
  socket.on('join', ({ roomId, userName }) => {
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.userName = userName || 'Anon';
    rooms.addUser(roomId, socket.id, socket.data.userName);
    const state = rooms.getRoomState(roomId);
    socket.emit('init-state', state);
    io.to(roomId).emit('users-update', rooms.getUsers(roomId));
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
    io.to(roomId).except(socket.id).emit('cursor-update', { socketId: socket.id, userName: socket.data.userName, ...data });
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
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server listening on ${PORT}`));

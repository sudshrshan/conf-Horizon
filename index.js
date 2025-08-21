const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(bodyParser.json());

const emailToSocket = new Map();
const socketToEmail = new Map();

io.on('connection', (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on('join-room', ({ roomId, emailId }) => {
    console.log(`${emailId} joined room ${roomId}`);
    emailToSocket.set(emailId, socket.id);
    socketToEmail.set(socket.id, emailId);
    socket.join(roomId);

    socket.emit('joined-room', { roomId });
    socket.broadcast.to(roomId).emit('user-joined', { emailId });
  });

  socket.on('call-user', ({ emailId, offer }) => {
    const toSocket = emailToSocket.get(emailId);
    const fromEmail = socketToEmail.get(socket.id);
    if (toSocket) {
      io.to(toSocket).emit('incomming-call', { from: fromEmail, offer });
    }
  });

  socket.on('call-accepted', ({ emailId, ans }) => {
    const toSocket = emailToSocket.get(emailId);
    if (toSocket) {
      io.to(toSocket).emit('call-accepted', { ans });
    }
  });

  socket.on('ice-candidate', ({ to, candidate }) => {
    const toSocket = emailToSocket.get(to);
    if (toSocket) {
      io.to(toSocket).emit('ice-candidate', { candidate });
    }
  });

  socket.on('user-left', ({ emailId }) => {
    const toSocket = emailToSocket.get(emailId);
    if (toSocket) {
      io.to(toSocket).emit('user-left');
    }
  });

  socket.on('disconnect', () => {
    const email = socketToEmail.get(socket.id);
    console.log("Disconnected:", email);
    if (email) {
      emailToSocket.delete(email);
    }
    socketToEmail.delete(socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

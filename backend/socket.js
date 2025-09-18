// backend/socket.js
// Socket.io server setup and user-session management

const { Server } = require('socket.io');

// userId -> socketId
const userSocketMap = new Map();

function setupSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    // Listen for user identification after login
    socket.on('register-session', ({ userId }) => {
      userSocketMap.set(userId, socket.id);
    });

    socket.on('disconnect', () => {
      // Remove any userId associated with this socket
      for (const [userId, sId] of userSocketMap.entries()) {
        if (sId === socket.id) {
          userSocketMap.delete(userId);
          break;
        }
      }
    });
  });

  return io;
}

function forceLogoutUser(userId) {
  // Emit a force-logout event to the user's socket
  const socketId = userSocketMap.get(userId);
  if (socketId && global._io) {
    global._io.to(socketId).emit('force-logout');
  }
}

module.exports = {
  setupSocket,
  forceLogoutUser
};

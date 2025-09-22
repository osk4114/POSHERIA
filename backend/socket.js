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
    console.log('🔌 [BACKEND] Nueva conexión socket:', socket.id);
    
    // Listen for user identification after login
    socket.on('register-session', ({ userId }) => {
      console.log('📡 [BACKEND] Usuario registrado en socket:', userId, 'Socket ID:', socket.id);
      userSocketMap.set(userId, socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ [BACKEND] Socket desconectado:', socket.id, 'Razón:', reason);
      // Remove any userId associated with this socket
      for (const [userId, sId] of userSocketMap.entries()) {
        if (sId === socket.id) {
          console.log('🗑️ [BACKEND] Removiendo usuario del mapa:', userId);
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

function getSocketIO() {
  return global._io;
}

module.exports = {
  setupSocket,
  forceLogoutUser,
  getSocketIO
};

// frontend/src/socket.js
import { io } from 'socket.io-client';

let socket = null;

export function connectSocket(userId) {
  if (!socket) {
    socket = io(); // Asume mismo host/puerto que backend
  }
  socket.emit('register-session', { userId });
  return socket;
}

export function getSocket() {
  return socket;
}

export function onForceLogout(callback) {
  if (!socket) return;
  socket.on('force-logout', callback);
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

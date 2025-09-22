// frontend/src/socket.js
import { io } from 'socket.io-client';

let socket = null;
let currentUserId = null;

export function connectSocket(userId) {
  console.log('🔌 [FRONTEND] socket.js: connectSocket() llamado para userId:', userId);
  
  // Si ya existe una conexión para el mismo usuario, la reutilizamos
  if (socket && socket.connected && currentUserId === userId) {
    console.log('🔌 [FRONTEND] socket.js: Reutilizando conexión socket existente');
    return socket;
  }
  
  // Si hay una conexión anterior, la cerramos
  if (socket) {
    console.log('🔌 [FRONTEND] socket.js: Cerrando conexión anterior');
    socket.disconnect();
    socket = null;
  }
  
  console.log('🔌 [FRONTEND] socket.js: Creando nueva conexión socket...');
  socket = io('http://10.1.3.14:3000', {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10, // Más intentos
    reconnectionDelay: 1000,  // Menos delay
    timeout: 10000,           // Más tiempo
    transports: ['websocket', 'polling'] // Fallback a polling
  });
  
  currentUserId = userId;
  
  socket.on('connect', () => {
    console.log('✅ [FRONTEND] socket.js: Socket conectado exitosamente, ID:', socket.id);
    // Registrar sesión solo después de conectar
    socket.emit('register-session', { userId });
  });
  
  socket.on('connect_error', (error) => {
    console.error('❌ [FRONTEND] socket.js: Error de conexión socket:', error);
  });
  
  socket.on('disconnect', (reason) => {
    console.log('🔌 [FRONTEND] socket.js: Socket desconectado:', reason);
  });
  
  return socket;
}

export function getSocket() {
  return socket;
}

export function onForceLogout(callback) {
  console.log('⚠️ socket.js: Configurando listener para force-logout');
  if (!socket) return;
  
  // Remover listeners previos para evitar duplicados
  socket.off('force-logout');
  socket.on('force-logout', () => {
    console.log('⚠️ socket.js: Evento force-logout recibido');
    callback();
  });
}

export function disconnectSocket() {
  console.log('🔌 socket.js: disconnectSocket() llamado');
  if (socket) {
    console.log('🔌 socket.js: Desconectando socket...');
    socket.disconnect();
    socket = null;
    currentUserId = null;
    console.log('✅ socket.js: Socket desconectado y variable limpiada');
  } else {
    console.log('🔌 socket.js: No hay socket para desconectar');
  }
}

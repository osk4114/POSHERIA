// frontend/src/socket.js
import { io } from 'socket.io-client';

let socket = null;

export function connectSocket(userId) {
  console.log('🔌 [FRONTEND] socket.js: connectSocket() llamado para userId:', userId);
  if (!socket) {
    console.log('🔌 [FRONTEND] socket.js: Creando nueva conexión socket...');
    socket = io('http://localhost:3000', {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    
    socket.on('connect', () => {
      console.log('✅ [FRONTEND] socket.js: Socket conectado exitosamente, ID:', socket.id);
    });
    
    socket.on('connect_error', (error) => {
      console.error('❌ [FRONTEND] socket.js: Error de conexión socket:', error);
    });
    
    socket.on('disconnect', (reason) => {
      console.log('🔌 [FRONTEND] socket.js: Socket desconectado:', reason);
    });
  } else {
    console.log('🔌 [FRONTEND] socket.js: Reutilizando conexión socket existente');
  }
  console.log('📡 [FRONTEND] socket.js: Registrando sesión para usuario:', userId);
  socket.emit('register-session', { userId });
  return socket;
}

export function getSocket() {
  return socket;
}

export function onForceLogout(callback) {
  console.log('⚠️ socket.js: Configurando listener para force-logout');
  if (!socket) return;
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
    console.log('✅ socket.js: Socket desconectado y variable limpiada');
  } else {
    console.log('🔌 socket.js: No hay socket para desconectar');
  }
}

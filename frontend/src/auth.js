// auth.js - Clean version

// Utilidades para manejo de sesión y roles
import { disconnectSocket } from './socket';

export function setSession(token, user) {
  console.log('🔐 [FRONTEND] Guardando sesión en localStorage');
  console.log('👤 [FRONTEND] Usuario:', user);
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  console.log('✅ [FRONTEND] Sesión guardada exitosamente');
}

export function getToken() {
  return localStorage.getItem('token');
}

export function getUser() {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

export function logout(onLogout) {
  console.log('🚨 [FRONTEND] LOGOUT INICIADO - Cerrando sesión...');
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  console.log('🗑️ [FRONTEND] Datos de sesión eliminados de localStorage');
  disconnectSocket();
  console.log('🔌 [FRONTEND] Socket desconectado');
  if (typeof onLogout === 'function') {
    console.log('🔄 [FRONTEND] Ejecutando callback de logout');
    onLogout();
  }
  console.log('✅ [FRONTEND] LOGOUT COMPLETADO');
}

export function isAuthenticated() {
  const hasToken = !!getToken();
  console.log('🔐 [FRONTEND] isAuthenticated() =', hasToken);
  return hasToken;
}

export function hasRole(role) {
  const user = getUser();
  return user && user.role === role;
}
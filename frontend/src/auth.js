// auth.js
// Utilidades para manejo de sesión y roles
import { disconnectSocket } from './socket';

export function setSession(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

export function getToken() {
  return localStorage.getItem('token');
}

export function getUser() {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

export function logout(onLogout) {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  disconnectSocket();
  if (typeof onLogout === 'function') onLogout();
}

export function isAuthenticated() {
  return !!getToken();
}

export function hasRole(role) {
  const user = getUser();
  return user && user.role === role;
}

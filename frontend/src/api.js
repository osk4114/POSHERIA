import axios from 'axios';
import { logout } from './auth';

// Crea una instancia de axios que agrega el token automáticamente si existe
const api = axios.create();

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de respuesta para forzar logout si el token es inválido
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      logout();
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default api;

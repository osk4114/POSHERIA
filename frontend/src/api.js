import axios from 'axios';
import { logout } from './auth';

// Crea una instancia de axios que agrega el token automáticamente si existe
const api = axios.create({
  baseURL: 'http://localhost:3000' // URL del backend
});

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
  (response) => {
    // Solo logear errores, no todas las respuestas exitosas para evitar spam
    return response;
  },
  (error) => {
    console.log('❌ api.js: Error en respuesta:', error.response?.status, error.response?.statusText);
    console.log('💬 api.js: URL que falló:', error.config?.url);
    if (error.response && error.response.status === 401) {
      console.log('🚑 api.js: Token inválido (401), forzando logout...');
      logout();
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default api;

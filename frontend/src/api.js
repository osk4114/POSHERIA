import axios from 'axios';
import { logout } from './auth';

// Crea una instancia de axios que agrega el token automáticamente si existe
const api = axios.create({
  baseURL: 'http://172.80.15.89:3000' // URL del backend
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

// ===== FUNCIONES PARA AÑADIDOS (ADD-ONS) =====

// Crear un añadido (pedido extra) para una mesa existente
export const createAddOn = async (tableId, parentOrderId, products) => {
  try {
    const requestData = {
      table: tableId,
      products: products
    };
    
    console.log('📦 [FRONTEND] Creando añadido para mesa:', tableId);
    console.log('📦 [FRONTEND] Productos:', products);
    
    const response = await api.post('/api/orders/addon', requestData);
    return response.data;
  } catch (error) {
    console.error('Error creando añadido:', error);
    throw error;
  }
};

// Listar añadidos por mesa o pedido principal
export const listAddOns = async (tableId = null, parentOrderId = null) => {
  try {
    const params = {};
    if (tableId) params.table = tableId;
    if (parentOrderId) params.parentOrderId = parentOrderId;
    
    const response = await api.get('/api/orders/addon', { params });
    return response.data;
  } catch (error) {
    console.error('Error obteniendo añadidos:', error);
    throw error;
  }
};

export default api;
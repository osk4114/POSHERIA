// hooks/useApiCache.js
import { useState, useEffect, useRef } from 'react';

const cache = new Map();
const pendingRequests = new Map();

export const useApiCache = (key, apiCall, dependencies = [], options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);
  
  const {
    ttl = 300000, // 5 minutos por defecto
    refetchOnMount = true,
    refetchOnWindowFocus = false
  } = options;

  const fetchData = async (force = false) => {
    // Verificar caché
    const cached = cache.get(key);
    if (!force && cached && Date.now() - cached.timestamp < ttl) {
      setData(cached.data);
      setLoading(false);
      return cached.data;
    }

    // Verificar si ya hay una petición pendiente
    if (pendingRequests.has(key)) {
      const result = await pendingRequests.get(key);
      setData(result);
      setLoading(false);
      return result;
    }

    setLoading(true);
    setError(null);

    // Cancelar petición anterior si existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      const requestPromise = apiCall(abortControllerRef.current.signal);
      pendingRequests.set(key, requestPromise);

      const result = await requestPromise;
      
      // Guardar en caché
      cache.set(key, {
        data: result,
        timestamp: Date.now()
      });

      setData(result);
      return result;
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err);
        console.error('API Error:', err);
      }
      throw err;
    } finally {
      setLoading(false);
      pendingRequests.delete(key);
    }
  };

  useEffect(() => {
    if (refetchOnMount) {
      fetchData();
    }

    // Cleanup al desmontar
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, dependencies);

  useEffect(() => {
    if (refetchOnWindowFocus) {
      const handleFocus = () => {
        fetchData();
      };

      window.addEventListener('focus', handleFocus);
      return () => window.removeEventListener('focus', handleFocus);
    }
  }, [refetchOnWindowFocus]);

  const refetch = () => fetchData(true);
  const invalidate = () => cache.delete(key);

  return {
    data,
    loading,
    error,
    refetch,
    invalidate
  };
};

// Utilidad para limpiar caché
export const clearApiCache = () => {
  cache.clear();
};

// Utilidad para invalidar caché por patrón
export const invalidateApiCache = (pattern) => {
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
};
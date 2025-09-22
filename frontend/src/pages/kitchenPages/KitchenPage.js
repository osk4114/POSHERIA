import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../api';
import { getUser, logout } from '../../auth';
import { connectSocket, onForceLogout } from '../../socket';
import './KitchenPage.css';

const KitchenPage = () => {
  const user = getUser();
  const [socketError, setSocketError] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [statusMsg, setStatusMsg] = useState(null);
  const [error, setError] = useState(null);
  const [mesas, setMesas] = useState([]);
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [estadisticas, setEstadisticas] = useState({});
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroPrioridad, setFiltroPrioridad] = useState('todos');
  const [ordenamiento, setOrdenamiento] = useState('tiempo');
  const [notasModal, setNotasModal] = useState({ show: false, pedidoId: null, notas: '' });

  // Referencias para throttling
  const lastFetchTime = useRef({
    pedidos: 0,
    estadisticas: 0,
    mesas: 0
  });
  const THROTTLE_DELAY = 1000; // 1 segundo de delay mínimo entre llamadas

  // Función para reproducir sonido de notificación
  const playNotificationSound = () => {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQgB...'); // Beep sound in base64
      audio.play().catch(e => console.log('No se pudo reproducir el sonido:', e));
    } catch (e) {
      console.log('Audio no disponible');
    }
  };

  // Obtener pedidos activos con información enriquecida - CON THROTTLING
  const fetchPedidos = useCallback(async () => {
    const now = Date.now();
    if (now - lastFetchTime.current.pedidos < THROTTLE_DELAY) {
      console.log('🚫 fetchPedidos throttled - demasiado rápido');
      return;
    }
    lastFetchTime.current.pedidos = now;

    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/kitchen/orders');
      
      // Validar que la respuesta sea un array
      const pedidosData = Array.isArray(response.data) ? response.data : [];
      
      // Validar estructura de cada pedido
      const pedidosValidados = pedidosData.map(pedido => ({
        ...pedido,
        items: Array.isArray(pedido.items) ? pedido.items : [],
        total: typeof pedido.total === 'number' ? pedido.total : 0,
        prioridad: pedido.prioridad || 'normal',
        createdAt: pedido.createdAt || new Date().toISOString()
      }));
      
      setPedidos(pedidosValidados);
    } catch (err) {
      console.error('[KitchenPage] Error fetching orders:', err);
      const errorMsg = err.response?.data?.message || 'Error al cargar pedidos';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Obtener estadísticas - CON THROTTLING
  const fetchEstadisticas = useCallback(async () => {
    const now = Date.now();
    if (now - lastFetchTime.current.estadisticas < THROTTLE_DELAY) {
      console.log('🚫 fetchEstadisticas throttled - demasiado rápido');
      return;
    }
    lastFetchTime.current.estadisticas = now;

    try {
      const response = await api.get('/api/kitchen/stats');
      setEstadisticas(response.data || {});
    } catch (err) {
      console.error('[KitchenPage] Error fetching stats:', err);
    }
  }, []);

  // Obtener mesas - CON THROTTLING
  const fetchMesas = useCallback(async () => {
    const now = Date.now();
    if (now - lastFetchTime.current.mesas < THROTTLE_DELAY) {
      console.log('🚫 fetchMesas throttled - demasiado rápido');
      return;
    }
    lastFetchTime.current.mesas = now;

    try {
      const response = await api.get('/api/tables');
      setMesas(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('[KitchenPage] Error fetching tables:', err);
      setMesas([]);
    }
  }, []);

  // Función para obtener pedidos filtrados y ordenados
  const getPedidosFiltrados = () => {
    if (!Array.isArray(pedidos)) {
      return [];
    }
    
    let pedidosFiltrados = [...pedidos];
    
    // Filtrar por estado
    if (filtroEstado !== 'todos') {
      pedidosFiltrados = pedidosFiltrados.filter(p => p.status === filtroEstado);
    }
    
    // Filtrar por prioridad
    if (filtroPrioridad !== 'todos') {
      pedidosFiltrados = pedidosFiltrados.filter(p => {
        const timeElapsedMinutes = Math.floor((new Date() - new Date(p.createdAt)) / (1000 * 60));
        
        if (filtroPrioridad === 'alta') return timeElapsedMinutes > 45;
        if (filtroPrioridad === 'media') return timeElapsedMinutes >= 25 && timeElapsedMinutes <= 45;
        if (filtroPrioridad === 'normal') return timeElapsedMinutes < 25;
        
        return true;
      });
    }
    
    // Ordenar
    pedidosFiltrados.sort((a, b) => {
      if (ordenamiento === 'tiempo') {
        return new Date(a.createdAt) - new Date(b.createdAt);
      } else if (ordenamiento === 'prioridad') {
        const getPriorityScore = (pedido) => {
          const timeElapsed = Math.floor((new Date() - new Date(pedido.createdAt)) / (1000 * 60));
          if (timeElapsed > 45) return 3; // Alta
          if (timeElapsed >= 25) return 2; // Media
          return 1; // Normal
        };
        return getPriorityScore(b) - getPriorityScore(a);
      } else if (ordenamiento === 'mesa') {
        const getMesaNumber = (pedido) => {
          const mesa = mesas.find(m => m._id === pedido.tableId);
          return mesa ? mesa.number : 999;
        };
        return getMesaNumber(a) - getMesaNumber(b);
      }
      return 0;
    });
    
    return pedidosFiltrados;
  };

  // Función para cambiar estado de pedido
  const cambiarEstado = async (pedidoId, nuevoEstado, notas = '') => {
    if (!pedidoId || !nuevoEstado) {
      setStatusMsg('❌ Datos inválidos para cambiar estado');
      setTimeout(() => setStatusMsg(null), 3000);
      return;
    }

    try {
      setStatusMsg('🔄 Actualizando estado...');

      const updateData = { status: nuevoEstado };
      if (notas.trim()) {
        updateData.notes = notas.trim();
      }

      await api.patch(`/api/orders/${pedidoId}/status`, updateData);
      
      setStatusMsg(`✅ Estado actualizado a: ${getStatusLabel(nuevoEstado)}`);
      setTimeout(() => setStatusMsg(null), 5000);

      // Reproducir sonido de confirmación
      playNotificationSound();

      // Actualizar datos
      fetchPedidos();
      fetchEstadisticas();
      
      // Cerrar modal de notas si estaba abierto
      setNotasModal({ show: false, pedidoId: null, notas: '' });
      
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Error al actualizar pedido';
      setStatusMsg(`❌ ${errorMsg}`);
      setTimeout(() => setStatusMsg(null), 5000);
      console.error('Error updating order:', err);
    }
  };

  // Obtener etiqueta legible para estado
  const getStatusLabel = (status) => {
    const labels = {
      'pending': 'Pendiente',
      'preparing': 'Preparando',
      'ready': 'Listo',
      'delivered': 'Entregado',
      'cancelled': 'Cancelado'
    };
    return labels[status] || status;
  };

  // Obtener información de mesa
  const getMesaInfo = (mesaId) => {
    const mesa = mesas.find(m => m._id === mesaId);
    return mesa ? `Mesa ${mesa.number}` : 'Para llevar';
  };

  // Formatear tiempo desde creación
  const getTimeElapsed = (createdAt) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMinutes = Math.floor((now - created) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Recién creado';
    if (diffMinutes === 1) return '1 min';
    if (diffMinutes < 60) return `${diffMinutes} min`;
    
    const hours = Math.floor(diffMinutes / 60);
    const remainingMinutes = diffMinutes % 60;
    
    if (hours === 1) return remainingMinutes > 0 ? `1h ${remainingMinutes}min` : '1h';
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
  };

  // Obtener clase de prioridad basada en tiempo y estado
  const getPriorityClass = (pedido) => {
    const timeElapsedMinutes = Math.floor((new Date() - new Date(pedido.createdAt)) / (1000 * 60));
    
    if (pedido.status === 'ready' || pedido.status === 'delivered') {
      return 'completed';
    }
    
    if (timeElapsedMinutes > 45) return 'urgent';
    if (timeElapsedMinutes >= 25) return 'medium';
    return 'normal';
  };

  // Obtener tiempo con indicador de estado
  const getTimeElapsedWithStatus = (createdAt) => {
    const timeElapsed = getTimeElapsed(createdAt);
    const timeElapsedMinutes = Math.floor((new Date() - new Date(createdAt)) / (1000 * 60));
    
    if (timeElapsedMinutes > 45) return `🔴 ${timeElapsed}`;
    if (timeElapsedMinutes >= 25) return `🟡 ${timeElapsed}`;
    return `🟢 ${timeElapsed}`;
  };

  // Configuración de Socket.IO - OPTIMIZADO
  useEffect(() => {
    let socketInstance = null;
    
    const initializeSocket = async () => {
      try {
        if (!user?.token) {
          console.log('[KitchenPage] No token available, skipping socket connection');
          return;
        }

        // Evitar múltiples conexiones
        if (socket) {
          console.log('[KitchenPage] Socket ya existe, omitiendo conexión duplicada');
          return;
        }

        socketInstance = await connectSocket();
        setSocket(socketInstance);
        setSocketError(null);

        // Configurar eventos específicos para cocina - CON THROTTLING
        socketInstance.on('newOrder', (orderData) => {
          console.log('[KitchenPage] Nueva orden recibida:', orderData);
          setStatusMsg('🔔 Nueva orden recibida');
          setTimeout(() => setStatusMsg(null), 3000);
          playNotificationSound();
          // Throttling se maneja en las funciones fetch
          fetchPedidos();
          fetchEstadisticas();
        });

        socketInstance.on('orderStatusChanged', (data) => {
          console.log('[KitchenPage] Estado de orden cambió:', data);
          // Throttling se maneja en las funciones fetch
          fetchPedidos();
          fetchEstadisticas();
        });

        socketInstance.on('tablesUpdated', () => {
          console.log('[KitchenPage] Mesas actualizadas');
          // Throttling se maneja en las funciones fetch
          fetchMesas();
        });

        // Manejo de errores de conexión
        socketInstance.on('connect_error', (error) => {
          console.error('[KitchenPage] Socket connection error:', error);
          setSocketError('Error de conexión. Los datos pueden no estar actualizados.');
        });

        socketInstance.on('disconnect', (reason) => {
          console.log('[KitchenPage] Socket disconnected:', reason);
          if (reason === 'io server disconnect') {
            setSocketError('Desconectado del servidor. Reconectando...');
          }
        });

        socketInstance.on('reconnect', () => {
          console.log('[KitchenPage] Socket reconnected');
          setSocketError(null);
          fetchPedidos();
          fetchEstadisticas();
        });

      } catch (error) {
        console.error('[KitchenPage] Socket setup error:', error);
        setSocketError('No se pudo conectar al servidor en tiempo real');
      }
    };

    initializeSocket();

    // Configurar logout forzado
    const unsubscribeForceLogout = onForceLogout(() => {
      logout(() => window.location.reload());
    });

    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
      unsubscribeForceLogout();
    };
  }, [user?.token]);

  // Cargar datos iniciales - SIMPLIFICADO
  useEffect(() => {
    const shouldFetch = user && (user.role === 'cocina' || user.role === 'admin');
    
    if (shouldFetch) {
      console.log('[KitchenPage] Cargando datos iniciales para:', user.role);
      fetchPedidos();
      fetchEstadisticas();
      fetchMesas();
    }
  }, [user?.id, user?.role]); // Solo user ID y role como dependencias

  // Verificar acceso - Permitir administradores y personal de cocina
  if (!user || (user.role !== 'cocina' && user.role !== 'admin')) {
    return (
      <div className="kitchen-access-denied">
        <div className="access-denied-content">
          <h2>🚫 Acceso Denegado</h2>
          <p>Solo el personal de cocina y administradores pueden acceder a esta página</p>
          <p>Usuario actual: {user?.name || 'No identificado'}</p>
          <p>Rol actual: {user?.role || 'Sin rol'}</p>
          <button onClick={() => logout(() => window.location.reload())}>
            Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="kitchen-dashboard">
      {/* Header principal con título y usuario */}
      <div className="kitchen-main-header">
        <div className="header-title">
          <h1>🍗 Dashboard de Cocina</h1>
          <div className="header-subtitle">Panel de gestión para cocina - Tiempo real</div>
        </div>
        <div className="user-info">
          <span className="user-role">👤 {user.name}</span>
          <button onClick={() => logout(() => window.location.reload())} className="btn-logout">
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Contenedor principal dividido en dos columnas */}
      <div className="kitchen-dashboard-container">
        {/* Panel de estadísticas principal */}
        <div className="stats-dashboard">
          <h2 className="stats-title">📊 Estadísticas en Tiempo Real</h2>
          <div className="stats-grid">
            <div className="stat-card pending">
              <div className="stat-icon">⏳</div>
              <div className="stat-content">
                <span className="stat-number">{estadisticas.pending || 0}</span>
                <span className="stat-label">Pendientes</span>
              </div>
            </div>
            <div className="stat-card preparing">
              <div className="stat-icon">👨‍🍳</div>
              <div className="stat-content">
                <span className="stat-number">{estadisticas.preparing || 0}</span>
                <span className="stat-label">Preparando</span>
              </div>
            </div>
            <div className="stat-card ready">
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <span className="stat-number">{estadisticas.ready || 0}</span>
                <span className="stat-label">Listos</span>
              </div>
            </div>
            <div className="stat-card delivered">
              <div className="stat-icon">🚚</div>
              <div className="stat-content">
                <span className="stat-number">{estadisticas.delivered || 0}</span>
                <span className="stat-label">Entregados</span>
              </div>
            </div>
          </div>
        </div>

        {/* Panel de filtros separado */}
        <div className="filters-dashboard">
          <h3>🔍 Filtros y Ordenamiento</h3>
          <div className="filters-content">
            <div className="filter-row">
              <div className="filter-group">
                <label>📋 Estado:</label>
                <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                  <option value="todos">🔍 Todos ({pedidos.length})</option>
                  <option value="pending">⏳ Pendientes ({pedidos.filter(p => p.status === 'pending').length})</option>
                  <option value="preparing">👨‍🍳 Preparando ({pedidos.filter(p => p.status === 'preparing').length})</option>
                  <option value="ready">✅ Listos ({pedidos.filter(p => p.status === 'ready').length})</option>
                </select>
              </div>

              <div className="filter-group">
                <label>🚨 Prioridad:</label>
                <select value={filtroPrioridad} onChange={(e) => setFiltroPrioridad(e.target.value)}>
                  <option value="todos">🔍 Todas</option>
                  <option value="alta">🔴 Alta (&gt;45min)</option>
                  <option value="media">🟡 Media (25-45min)</option>
                  <option value="normal">🟢 Normal (&lt;25min)</option>
                </select>
              </div>

              <div className="filter-group">
                <label>📊 Ordenar por:</label>
                <select value={ordenamiento} onChange={(e) => setOrdenamiento(e.target.value)}>
                  <option value="tiempo">⏰ Tiempo de creación</option>
                  <option value="prioridad">🚨 Prioridad</option>
                  <option value="mesa">🪑 Mesa</option>
                </select>
              </div>
            </div>

            <div className="filter-actions">
              <button 
                onClick={() => {
                  fetchPedidos();
                  fetchEstadisticas();
                }}
                className="btn-refresh"
                disabled={loading}
                title="Actualizar datos"
              >
                {loading ? '🔄' : '🔄'} Actualizar
              </button>
              
              <button 
                onClick={() => {
                  setFiltroEstado('todos');
                  setFiltroPrioridad('todos');
                }} 
                className="btn-reset"
                title="Resetear filtros"
              >
                🗑️ Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notificaciones y errores */}
      {socketError && (
        <div className="notification error">
          ⚠️ {socketError}
        </div>
      )}

      {statusMsg && (
        <div className="notification success">
          {statusMsg}
        </div>
      )}

      {error && (
        <div className="notification error">
          ❌ {error}
        </div>
      )}

      {/* Panel de alertas urgentes */}
      {pedidos.filter(p => {
        const timeElapsed = Math.floor((new Date() - new Date(p.createdAt)) / (1000 * 60));
        return timeElapsed > 45 && p.status !== 'ready' && p.status !== 'delivered';
      }).length > 0 && (
        <div className="urgent-alerts-panel">
          <div className="urgent-header">
            <h3>🚨 ¡PEDIDOS URGENTES!</h3>
            <span className="urgent-count">
              {pedidos.filter(p => {
                const timeElapsed = Math.floor((new Date() - new Date(p.createdAt)) / (1000 * 60));
                return timeElapsed > 45 && p.status !== 'ready' && p.status !== 'delivered';
              }).length} pedido(s)
            </span>
          </div>
          <div className="urgent-list">
            {pedidos.filter(p => {
              const timeElapsed = Math.floor((new Date() - new Date(p.createdAt)) / (1000 * 60));
              return timeElapsed > 45 && p.status !== 'ready' && p.status !== 'delivered';
            }).map(pedido => (
              <div key={pedido._id} className="urgent-item">
                <span>#{pedido._id.slice(-4)}</span>
                <span>{getMesaInfo(pedido.tableId)}</span>
                <span>{getTimeElapsedWithStatus(pedido.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <div className="kitchen-content">
        {loading && pedidos.length === 0 ? (
          <div className="loading">
            <div className="loading-spinner"></div>
            <p>Cargando pedidos...</p>
          </div>
        ) : (
          <>
            {getPedidosFiltrados().length === 0 ? (
              <div className="no-orders">
                <div className="no-orders-icon">🍽️</div>
                {pedidos.length === 0 ? (
                  <>
                    <h3>🎉 ¡Excelente! No hay pedidos pendientes</h3>
                    <p>La cocina está al día. Los nuevos pedidos aparecerán aquí automáticamente</p>
                    <div className="stats-summary">
                      <span>📊 Total de pedidos hoy: {estadisticas.pedidosHoy || 0}</span>
                      <span>💰 Ventas del día: S/ {(estadisticas.ventasHoy || 0).toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <h3>🔍 No hay pedidos con los filtros seleccionados</h3>
                    <p>Prueba cambiando los filtros o actualiza la página</p>
                    <div className="filter-suggestion">
                      <button onClick={() => {
                        setFiltroEstado('todos');
                        setFiltroPrioridad('todos');
                      }} className="btn-reset-filters">
                        🔄 Resetear Filtros
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="orders-grid">
                {getPedidosFiltrados().map(pedido => (
                  <div key={pedido._id} className={`order-card ${getPriorityClass(pedido)} ${pedido.status}`}>
                    <div className="order-header">
                      <div className="order-id">
                        <span className="order-number">#{pedido._id.slice(-4)}</span>
                        <span className="order-mesa">{getMesaInfo(pedido.tableId)}</span>
                      </div>
                      <div className="order-time">
                        <span className="time-elapsed">{getTimeElapsedWithStatus(pedido.createdAt)}</span>
                        <span className="order-status status-badge">{getStatusLabel(pedido.status)}</span>
                      </div>
                    </div>

                    <div className="order-items">
                      {Array.isArray(pedido.items) && pedido.items.map((item, index) => (
                        <div key={index} className="order-item">
                          <span className="item-quantity">{item.quantity}x</span>
                          <span className="item-name">{item.name || 'Producto sin nombre'}</span>
                          {item.notes && (
                            <span className="item-notes">💬 {item.notes}</span>
                          )}
                        </div>
                      ))}
                    </div>

                    {pedido.notes && (
                      <div className="order-notes">
                        <strong>📝 Notas:</strong> {pedido.notes}
                      </div>
                    )}

                    <div className="order-total">
                      <span className="total-label">Total:</span>
                      <span className="total-amount">S/ {(pedido.total || 0).toFixed(2)}</span>
                    </div>

                    <div className="order-actions">
                      {pedido.status === 'pending' && (
                        <button 
                          onClick={() => setNotasModal({ show: true, pedidoId: pedido._id, notas: '' })}
                          className="btn-action btn-preparing"
                        >
                          👨‍🍳 Iniciar Preparación
                        </button>
                      )}
                      
                      {pedido.status === 'preparing' && (
                        <button 
                          onClick={() => cambiarEstado(pedido._id, 'ready')}
                          className="btn-action btn-ready"
                        >
                          ✅ Marcar como Listo
                        </button>
                      )}
                      
                      {pedido.status === 'ready' && (
                        <button 
                          onClick={() => cambiarEstado(pedido._id, 'delivered')}
                          className="btn-action btn-delivered"
                        >
                          🚚 Entregado
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal para notas */}
      {notasModal.show && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Agregar Notas al Pedido</h3>
            <textarea
              value={notasModal.notas}
              onChange={(e) => setNotasModal({ ...notasModal, notas: e.target.value })}
              placeholder="Escribir notas especiales para este pedido..."
              rows="4"
            />
            <div className="modal-actions">
              <button 
                onClick={() => {
                  cambiarEstado(notasModal.pedidoId, 'preparing', notasModal.notas);
                  fetchPedidos();
                  fetchEstadisticas();
                }}
                className="btn-confirm"
              >
                💾 Guardar y Continuar
              </button>
              <button 
                onClick={() => setNotasModal({ show: false, pedidoId: null, notas: '' })}
                className="btn-cancel"
              >
                ❌ Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KitchenPage;
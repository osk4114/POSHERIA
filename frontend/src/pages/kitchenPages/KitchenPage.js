import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api';
import { getUser, logout } from '../../auth';
import { connectSocket, onForceLogout } from '../../socket';
import './KitchenPage.css';

const KitchenPage = () => {
  const user = getUser();
  const [pedidos, setPedidos] = useState([]);
  const [statusMsg, setStatusMsg] = useState(null);
  const [error, setError] = useState(null);
  const [mesas, setMesas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [estadisticas, setEstadisticas] = useState({});

  // Obtener pedidos activos
  const fetchPedidos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/orders');
      const data = Array.isArray(response.data) ? response.data : [];
      
      // Filtrar solo pedidos activos (no delivered/cancelled)
      const pedidosActivos = data.filter(p => 
        ['pending', 'preparing', 'ready'].includes(p.status)
      );
      
      setPedidos(pedidosActivos);
      console.log('✅ Pedidos cargados:', pedidosActivos.length);
    } catch (err) {
      console.error('❌ Error al cargar pedidos:', err);
      setError('Error al cargar los pedidos');
    } finally {
      setLoading(false);
    }
  }, []);

  // Obtener estadísticas
  const fetchEstadisticas = useCallback(async () => {
    try {
      const response = await api.get('/api/orders/stats');
      setEstadisticas(response.data || {});
    } catch (err) {
      console.error('Error al cargar estadísticas:', err);
    }
  }, []);

  // Obtener mesas
  const fetchMesas = useCallback(async () => {
    try {
      const response = await api.get('/api/tables');
      setMesas(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Error al cargar mesas:', err);
    }
  }, []);

  // Cambiar estado de pedido
  const cambiarEstado = async (pedidoId, nuevoEstado) => {
    if (!pedidoId || !nuevoEstado) {
      setStatusMsg('❌ Datos inválidos para cambiar estado');
      setTimeout(() => setStatusMsg(null), 3000);
      return;
    }

    try {
      setStatusMsg('🔄 Actualizando estado...');
      
      await api.patch(`/api/orders/${pedidoId}/status`, { status: nuevoEstado });
      
      setStatusMsg(`✅ Estado actualizado a: ${getStatusLabel(nuevoEstado)}`);
      setTimeout(() => setStatusMsg(null), 3000);
      
      // Actualizar datos
      fetchPedidos();
      fetchEstadisticas();
      
    } catch (err) {
      console.error('Error al cambiar estado:', err);
      const errorMsg = err.response?.data?.message || 'Error al actualizar estado';
      setStatusMsg(`❌ ${errorMsg}`);
      setTimeout(() => setStatusMsg(null), 5000);
    }
  };

  // Obtener etiqueta legible para estado
  const getStatusLabel = (status) => {
    const labels = {
      'pending': 'Pendiente',
      'preparing': 'Preparando',
      'ready': 'Listo'
    };
    return labels[status] || status;
  };

  // Obtener información de mesa
  const getMesaInfo = (mesaId) => {
    const mesa = mesas.find(m => m._id === mesaId);
    return mesa ? `Mesa ${mesa.number}` : 'Para llevar';
  };

  // Formatear tiempo transcurrido
  const getTimeElapsed = (createdAt) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMs = now - created;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Recién creado';
    if (diffMins < 60) return `${diffMins} min`;
    
    const diffHours = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;
    return `${diffHours}h ${remainingMins}m`;
  };

  // Configurar socket para tiempo real
  useEffect(() => {
    let socket = null;
    let forceLogoutCleanup = null;
    
    if (user && user._id) {
      console.log('🔌 KitchenPage: Iniciando conexión socket - Usuario:', user._id, 'Rol:', user.role);
      
      try {
        socket = connectSocket(user._id);
        
        socket.on('newOrder', (data) => {
          console.log('🔔 Nueva orden recibida:', data);
          setStatusMsg('🔔 Nueva orden recibida');
          setTimeout(() => setStatusMsg(null), 3000);
          fetchPedidos();
          fetchEstadisticas();
        });

        socket.on('orderUpdated', (data) => {
          console.log('📝 Orden actualizada:', data);
          fetchPedidos();
          fetchEstadisticas();
        });

        // SOLO configurar force-logout para usuarios de cocina, no para admin
        if (user.role === 'cocina') {
          console.log('🔒 KitchenPage: Configurando force-logout para usuario de cocina');
          onForceLogout(() => {
            console.log('⚠️ KitchenPage: Force logout ejecutado para usuario cocina');
            logout(() => window.location.reload());
          });
        } else {
          console.log('👑 KitchenPage: Usuario admin - Saltando configuración de force-logout');
        }
        
      } catch (error) {
        console.error('❌ KitchenPage: Error al configurar socket:', error);
      }
    }

    return () => {
      if (socket) {
        console.log('🧹 KitchenPage: Limpiando listeners de socket');
        socket.off('newOrder');
        socket.off('orderUpdated');
        // Solo limpiar force-logout si se configuró
        if (user?.role === 'cocina') {
          socket.off('force-logout');
        }
        
        // Solo desconectar si es usuario de cocina; admin puede tener socket compartido
        if (user?.role === 'cocina') {
          console.log('🔌 KitchenPage: Desconectando socket (usuario cocina)');
          socket.disconnect();
        } else {
          console.log('👑 KitchenPage: Manteniendo socket activo (usuario admin)');
        }
      }
    };
  }, [user?._id, user?.role]); // Importante: incluir role en dependencias

  // Cargar datos iniciales
  useEffect(() => {
    if (user && (user.role === 'cocina' || user.role === 'admin')) {
      console.log('📊 KitchenPage: Cargando datos iniciales para:', user.role);
      fetchPedidos();
      fetchEstadisticas();
      fetchMesas();
      
      // Actualizar cada 30 segundos
      const interval = setInterval(() => {
        fetchPedidos();
        fetchEstadisticas();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [user?.role]); // Solo depender del rol del usuario

  // Verificar acceso
  if (!user) {
    console.log('⚠️ KitchenPage: No hay usuario logueado');
    return (
      <div className="kitchen-access-denied">
        <div className="access-denied-content">
          <h2>🚫 Acceso Denegado</h2>
          <p>No hay usuario logueado</p>
          <button onClick={() => logout(() => window.location.reload())}>
            Ir al Login
          </button>
        </div>
      </div>
    );
  }

  if (user.role !== 'cocina' && user.role !== 'admin') {
    console.log('⚠️ KitchenPage: Usuario sin permisos:', user.role);
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

  console.log('✅ KitchenPage: Usuario autorizado:', user.name, 'Rol:', user.role);

  return (
    <div className="kitchen-dashboard">
      {/* Header principal */}
      <div className="kitchen-main-header">
        <div className="header-title">
          <h1>🍗 Dashboard de Cocina</h1>
          <div className="header-subtitle">Gestión de pedidos en tiempo real</div>
        </div>
        <div className="user-info">
          <span className="user-role">👤 {user.name}</span>
          <button onClick={() => logout(() => window.location.reload())} className="btn-logout">
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Mensaje de estado */}
      {statusMsg && (
        <div className="status-message">
          {statusMsg}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => { setError(null); fetchPedidos(); }}>
            Reintentar
          </button>
        </div>
      )}

      {/* Panel de estadísticas compacto */}
      <div className="kitchen-stats-bar">
        <div className="stat-item pending">
          <span className="stat-icon">⏳</span>
          <div>
            <span className="stat-number">{estadisticas.pending || 0}</span>
            <span className="stat-label">Entrantes</span>
          </div>
        </div>
        <div className="stat-item preparing">
          <span className="stat-icon">👨‍🍳</span>
          <div>
            <span className="stat-number">{estadisticas.preparing || 0}</span>
            <span className="stat-label">Preparando</span>
          </div>
        </div>
        <div className="stat-item ready">
          <span className="stat-icon">✅</span>
          <div>
            <span className="stat-number">{estadisticas.ready || 0}</span>
            <span className="stat-label">Listos</span>
          </div>
        </div>
      </div>

      {/* Layout de 3 columnas para pedidos */}
      <div className="kitchen-columns">
        {/* Columna 1: Pedidos Entrantes */}
        <div className="kitchen-column pending-column">
          <div className="column-header">
            <h3>⏳ Pedidos Entrantes</h3>
            <span className="column-count">{pedidos.filter(p => p.status === 'pending').length}</span>
          </div>
          <div className="column-content">
            {pedidos.filter(p => p.status === 'pending').map(pedido => (
              <div key={pedido._id} className={`order-card ${pedido.type === 'add-on' ? 'addon-card' : ''}`}>
                <div className="order-header">
                  <div className="order-id">
                    <span className="order-number">#{pedido._id.slice(-4)}</span>
                    {pedido.type === 'add-on' && <span className="addon-badge">➕ AÑADIDO</span>}
                  </div>
                  <div className="order-info">
                    <span className="order-mesa">{getMesaInfo(pedido.tableId)}</span>
                    <span className="time-elapsed">{getTimeElapsed(pedido.createdAt)}</span>
                  </div>
                </div>

                <div className="order-items">
                  {Array.isArray(pedido.items) && pedido.items.map((item, index) => (
                    <div key={index} className="order-item">
                      <span className="item-quantity">{item.quantity}x</span>
                      <span className="item-name">{item.name || 'Producto sin nombre'}</span>
                    </div>
                  ))}
                </div>

                <div className="order-actions">
                  <button 
                    onClick={() => cambiarEstado(pedido._id, 'preparing')}
                    className="btn-action btn-start"
                    disabled={loading}
                  >
                    👨‍🍳 Iniciar Preparación
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Columna 2: Preparando */}
        <div className="kitchen-column preparing-column">
          <div className="column-header">
            <h3>👨‍🍳 Preparando</h3>
            <span className="column-count">{pedidos.filter(p => p.status === 'preparing').length}</span>
          </div>
          <div className="column-content">
            {pedidos.filter(p => p.status === 'preparing').map(pedido => (
              <div key={pedido._id} className={`order-card ${pedido.type === 'add-on' ? 'addon-card' : ''}`}>
                <div className="order-header">
                  <div className="order-id">
                    <span className="order-number">#{pedido._id.slice(-4)}</span>
                    {pedido.type === 'add-on' && <span className="addon-badge">➕ AÑADIDO</span>}
                  </div>
                  <div className="order-info">
                    <span className="order-mesa">{getMesaInfo(pedido.tableId)}</span>
                    <span className="time-elapsed">{getTimeElapsed(pedido.createdAt)}</span>
                  </div>
                </div>

                <div className="order-items">
                  {Array.isArray(pedido.items) && pedido.items.map((item, index) => (
                    <div key={index} className="order-item">
                      <span className="item-quantity">{item.quantity}x</span>
                      <span className="item-name">{item.name || 'Producto sin nombre'}</span>
                    </div>
                  ))}
                </div>

                <div className="order-actions">
                  <button 
                    onClick={() => cambiarEstado(pedido._id, 'ready')}
                    className="btn-action btn-ready"
                    disabled={loading}
                  >
                    ✅ Marcar Listo
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Columna 3: Listos */}
        <div className="kitchen-column ready-column">
          <div className="column-header">
            <h3>✅ Pedidos Listos</h3>
            <span className="column-count">{pedidos.filter(p => p.status === 'ready').length}</span>
          </div>
          <div className="column-content">
            {pedidos.filter(p => p.status === 'ready').map(pedido => (
              <div key={pedido._id} className={`order-card ${pedido.type === 'add-on' ? 'addon-card' : ''}`}>
                <div className="order-header">
                  <div className="order-id">
                    <span className="order-number">#{pedido._id.slice(-4)}</span>
                    {pedido.type === 'add-on' && <span className="addon-badge">➕ AÑADIDO</span>}
                  </div>
                  <div className="order-info">
                    <span className="order-mesa">{getMesaInfo(pedido.tableId)}</span>
                    <span className="time-elapsed">{getTimeElapsed(pedido.createdAt)}</span>
                  </div>
                </div>

                <div className="order-items">
                  {Array.isArray(pedido.items) && pedido.items.map((item, index) => (
                    <div key={index} className="order-item">
                      <span className="item-quantity">{item.quantity}x</span>
                      <span className="item-name">{item.name || 'Producto sin nombre'}</span>
                    </div>
                  ))}
                </div>

                <div className="order-total">
                  <span className="total-amount">S/ {(pedido.total || 0).toFixed(2)}</span>
                </div>

                <div className="ready-indicator">
                  🔔 Listo para entregar
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KitchenPage;
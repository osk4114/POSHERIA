
import React, { useState, useEffect } from 'react';
import api from '../../api';
import { getUser, logout } from '../../auth';
import { connectSocket, onForceLogout, disconnectSocket } from '../../socket';
import '../../AppBase.css';

const KitchenPage = () => {
  const user = getUser();
  const [socketError, setSocketError] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [statusMsg, setStatusMsg] = useState(null);
  const [error, setError] = useState(null);
  const [mesas, setMesas] = useState([]);
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(false);

  // Conectar socket y escuchar eventos en tiempo real
  useEffect(() => {
    if (user && user._id) {
      const socketConnection = connectSocket(user._id);
      setSocket(socketConnection);
      
      onForceLogout(() => {
        logout(() => window.location.reload());
      });
      
      if (socketConnection) {
        // Escuchar nuevos pedidos en tiempo real
        socketConnection.on('newOrder', (newOrder) => {
          setPedidos(prev => [...prev, newOrder]);
          setStatusMsg(`¡Nuevo pedido recibido! #${newOrder._id.slice(-4)}`);
          setTimeout(() => setStatusMsg(null), 3000);
        });

        // Escuchar actualizaciones de pedidos
        socketConnection.on('orderUpdated', (updatedOrder) => {
          setPedidos(prev => prev.map(p => 
            p._id === updatedOrder._id ? updatedOrder : p
          ));
        });

        // Escuchar desconexión
        socketConnection.on('disconnect', () => {
          setSocketError('Conexión perdida con el servidor. Tu sesión ha sido cerrada.');
          logout(() => window.location.reload());
        });
      }
    }
    
    // Cargar datos iniciales
    fetchPedidos();
    fetchMesas();
    
    return () => {
      if (socket) {
        socket.off('newOrder');
        socket.off('orderUpdated');
        socket.off('disconnect');
      }
      disconnectSocket();
    };
  }, [user]);

  // Solo mostrar si el usuario es cocina o admin
  if (!user || (user.role !== 'cocina' && user.role !== 'admin')) {
    return (
      <div className="wood-background">
        <div className="app-container">
          <div className="auth-container">
            <div className="auth-card">
              <h2 className="auth-title">Acceso Denegado</h2>
              <p>No tienes permisos para acceder a esta página</p>
              <button onClick={() => logout(() => window.location.reload())} className="auth-button">
                Volver al Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Obtener pedidos activos
  const fetchPedidos = async () => {
    setLoading(true);
    setError(null);
    try {
      const responses = await Promise.all([
        api.get('/api/orders', { params: { status: 'pending' } }),
        api.get('/api/orders', { params: { status: 'in_kitchen' } }),
        api.get('/api/orders', { params: { status: 'ready' } })
      ]);
      
      const allOrders = [...responses[0].data, ...responses[1].data, ...responses[2].data];
      setPedidos(allOrders);
    } catch (err) {
      setError('Error al obtener pedidos');
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  // Obtener mesas
  const fetchMesas = async () => {
    try {
      const res = await api.get('/api/tables');
      setMesas(res.data);
    } catch (err) {
      console.error('Error fetching tables:', err);
    }
  };

  // Cambiar estado de pedido con notificación en tiempo real
  const cambiarEstado = async (pedidoId, nuevoEstado) => {
    setStatusMsg(null);
    try {
      const response = await api.put(`/api/orders/${pedidoId}`, { status: nuevoEstado });
      
      // Emitir evento de actualización a otros usuarios
      if (socket) {
        socket.emit('orderStatusUpdated', {
          orderId: pedidoId,
          newStatus: nuevoEstado,
          updatedBy: user.name
        });
      }
      
      setStatusMsg(`Pedido #${pedidoId.slice(-4)} actualizado a ${getStatusLabel(nuevoEstado)}`);
      setTimeout(() => setStatusMsg(null), 3000);
      
      // Actualizar estado local
      setPedidos(prev => prev.map(p => 
        p._id === pedidoId ? { ...p, status: nuevoEstado } : p
      ));
    } catch (err) {
      setStatusMsg('Error al actualizar pedido');
      setTimeout(() => setStatusMsg(null), 3000);
      console.error('Error updating order:', err);
    }
  };

  // Obtener label del estado
  const getStatusLabel = (status) => {
    const labels = {
      'pending': 'Pendiente',
      'in_kitchen': 'En Cocina',
      'ready': 'Listo',
      'delivered': 'Entregado'
    };
    return labels[status] || status;
  };

  // Obtener información de mesa
  const getMesaInfo = (mesaId) => {
    const mesa = mesas.find(m => m._id === mesaId);
    return mesa ? `Mesa ${mesa.number}` : 'Sin mesa';
  };

  // Formatear tiempo desde creación
  const getTimeElapsed = (createdAt) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMinutes = Math.floor((now - created) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Recién creado';
    if (diffMinutes === 1) return '1 minuto';
    if (diffMinutes < 60) return `${diffMinutes} minutos`;
    
    const hours = Math.floor(diffMinutes / 60);
    const remainingMinutes = diffMinutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  // Agrupar pedidos por estado
  const pedidosPendientes = pedidos.filter(p => p.status === 'pending');
  const pedidosEnCocina = pedidos.filter(p => p.status === 'in_kitchen');
  const pedidosListos = pedidos.filter(p => p.status === 'ready');

  return (
    <div className="kitchen-dark-bg">
      <header className="kitchen-header">
        <div className="kitchen-header-content">
          <h1 className="kitchen-title">🍳 DASHBOARD COCINA</h1>
          <div className="kitchen-stats">
            <div className="stat-item">
              <span className="stat-number">{pedidosPendientes.length}</span>
              <span className="stat-label">Pendientes</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{pedidosEnCocina.length}</span>
              <span className="stat-label">En Cocina</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{pedidosListos.length}</span>
              <span className="stat-label">Listos</span>
            </div>
          </div>
          <div className="kitchen-actions">
            <button 
              className="kitchen-refresh-btn" 
              onClick={fetchPedidos}
              disabled={loading}
            >
              {loading ? '🔄' : '↻'} Actualizar
            </button>
            <button 
              className="kitchen-logout-btn" 
              onClick={() => logout(() => window.location.href = '/')}
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="kitchen-main">
        {/* Mensajes de estado */}
        {socketError && (
          <div className="kitchen-alert kitchen-alert-error">
            <strong>⚠️ Error de conexión:</strong> {socketError}
          </div>
        )}
        
        {statusMsg && (
          <div className="kitchen-alert kitchen-alert-success">
            <strong>✅ Éxito:</strong> {statusMsg}
          </div>
        )}
        
        {error && (
          <div className="kitchen-alert kitchen-alert-error">
            <strong>❌ Error:</strong> {error}
          </div>
        )}

        <div className="kitchen-columns">
          {/* Columna: Pedidos Pendientes */}
          <section className="kitchen-panel kitchen-panel-pending">
            <div className="kitchen-panel-header">
              <h2 className="kitchen-panel-title">⏳ PENDIENTES</h2>
              <span className="kitchen-panel-count">{pedidosPendientes.length}</span>
            </div>
            <div className="kitchen-orders-container">
              {pedidosPendientes.length > 0 ? pedidosPendientes.map(pedido => (
                <div key={pedido._id} className="kitchen-order-card">
                  <div className="order-header">
                    <div className="order-id">#{pedido._id.slice(-4)}</div>
                    <div className="order-time">{getTimeElapsed(pedido.createdAt)}</div>
                  </div>
                  
                  <div className="order-info">
                    <div className="order-mesa">{getMesaInfo(pedido.table)}</div>
                    {pedido.customerName && (
                      <div className="order-customer">Cliente: {pedido.customerName}</div>
                    )}
                  </div>
                  
                  <div className="order-items">
                    {pedido.products.map((p, idx) => (
                      <div key={idx} className="order-item">
                        <span className="item-name">{p.name}</span>
                        <span className="item-quantity">x{p.quantity}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="order-total">
                    Total: ${pedido.total?.toFixed(2) || 'N/A'}
                  </div>
                  
                  <div className="order-actions">
                    <button 
                      className="kitchen-btn kitchen-btn-start" 
                      onClick={() => cambiarEstado(pedido._id, 'in_kitchen')}
                    >
                      🔥 Iniciar Preparación
                    </button>
                  </div>
                </div>
              )) : (
                <div className="no-orders">
                  <div className="no-orders-icon">🎉</div>
                  <div className="no-orders-text">No hay pedidos pendientes</div>
                </div>
              )}
            </div>
          </section>

          {/* Columna: En Cocina */}
          <section className="kitchen-panel kitchen-panel-cooking">
            <div className="kitchen-panel-header">
              <h2 className="kitchen-panel-title">🔥 EN COCINA</h2>
              <span className="kitchen-panel-count">{pedidosEnCocina.length}</span>
            </div>
            <div className="kitchen-orders-container">
              {pedidosEnCocina.length > 0 ? pedidosEnCocina.map(pedido => (
                <div key={pedido._id} className="kitchen-order-card cooking">
                  <div className="order-header">
                    <div className="order-id">#{pedido._id.slice(-4)}</div>
                    <div className="order-time">{getTimeElapsed(pedido.createdAt)}</div>
                  </div>
                  
                  <div className="order-info">
                    <div className="order-mesa">{getMesaInfo(pedido.table)}</div>
                    {pedido.customerName && (
                      <div className="order-customer">Cliente: {pedido.customerName}</div>
                    )}
                  </div>
                  
                  <div className="order-items">
                    {pedido.products.map((p, idx) => (
                      <div key={idx} className="order-item">
                        <span className="item-name">{p.name}</span>
                        <span className="item-quantity">x{p.quantity}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="order-total">
                    Total: ${pedido.total?.toFixed(2) || 'N/A'}
                  </div>
                  
                  <div className="order-actions">
                    <button 
                      className="kitchen-btn kitchen-btn-ready" 
                      onClick={() => cambiarEstado(pedido._id, 'ready')}
                    >
                      ✅ Marcar Listo
                    </button>
                  </div>
                </div>
              )) : (
                <div className="no-orders">
                  <div className="no-orders-icon">👨‍🍳</div>
                  <div className="no-orders-text">No hay pedidos en preparación</div>
                </div>
              )}
            </div>
          </section>

          {/* Columna: Listos */}
          <section className="kitchen-panel kitchen-panel-ready">
            <div className="kitchen-panel-header">
              <h2 className="kitchen-panel-title">✅ LISTOS</h2>
              <span className="kitchen-panel-count">{pedidosListos.length}</span>
            </div>
            <div className="kitchen-orders-container">
              {pedidosListos.length > 0 ? pedidosListos.map(pedido => (
                <div key={pedido._id} className="kitchen-order-card ready">
                  <div className="order-header">
                    <div className="order-id">#{pedido._id.slice(-4)}</div>
                    <div className="order-time">{getTimeElapsed(pedido.createdAt)}</div>
                  </div>
                  
                  <div className="order-info">
                    <div className="order-mesa">{getMesaInfo(pedido.table)}</div>
                    {pedido.customerName && (
                      <div className="order-customer">Cliente: {pedido.customerName}</div>
                    )}
                  </div>
                  
                  <div className="order-items">
                    {pedido.products.map((p, idx) => (
                      <div key={idx} className="order-item">
                        <span className="item-name">{p.name}</span>
                        <span className="item-quantity">x{p.quantity}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="order-total">
                    Total: ${pedido.total?.toFixed(2) || 'N/A'}
                  </div>
                  
                  <div className="order-actions">
                    <button 
                      className="kitchen-btn kitchen-btn-delivered" 
                      onClick={() => cambiarEstado(pedido._id, 'delivered')}
                    >
                      🚚 Marcar Entregado
                    </button>
                  </div>
                </div>
              )) : (
                <div className="no-orders">
                  <div className="no-orders-icon">🍽️</div>
                  <div className="no-orders-text">No hay pedidos listos</div>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default KitchenPage;

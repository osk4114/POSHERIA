import React, { useState, useEffect } from 'react';
import api from '../../api';
import { connectSocket, onForceLogout, disconnectSocket } from '../../socket';
import { getUser, logout } from '../../auth';
import './KitchenDashboard.css';

const KitchenDashboard = () => {
  const user = getUser();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [filter, setFilter] = useState('all'); // all, paid, in_kitchen, ready
  const [socketError, setSocketError] = useState(null);

  // Estados de pedidos válidos para cocina
  const validStatuses = ['paid', 'in_kitchen', 'ready'];
  const statusLabels = {
    paid: 'Pagado',
    in_kitchen: 'En Cocina',
    ready: 'Listo',
    delivered: 'Entregado'
  };

  const statusColors = {
    paid: '#ffc107',
    in_kitchen: '#17a2b8',
    ready: '#28a745',
    delivered: '#6c757d'
  };

  useEffect(() => {
    if (user && user._id) {
      const socket = connectSocket(user._id);
      onForceLogout(() => {
        logout(() => window.location.reload());
      });
      
      if (socket) {
        socket.on('disconnect', () => {
          setSocketError('Conexión perdida con el servidor');
        });
        
        // Escuchar actualizaciones de pedidos en tiempo real
        socket.on('orderUpdated', (updatedOrder) => {
          setOrders(prevOrders => 
            prevOrders.map(order => 
              order._id === updatedOrder._id ? updatedOrder : order
            )
          );
        });

        socket.on('newOrder', (newOrder) => {
          if (validStatuses.includes(newOrder.status)) {
            setOrders(prevOrders => [newOrder, ...prevOrders]);
          }
        });
      }
    }
    
    return () => disconnectSocket();
  }, [user]);

  useEffect(() => {
    fetchOrders();
    // Actualizar cada 30 segundos
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/kitchen/orders');
      setOrders(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError('Error al cargar pedidos de cocina');
      console.error('Error fetching kitchen orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await api.put(`/api/kitchen/orders/${orderId}/status`, {
        status: newStatus
      });
      
      setSuccess(`Pedido actualizado a: ${statusLabels[newStatus]}`);
      
      // Actualizar estado local inmediatamente
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order._id === orderId 
            ? { ...order, status: newStatus, updatedAt: new Date() }
            : order
        )
      );
      
      // Si se marca como entregado, refrescar lista
      if (newStatus === 'delivered') {
        setTimeout(fetchOrders, 1000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al actualizar pedido');
    }
  };

  const getFilteredOrders = () => {
    let filtered = orders;
    
    if (filter !== 'all') {
      filtered = orders.filter(order => order.status === filter);
    }
    
    // Ordenar por fecha de creación (más recientes primero)
    return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ${diffMins % 60}m`;
  };

  const getOrderTotal = (products) => {
    return products.reduce((total, product) => 
      total + (product.price * product.quantity), 0
    );
  };

  const getNextStatus = (currentStatus) => {
    switch (currentStatus) {
      case 'paid': return 'in_kitchen';
      case 'in_kitchen': return 'ready';
      case 'ready': return 'delivered';
      default: return null;
    }
  };

  const getNextStatusLabel = (currentStatus) => {
    switch (currentStatus) {
      case 'paid': return 'Iniciar Preparación';
      case 'in_kitchen': return 'Marcar Listo';
      case 'ready': return 'Entregar';
      default: return null;
    }
  };

  if (!user || (user.role !== 'cocina' && user.role !== 'admin')) {
    return (
      <div className="access-denied">
        <h2>Acceso Denegado</h2>
        <p>Debes iniciar sesión como personal de cocina o administrador.</p>
      </div>
    );
  }

  return (
    <div className="kitchen-dashboard">
      <div className="dashboard-header">
        <div className="header-info">
          <h1>Dashboard de Cocina</h1>
          <p>Gestión de pedidos y preparación</p>
        </div>
        <div className="header-actions">
          <button 
            className="btn btn-outline refresh-btn"
            onClick={fetchOrders}
            disabled={loading}
          >
            🔄 {loading ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>
      </div>

      {socketError && (
        <div className="alert alert-warning">
          {socketError} - Los pedidos podrían no actualizarse en tiempo real
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="dashboard-filters">
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Todos ({orders.length})
        </button>
        <button 
          className={`filter-btn ${filter === 'paid' ? 'active' : ''}`}
          onClick={() => setFilter('paid')}
        >
          Pendientes ({orders.filter(o => o.status === 'paid').length})
        </button>
        <button 
          className={`filter-btn ${filter === 'in_kitchen' ? 'active' : ''}`}
          onClick={() => setFilter('in_kitchen')}
        >
          En Preparación ({orders.filter(o => o.status === 'in_kitchen').length})
        </button>
        <button 
          className={`filter-btn ${filter === 'ready' ? 'active' : ''}`}
          onClick={() => setFilter('ready')}
        >
          Listos ({orders.filter(o => o.status === 'ready').length})
        </button>
      </div>

      <div className="orders-grid">
        {loading && orders.length === 0 ? (
          <div className="loading-state">
            <p>Cargando pedidos...</p>
          </div>
        ) : getFilteredOrders().length === 0 ? (
          <div className="empty-state">
            <h3>No hay pedidos</h3>
            <p>
              {filter === 'all' 
                ? 'No hay pedidos en cocina en este momento'
                : `No hay pedidos con estado: ${statusLabels[filter]}`
              }
            </p>
          </div>
        ) : (
          getFilteredOrders().map(order => (
            <div key={order._id} className={`order-card ${order.status}`}>
              <div className="order-header">
                <div className="order-info">
                  <h3>
                    {order.table ? `Mesa ${order.table}` : 'Para Llevar'}
                    {order.type === 'add-on' && <span className="addon-badge">Añadido</span>}
                  </h3>
                  <div className="order-meta">
                    <span className="order-time">{formatTime(order.createdAt)}</span>
                    <span 
                      className="order-status"
                      style={{ 
                        backgroundColor: statusColors[order.status],
                        color: 'white'
                      }}
                    >
                      {statusLabels[order.status]}
                    </span>
                  </div>
                </div>
                <div className="order-total">
                  S/. {getOrderTotal(order.products).toFixed(2)}
                </div>
              </div>

              <div className="order-products">
                {order.products.map((product, index) => (
                  <div key={index} className="product-item">
                    <div className="product-info">
                      <span className="product-name">{product.name}</span>
                      <span className="product-quantity">x{product.quantity}</span>
                    </div>
                    <span className="product-price">
                      S/. {(product.price * product.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {order.parentOrderId && (
                <div className="parent-order-info">
                  <small>Añadido al pedido: {order.parentOrderId}</small>
                </div>
              )}

              <div className="order-actions">
                {order.status !== 'delivered' && getNextStatus(order.status) && (
                  <button 
                    className={`btn btn-${order.status === 'ready' ? 'success' : 'primary'} action-btn`}
                    onClick={() => updateOrderStatus(order._id, getNextStatus(order.status))}
                  >
                    {getNextStatusLabel(order.status)}
                  </button>
                )}
                
                {order.status === 'in_kitchen' && (
                  <button 
                    className="btn btn-outline action-btn"
                    onClick={() => updateOrderStatus(order._id, 'paid')}
                  >
                    Volver a Pendiente
                  </button>
                )}
              </div>

              <div className="order-footer">
                <small>
                  Actualizado: {formatTime(order.updatedAt)}
                  {order.createdBy && ` • Creado por ID: ${order.createdBy}`}
                </small>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default KitchenDashboard;
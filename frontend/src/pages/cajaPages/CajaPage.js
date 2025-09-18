import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api';
import { getUser, logout } from '../../auth';
import { connectSocket, onForceLogout, disconnectSocket } from '../../socket';
import '../../AppBase.css';

const CajaPage = () => {
  const user = getUser();
  const [socketError, setSocketError] = useState(null);
  const [activeSection, setActiveSection] = useState('ventas');
  
  // Estados para Caja
  const [cajaInfo, setCajaInfo] = useState({
    isOpen: false,
    currentAmount: 0,
    shift: 'Mañana',
    openedAt: null,
    closedAt: null
  });
  
  // Estados para pedidos y ventas
  const [pedidos, setPedidos] = useState([]);
  const [mesas, setMesas] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedMesa, setSelectedMesa] = useState(null);
  const [currentOrder, setCurrentOrder] = useState([]);
  const [total, setTotal] = useState(0);
  
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Socket connection
  useEffect(() => {
    if (user && user._id) {
      const socket = connectSocket(user._id);
      onForceLogout(() => {
        logout(() => window.location.reload());
      });
      if (socket) {
        socket.on('disconnect', () => {
          setSocketError('Conexión perdida con el servidor. Tu sesión ha sido cerrada.');
          logout(() => window.location.reload());
        });
        
        // Escuchar actualizaciones de pedidos
        socket.on('orderUpdated', (order) => {
          setPedidos(prevPedidos => 
            prevPedidos.map(p => p._id === order._id ? order : p)
          );
        });
      }
    }
    return () => disconnectSocket();
  }, [user]);

  // Función para cargar datos iniciales
  const fetchInitialData = useCallback(async () => {
    try {
      const [mesasRes, menuRes, pedidosRes] = await Promise.all([
        api.get('/api/tables'),
        api.get('/api/menu'),
        api.get('/api/orders')
      ]);
      
      setMesas(mesasRes.data);
      setMenuItems(menuRes.data);
      setPedidos(pedidosRes.data.filter(p => p.status !== 'pagado'));
    } catch (err) {
      setError('Error al cargar datos iniciales');
    }
  }, []);

  // Cargar datos iniciales
  useEffect(() => {
    if (user && (user.role === 'caja' || user.role === 'admin')) {
      fetchInitialData();
    }
  }, [user, fetchInitialData]);

  // Calcular total cuando cambie el pedido actual
  useEffect(() => {
    const newTotal = currentOrder.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    setTotal(newTotal);
  }, [currentOrder]);

  // Verificar acceso
  if (!user || (user.role !== 'caja' && user.role !== 'admin')) {
    return (
      <div className="access-denied">
        <h2>Acceso Denegado</h2>
        <p>Debes iniciar sesión como cajero o administrador.</p>
      </div>
    );
  }

  const abrirCaja = async () => {
    try {
      const response = await api.post('/api/caja/abrir', {
        initialAmount: 100 // Monto inicial
      });
      setCajaInfo({
        ...cajaInfo,
        isOpen: true,
        openedAt: new Date(),
        currentAmount: 100
      });
      setSuccess('Caja abierta correctamente');
    } catch (err) {
      setError('Error al abrir caja');
    }
  };

  const cerrarCaja = async () => {
    try {
      const response = await api.post('/api/caja/cerrar', {
        finalAmount: cajaInfo.currentAmount
      });
      setCajaInfo({
        ...cajaInfo,
        isOpen: false,
        closedAt: new Date()
      });
      setSuccess('Caja cerrada correctamente');
    } catch (err) {
      setError('Error al cerrar caja');
    }
  };

  const addToOrder = (item) => {
    const existingItem = currentOrder.find(orderItem => orderItem._id === item._id);
    if (existingItem) {
      setCurrentOrder(currentOrder.map(orderItem =>
        orderItem._id === item._id
          ? { ...orderItem, quantity: orderItem.quantity + 1 }
          : orderItem
      ));
    } else {
      setCurrentOrder([...currentOrder, { ...item, quantity: 1 }]);
    }
    calculateTotal();
  };

  const removeFromOrder = (itemId) => {
    setCurrentOrder(currentOrder.filter(item => item._id !== itemId));
    calculateTotal();
  };

  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromOrder(itemId);
      return;
    }
    setCurrentOrder(currentOrder.map(item =>
      item._id === itemId ? { ...item, quantity: newQuantity } : item
    ));
    calculateTotal();
  };

  const calculateTotal = () => {
    const newTotal = currentOrder.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    setTotal(newTotal);
  };

  const processPayment = async (paymentMethod) => {
    if (!selectedMesa || currentOrder.length === 0) {
      setError('Selecciona una mesa y agrega productos');
      return;
    }

    try {
      const orderData = {
        table: selectedMesa._id,
        products: currentOrder.map(item => ({
          productId: item._id,
          name: item.name,
          quantity: item.quantity,
          price: item.price
        })),
        total: total,
        paymentMethod: paymentMethod,
        status: 'pagado'
      };

      const response = await api.post('/api/orders', orderData);
      
      // Actualizar estado de la mesa
      await api.put(`/api/tables/${selectedMesa._id}`, { status: 'disponible' });
      
      // Limpiar pedido actual
      setCurrentOrder([]);
      setSelectedMesa(null);
      setTotal(0);
      
      // Actualizar caja
      setCajaInfo({
        ...cajaInfo,
        currentAmount: cajaInfo.currentAmount + total
      });
      
      setSuccess(`Pago procesado correctamente - Total: S/ ${total}`);
      fetchInitialData(); // Recargar datos
    } catch (err) {
      setError('Error al procesar el pago');
    }
  };

  return (
    <div className="caja-container">
      {/* Sidebar */}
      <div className="caja-sidebar">
        <div className="caja-sidebar-header">
          <h2>💰 Caja</h2>
          <div className="caja-user-info">
            <div className="caja-user-avatar">👤</div>
            <div className="caja-user-details">
              <span className="caja-user-name">{user?.name || 'Cajero'}</span>
              <span className="caja-user-role">Caja</span>
            </div>
          </div>
        </div>

        <nav className="caja-sidebar-nav">
          <button 
            onClick={() => setActiveSection('ventas')}
            className={`caja-nav-btn ${activeSection === 'ventas' ? 'active' : ''}`}
          >
            <span className="nav-icon">🛒</span>
            Ventas
          </button>
          <button 
            onClick={() => setActiveSection('caja')}
            className={`caja-nav-btn ${activeSection === 'caja' ? 'active' : ''}`}
          >
            <span className="nav-icon">💰</span>
            Control Caja
          </button>
          <button 
            onClick={() => setActiveSection('historial')}
            className={`caja-nav-btn ${activeSection === 'historial' ? 'active' : ''}`}
          >
            <span className="nav-icon">📋</span>
            Historial
          </button>
        </nav>

        <div className="caja-sidebar-footer">
          <button 
            className="caja-logout-btn"
            onClick={() => logout(() => window.location.href = '/')}
          >
            🚪 Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="caja-main-content">
        <div className="caja-content-header">
          <h1>
            {activeSection === 'ventas' && '🛒 Punto de Venta'}
            {activeSection === 'caja' && '💰 Control de Caja'}
            {activeSection === 'historial' && '📋 Historial de Ventas'}
          </h1>
          <div className="caja-status">
            <span className={`caja-status-indicator ${cajaInfo.isOpen ? 'open' : 'closed'}`}>
              {cajaInfo.isOpen ? '🟢 Caja Abierta' : '🔴 Caja Cerrada'}
            </span>
            <span className="caja-amount">S/ {cajaInfo.currentAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* Mensajes de estado */}
        {error && <div className="caja-error-msg">{error}</div>}
        {success && <div className="caja-success-msg">{success}</div>}
        {socketError && <div className="caja-error-msg">{socketError}</div>}

        {/* Sección de Ventas */}
        {activeSection === 'ventas' && (
          <div className="caja-sales-section">
            <div className="sales-layout">
              {/* Panel izquierdo - Menú */}
              <div className="menu-panel">
                <h3>📋 Menú</h3>
                <div className="menu-grid">
                  {menuItems.map(item => (
                    <div key={item._id} className="menu-item-card">
                      <h4>{item.name}</h4>
                      <p className="menu-item-description">{item.description}</p>
                      <div className="menu-item-footer">
                        <span className="menu-item-price">S/ {item.price}</span>
                        <button 
                          className="caja-btn caja-btn-success"
                          onClick={() => addToOrder(item)}
                          disabled={!cajaInfo.isOpen}
                        >
                          Agregar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Panel derecho - Pedido actual */}
              <div className="order-panel">
                <h3>🛒 Pedido Actual</h3>
                
                {/* Selección de mesa */}
                <div className="mesa-selection">
                  <label>Mesa:</label>
                  <select 
                    value={selectedMesa?._id || ''}
                    onChange={(e) => {
                      const mesa = mesas.find(m => m._id === e.target.value);
                      setSelectedMesa(mesa);
                    }}
                    className="caja-select"
                  >
                    <option value="">Seleccionar mesa</option>
                    {mesas.filter(m => m.status === 'ocupada' || m.status === 'disponible').map(mesa => (
                      <option key={mesa._id} value={mesa._id}>
                        Mesa {mesa.number} ({mesa.status})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Items del pedido */}
                <div className="order-items">
                  {currentOrder.length === 0 ? (
                    <p className="empty-order">No hay items en el pedido</p>
                  ) : (
                    currentOrder.map(item => (
                      <div key={item._id} className="order-item">
                        <div className="order-item-info">
                          <span className="order-item-name">{item.name}</span>
                          <span className="order-item-price">S/ {item.price}</span>
                        </div>
                        <div className="order-item-controls">
                          <button 
                            className="quantity-btn"
                            onClick={() => updateQuantity(item._id, item.quantity - 1)}
                          >
                            -
                          </button>
                          <span className="quantity">{item.quantity}</span>
                          <button 
                            className="quantity-btn"
                            onClick={() => updateQuantity(item._id, item.quantity + 1)}
                          >
                            +
                          </button>
                          <button 
                            className="remove-btn"
                            onClick={() => removeFromOrder(item._id)}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Total y botones de pago */}
                <div className="order-footer">
                  <div className="order-total">
                    Total: <strong>S/ {total.toFixed(2)}</strong>
                  </div>
                  <div className="payment-buttons">
                    <button 
                      className="caja-btn caja-btn-primary"
                      onClick={() => processPayment('efectivo')}
                      disabled={!cajaInfo.isOpen || currentOrder.length === 0}
                    >
                      💵 Efectivo
                    </button>
                    <button 
                      className="caja-btn caja-btn-primary"
                      onClick={() => processPayment('tarjeta')}
                      disabled={!cajaInfo.isOpen || currentOrder.length === 0}
                    >
                      💳 Tarjeta
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sección Control de Caja */}
        {activeSection === 'caja' && (
          <div className="caja-control-section">
            <div className="caja-info-grid">
              <div className="caja-info-card">
                <h3>💰 Estado de Caja</h3>
                <div className="caja-details">
                  <p><strong>Estado:</strong> {cajaInfo.isOpen ? 'Abierta' : 'Cerrada'}</p>
                  <p><strong>Monto Actual:</strong> S/ {cajaInfo.currentAmount.toFixed(2)}</p>
                  <p><strong>Turno:</strong> {cajaInfo.shift}</p>
                  {cajaInfo.openedAt && (
                    <p><strong>Abierta:</strong> {cajaInfo.openedAt.toLocaleTimeString()}</p>
                  )}
                </div>
                <div className="caja-actions">
                  {!cajaInfo.isOpen ? (
                    <button 
                      className="caja-btn caja-btn-success"
                      onClick={abrirCaja}
                    >
                      🔓 Abrir Caja
                    </button>
                  ) : (
                    <button 
                      className="caja-btn caja-btn-danger"
                      onClick={cerrarCaja}
                    >
                      🔒 Cerrar Caja
                    </button>
                  )}
                </div>
              </div>

              <div className="caja-info-card">
                <h3>📊 Resumen del Día</h3>
                <div className="daily-summary">
                  <p><strong>Ventas Totales:</strong> S/ {cajaInfo.currentAmount.toFixed(2)}</p>
                  <p><strong>Pedidos Procesados:</strong> {pedidos.filter(p => p.status === 'pagado').length}</p>
                  <p><strong>Monto Promedio:</strong> S/ {pedidos.length > 0 ? (cajaInfo.currentAmount / pedidos.length).toFixed(2) : '0.00'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sección Historial */}
        {activeSection === 'historial' && (
          <div className="caja-history-section">
            <h3>📋 Historial de Ventas</h3>
            <div className="history-table-container">
              <table className="caja-table">
                <thead>
                  <tr>
                    <th>Hora</th>
                    <th>Mesa</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Método Pago</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {pedidos.filter(p => p.status === 'pagado').map(pedido => (
                    <tr key={pedido._id}>
                      <td>{new Date(pedido.createdAt).toLocaleTimeString()}</td>
                      <td>Mesa {pedido.table?.number || 'N/A'}</td>
                      <td>{pedido.products?.length || 0} items</td>
                      <td>S/ {pedido.total?.toFixed(2) || '0.00'}</td>
                      <td>{pedido.paymentMethod || 'N/A'}</td>
                      <td>
                        <span className="status-badge status-paid">
                          Pagado
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CajaPage;

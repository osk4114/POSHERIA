import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api';
import { getUser, logout } from '../../auth';
import { connectSocket, onForceLogout, disconnectSocket } from '../../socket';
import '../../AppBase.css';

const MozoPage = () => {
  const user = getUser();
  const [socketError, setSocketError] = useState(null);
  const [activeSection, setActiveSection] = useState('mesas');
  
  // Estados para mesas y pedidos
  const [mesas, setMesas] = useState([]);
  const [mesaAsignada, setMesaAsignada] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  
  // Estados para crear pedidos
  const [selectedMesa, setSelectedMesa] = useState(null);
  const [currentOrder, setCurrentOrder] = useState([]);
  const [orderNotes, setOrderNotes] = useState('');
  
  // Estados para add-ons
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [addOnItems, setAddOnItems] = useState([]);
  
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
        
        // Escuchar actualizaciones de pedidos y mesas
        socket.on('orderUpdated', (order) => {
          setPedidos(prevPedidos => 
            prevPedidos.map(p => p._id === order._id ? order : p)
          );
        });

        socket.on('tableUpdated', (table) => {
          setMesas(prevMesas => 
            prevMesas.map(m => m._id === table._id ? table : m)
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
      setPedidos(pedidosRes.data);
      
      // Buscar mesa asignada al mozo
      const mesaAsignada = mesasRes.data.find(mesa => 
        mesa.assignedWaiter === user._id && mesa.status === 'ocupada'
      );
      if (mesaAsignada) {
        setMesaAsignada(mesaAsignada);
      }
    } catch (err) {
      setError('Error al cargar datos iniciales');
    }
  }, [user]);

  // Cargar datos iniciales
  useEffect(() => {
    if (user && (user.role === 'mozo' || user.role === 'admin')) {
      fetchInitialData();
    }
  }, [user, fetchInitialData]);

  // Verificar acceso
  if (!user || (user.role !== 'mozo' && user.role !== 'admin')) {
    return (
      <div className="access-denied">
        <h2>Acceso Denegado</h2>
        <p>Debes iniciar sesión como mozo o administrador.</p>
      </div>
    );
  }

  const asignarMesa = async (mesaId) => {
    try {
      await api.put(`/api/tables/${mesaId}`, {
        status: 'ocupada',
        assignedWaiter: user._id
      });
      
      const mesaActualizada = mesas.find(m => m._id === mesaId);
      setMesaAsignada({ ...mesaActualizada, status: 'ocupada', assignedWaiter: user._id });
      setSuccess('Mesa asignada correctamente');
      fetchInitialData();
    } catch (err) {
      setError('Error al asignar mesa');
    }
  };

  const liberarMesa = async () => {
    if (!mesaAsignada) return;
    
    try {
      await api.put(`/api/tables/${mesaAsignada._id}`, {
        status: 'disponible',
        assignedWaiter: null
      });
      
      setMesaAsignada(null);
      setSelectedMesa(null);
      setCurrentOrder([]);
      setSuccess('Mesa liberada correctamente');
      fetchInitialData();
    } catch (err) {
      setError('Error al liberar mesa');
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
  };

  const removeFromOrder = (itemId) => {
    setCurrentOrder(currentOrder.filter(item => item._id !== itemId));
  };

  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromOrder(itemId);
      return;
    }
    setCurrentOrder(currentOrder.map(item =>
      item._id === itemId ? { ...item, quantity: newQuantity } : item
    ));
  };

  const crearPedido = async () => {
    if (!mesaAsignada || currentOrder.length === 0) {
      setError('Selecciona una mesa y agrega productos');
      return;
    }

    try {
      const orderData = {
        table: mesaAsignada._id,
        waiter: user._id,
        products: currentOrder.map(item => ({
          productId: item._id,
          name: item.name,
          quantity: item.quantity,
          price: item.price
        })),
        notes: orderNotes,
        status: 'pendiente'
      };

      await api.post('/api/orders', orderData);
      
      // Limpiar pedido actual
      setCurrentOrder([]);
      setOrderNotes('');
      
      setSuccess('Pedido creado correctamente');
      fetchInitialData();
    } catch (err) {
      setError('Error al crear pedido');
    }
  };

  const addToAddOn = (item) => {
    const existingItem = addOnItems.find(addOnItem => addOnItem._id === item._id);
    if (existingItem) {
      setAddOnItems(addOnItems.map(addOnItem =>
        addOnItem._id === item._id
          ? { ...addOnItem, quantity: addOnItem.quantity + 1 }
          : addOnItem
      ));
    } else {
      setAddOnItems([...addOnItems, { ...item, quantity: 1 }]);
    }
  };

  const crearAddOn = async () => {
    if (!selectedOrder || addOnItems.length === 0) {
      setError('Selecciona un pedido y agrega productos');
      return;
    }

    try {
      const addOnData = {
        originalOrder: selectedOrder._id,
        table: selectedOrder.table,
        waiter: user._id,
        products: addOnItems.map(item => ({
          productId: item._id,
          name: item.name,
          quantity: item.quantity,
          price: item.price
        })),
        type: 'add-on',
        status: 'pendiente'
      };

      await api.post('/api/orders', addOnData);
      
      // Limpiar add-on actual
      setAddOnItems([]);
      setSelectedOrder(null);
      
      setSuccess('Add-on creado correctamente');
      fetchInitialData();
    } catch (err) {
      setError('Error al crear add-on');
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await api.put(`/api/orders/${orderId}`, { status: newStatus });
      setSuccess(`Estado del pedido actualizado a: ${newStatus}`);
      fetchInitialData();
    } catch (err) {
      setError('Error al actualizar estado del pedido');
    }
  };

  const mesasDisponibles = mesas.filter(m => m.status === 'disponible' || m.status === 'limpieza');
  const pedidosMesa = mesaAsignada ? pedidos.filter(p => p.table && p.table._id === mesaAsignada._id) : [];

  return (
    <div className="mozo-container">
      {/* Sidebar */}
      <div className="mozo-sidebar">
        <div className="mozo-sidebar-header">
          <h2>🧑‍🍳 Mozo</h2>
          <div className="mozo-user-info">
            <div className="mozo-user-avatar">👤</div>
            <div className="mozo-user-details">
              <span className="mozo-user-name">{user?.name || 'Mozo'}</span>
              <span className="mozo-user-role">Mesero</span>
            </div>
          </div>
        </div>

        <nav className="mozo-sidebar-nav">
          <button 
            onClick={() => setActiveSection('mesas')}
            className={`mozo-nav-btn ${activeSection === 'mesas' ? 'active' : ''}`}
          >
            <span className="nav-icon">🪑</span>
            Mesas
          </button>
          <button 
            onClick={() => setActiveSection('pedidos')}
            className={`mozo-nav-btn ${activeSection === 'pedidos' ? 'active' : ''}`}
          >
            <span className="nav-icon">📋</span>
            Pedidos
          </button>
          <button 
            onClick={() => setActiveSection('nuevo-pedido')}
            className={`mozo-nav-btn ${activeSection === 'nuevo-pedido' ? 'active' : ''}`}
          >
            <span className="nav-icon">➕</span>
            Nuevo Pedido
          </button>
          <button 
            onClick={() => setActiveSection('add-ons')}
            className={`mozo-nav-btn ${activeSection === 'add-ons' ? 'active' : ''}`}
          >
            <span className="nav-icon">🍽️</span>
            Add-ons
          </button>
        </nav>

        <div className="mozo-sidebar-footer">
          <button 
            className="mozo-logout-btn"
            onClick={() => logout(() => window.location.href = '/')}
          >
            🚪 Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="mozo-main-content">
        <div className="mozo-content-header">
          <h1>
            {activeSection === 'mesas' && '🪑 Gestión de Mesas'}
            {activeSection === 'pedidos' && '📋 Pedidos Activos'}
            {activeSection === 'nuevo-pedido' && '➕ Crear Nuevo Pedido'}
            {activeSection === 'add-ons' && '🍽️ Agregar Add-ons'}
          </h1>
          <div className="mozo-status">
            {mesaAsignada ? (
              <span className="mesa-assigned">
                📍 Mesa {mesaAsignada.number} Asignada
              </span>
            ) : (
              <span className="mesa-not-assigned">
                ⚪ Sin Mesa Asignada
              </span>
            )}
          </div>
        </div>

        {/* Mensajes de estado */}
        {error && <div className="mozo-error-msg">{error}</div>}
        {success && <div className="mozo-success-msg">{success}</div>}
        {socketError && <div className="mozo-error-msg">{socketError}</div>}

        {/* Sección de Mesas */}
        {activeSection === 'mesas' && (
          <div className="mozo-mesas-section">
            {mesaAsignada ? (
              <div className="mesa-asignada-info">
                <h3>Mesa Asignada: #{mesaAsignada.number}</h3>
                <div className="mesa-actions">
                  <button 
                    className="mozo-btn mozo-btn-danger"
                    onClick={liberarMesa}
                  >
                    Liberar Mesa
                  </button>
                  <button 
                    className="mozo-btn mozo-btn-primary"
                    onClick={() => setActiveSection('nuevo-pedido')}
                  >
                    Crear Pedido
                  </button>
                </div>
              </div>
            ) : (
              <div className="mesas-disponibles">
                <h3>Mesas Disponibles para Asignar</h3>
                <div className="mesas-grid">
                  {mesasDisponibles.map(mesa => (
                    <div key={mesa._id} className="mesa-card">
                      <div className="mesa-number">Mesa {mesa.number}</div>
                      <div className="mesa-status">{mesa.status}</div>
                      <div className="mesa-capacity">
                        👥 {mesa.capacity} personas
                      </div>
                      <button 
                        className="mozo-btn mozo-btn-success"
                        onClick={() => asignarMesa(mesa._id)}
                      >
                        Asignar Mesa
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sección de Pedidos */}
        {activeSection === 'pedidos' && (
          <div className="mozo-pedidos-section">
            <h3>Pedidos de Mesa {mesaAsignada?.number || 'N/A'}</h3>
            <div className="pedidos-list">
              {pedidosMesa.length === 0 ? (
                <p className="no-pedidos">No hay pedidos para esta mesa</p>
              ) : (
                pedidosMesa.map(pedido => (
                  <div key={pedido._id} className="pedido-card">
                    <div className="pedido-header">
                      <span className="pedido-id">#{pedido._id.slice(-6)}</span>
                      <span className={`pedido-status status-${pedido.status}`}>
                        {pedido.status}
                      </span>
                      <span className="pedido-time">
                        {new Date(pedido.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="pedido-items">
                      {pedido.products?.map((product, idx) => (
                        <div key={idx} className="pedido-item">
                          <span>{product.name}</span>
                          <span>x{product.quantity}</span>
                          <span>S/ {product.price}</span>
                        </div>
                      ))}
                    </div>
                    {pedido.notes && (
                      <div className="pedido-notes">
                        📝 {pedido.notes}
                      </div>
                    )}
                    <div className="pedido-actions">
                      {pedido.status === 'pendiente' && (
                        <button 
                          className="mozo-btn mozo-btn-warning"
                          onClick={() => updateOrderStatus(pedido._id, 'en-preparacion')}
                        >
                          Marcar en Preparación
                        </button>
                      )}
                      {pedido.status === 'listo' && (
                        <button 
                          className="mozo-btn mozo-btn-success"
                          onClick={() => updateOrderStatus(pedido._id, 'entregado')}
                        >
                          Marcar Entregado
                        </button>
                      )}
                      <button 
                        className="mozo-btn mozo-btn-secondary"
                        onClick={() => {
                          setSelectedOrder(pedido);
                          setActiveSection('add-ons');
                        }}
                      >
                        Agregar Add-on
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Sección Nuevo Pedido */}
        {activeSection === 'nuevo-pedido' && mesaAsignada && (
          <div className="mozo-nuevo-pedido-section">
            <div className="nuevo-pedido-layout">
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
                          className="mozo-btn mozo-btn-success"
                          onClick={() => addToOrder(item)}
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
                <h3>🛒 Nuevo Pedido - Mesa {mesaAsignada.number}</h3>
                
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

                {/* Notas del pedido */}
                <div className="order-notes">
                  <label>📝 Notas especiales:</label>
                  <textarea
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="Instrucciones especiales para la cocina..."
                    className="mozo-textarea"
                  />
                </div>

                {/* Botón crear pedido */}
                <div className="order-footer">
                  <button 
                    className="mozo-btn mozo-btn-primary full-width"
                    onClick={crearPedido}
                    disabled={currentOrder.length === 0}
                  >
                    🍽️ Enviar a Cocina
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sección Add-ons */}
        {activeSection === 'add-ons' && (
          <div className="mozo-addons-section">
            <div className="addons-layout">
              {/* Selección de pedido */}
              <div className="addon-order-selection">
                <h3>Seleccionar Pedido</h3>
                <div className="pedidos-para-addon">
                  {pedidosMesa.filter(p => p.status !== 'entregado' && p.type !== 'add-on').map(pedido => (
                    <div 
                      key={pedido._id} 
                      className={`pedido-selectable ${selectedOrder?._id === pedido._id ? 'selected' : ''}`}
                      onClick={() => setSelectedOrder(pedido)}
                    >
                      <span>Pedido #{pedido._id.slice(-6)}</span>
                      <span className={`status-${pedido.status}`}>{pedido.status}</span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedOrder && (
                <div className="addon-creation">
                  {/* Panel izquierdo - Menú para add-on */}
                  <div className="menu-panel">
                    <h3>📋 Agregar Items</h3>
                    <div className="menu-grid">
                      {menuItems.map(item => (
                        <div key={item._id} className="menu-item-card">
                          <h4>{item.name}</h4>
                          <p className="menu-item-description">{item.description}</p>
                          <div className="menu-item-footer">
                            <span className="menu-item-price">S/ {item.price}</span>
                            <button 
                              className="mozo-btn mozo-btn-success"
                              onClick={() => addToAddOn(item)}
                            >
                              Agregar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Panel derecho - Add-on actual */}
                  <div className="addon-panel">
                    <h3>➕ Add-on para Pedido #{selectedOrder._id.slice(-6)}</h3>
                    
                    <div className="addon-items">
                      {addOnItems.length === 0 ? (
                        <p className="empty-addon">No hay items en el add-on</p>
                      ) : (
                        addOnItems.map(item => (
                          <div key={item._id} className="addon-item">
                            <div className="addon-item-info">
                              <span className="addon-item-name">{item.name}</span>
                              <span className="addon-item-price">S/ {item.price}</span>
                            </div>
                            <div className="addon-item-controls">
                              <button 
                                className="quantity-btn"
                                onClick={() => {
                                  const updatedItems = addOnItems.map(addOnItem =>
                                    addOnItem._id === item._id
                                      ? { ...addOnItem, quantity: Math.max(0, addOnItem.quantity - 1) }
                                      : addOnItem
                                  ).filter(addOnItem => addOnItem.quantity > 0);
                                  setAddOnItems(updatedItems);
                                }}
                              >
                                -
                              </button>
                              <span className="quantity">{item.quantity}</span>
                              <button 
                                className="quantity-btn"
                                onClick={() => {
                                  setAddOnItems(addOnItems.map(addOnItem =>
                                    addOnItem._id === item._id
                                      ? { ...addOnItem, quantity: addOnItem.quantity + 1 }
                                      : addOnItem
                                  ));
                                }}
                              >
                                +
                              </button>
                              <button 
                                className="remove-btn"
                                onClick={() => {
                                  setAddOnItems(addOnItems.filter(addOnItem => addOnItem._id !== item._id));
                                }}
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="addon-footer">
                      <button 
                        className="mozo-btn mozo-btn-primary full-width"
                        onClick={crearAddOn}
                        disabled={addOnItems.length === 0}
                      >
                        ➕ Crear Add-on
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mensaje si no hay mesa asignada en secciones que la requieren */}
        {!mesaAsignada && ['nuevo-pedido', 'pedidos', 'add-ons'].includes(activeSection) && (
          <div className="no-mesa-warning">
            <h3>⚠️ No tienes mesa asignada</h3>
            <p>Primero debes asignar una mesa para poder gestionar pedidos.</p>
            <button 
              className="mozo-btn mozo-btn-primary"
              onClick={() => setActiveSection('mesas')}
            >
              Ir a Mesas
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MozoPage;

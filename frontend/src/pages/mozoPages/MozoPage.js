import React, { useState, useEffect, useCallback } from 'react';
import MesasGrid from './MesasGrid';
import api, { createAddOn, listAddOns } from '../../api';
import { connectSocket, onForceLogout, disconnectSocket } from '../../socket';
import { getUser, logout } from '../../auth';
import './MozoPage.css';

const MozoPage = () => {
  const user = getUser();
  const [activeTab, setActiveTab] = useState('mesas');
  const [mesas, setMesas] = useState([]); // Para MesasGrid component
  const [menuItems, setMenuItems] = useState([]);
  const [myTables, setMyTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [currentOrder, setCurrentOrder] = useState([]);
  const [orderHistory, setOrderHistory] = useState([]);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showAddOnModal, setShowAddOnModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [selectedParentOrder, setSelectedParentOrder] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Handler para click en mesa
  const handleMesaClick = (mesa) => {
    setSelectedTable(mesa);
    if (mesa.status === 'libre' || mesa.status === 'assigned' || !mesa.waiterId) {
      // Mesa libre o asignada - permitir tomar
      takeTable(mesa._id);
    } else if (mesa.waiterId === user._id) {
      // Es mi mesa - mostrar modal de gestión
      setShowManageModal(true);
    }
  };

  // Data fetching functions memoized with useCallback
  const fetchTables = useCallback(async () => {
    try {
      const response = await api.get('/api/tables');
      setMesas(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Error fetching tables:', err);
      setError('Error al cargar las mesas');
    }
  }, []);

  const fetchMenu = useCallback(async () => {
    try {
      const response = await api.get('/api/menu');
      setMenuItems(Array.isArray(response.data) ? response.data.filter(item => item.available) : []);
    } catch (err) {
      console.error('Error fetching menu:', err);
      setError('Error al cargar el menú');
    }
  }, []);

  const fetchMyTables = useCallback(async () => {
    try {
      const response = await api.get('/api/tables');
      const allTables = Array.isArray(response.data) ? response.data : [];
      const userTables = allTables.filter(table => table.waiterId === user._id);
      setMyTables(userTables);
    } catch (err) {
      console.error('Error fetching my tables:', err);
      setError('Error al cargar mis mesas');
    }
  }, [user._id]);

  const fetchOrderHistory = useCallback(async () => {
    try {
      const response = await api.get('/api/orders', {
        params: { waiterId: user._id }
      });
      setOrderHistory(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Error fetching order history:', err);
      setError('Error al cargar el historial de pedidos');
    }
  }, [user._id]);

  // Socket connection useEffect - Solo una vez al montar
  useEffect(() => {
    let socket = null;
    
    if (user && user._id) {
      console.log('🔌 [FRONTEND] Conectando socket para usuario:', user._id);
      socket = connectSocket(user._id);
      onForceLogout(() => {
        logout(() => window.location.reload());
      });
      
      if (socket) {
        console.log('✅ [FRONTEND] Socket obtenido, configurando listeners...');
        
        socket.on('disconnect', () => {
          console.log('❌ [FRONTEND] Socket desconectado');
        });
        
        socket.on('connect', () => {
          console.log('✅ [FRONTEND] Socket conectado con ID:', socket.id);
        });
        
        socket.on('tableUpdated', (eventData) => {
          console.log('🔄 [FRONTEND] Evento tableUpdated recibido:', eventData);
          const updatedTable = eventData.table || eventData; // Manejar ambos formatos
          
          console.log('📊 [FRONTEND] Estado actual de mesas antes:', mesas.length);
          console.log('📊 [FRONTEND] Estado actual de myTables antes:', myTables.length);
          
          setMesas(prevMesas => {
            const newMesas = prevMesas.map(mesa => 
              mesa._id === updatedTable._id ? updatedTable : mesa
            );
            console.log('📊 [FRONTEND] Nuevas mesas después de update:', newMesas.length);
            return newMesas;
          });
          
          setMyTables(prevTables => {
            const newMyTables = prevTables.map(mesa => 
              mesa._id === updatedTable._id ? updatedTable : mesa
            );
            console.log('📊 [FRONTEND] Nuevas myTables después de update:', newMyTables.length);
            return newMyTables;
          });
          
          console.log('✅ [FRONTEND] Mesa actualizada en el estado local:', updatedTable.number);
        });
      }
    }

    // NO desconectar el socket al desmontar - mantenerlo persistente
    return () => {
      console.log('🔌 [FRONTEND] Componente desmontando, manteniendo socket conectado');
    };
  }, [user?._id]); // Solo reconectar si cambia el usuario

  // Initial data fetching useEffect
  useEffect(() => {
    if (user && user._id) {
      // Cargar datos iniciales
      fetchTables();
      fetchMenu();
      fetchMyTables();
      fetchOrderHistory();
      
      // Configurar intervalo para actualizaciones periódicas (cada 30 segundos)
      const interval = setInterval(() => {
        fetchTables();
        fetchMyTables();
        fetchOrderHistory();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [user?._id]); // Solo cuando cambie el ID del usuario

  const takeTable = async (tableId) => {
    try {
      setLoading(true);
      await api.post(`/api/tables/${tableId}/asignar`);
      setSuccess('Mesa tomada exitosamente');
      
      // Forzar actualización inmediata de datos
      await fetchTables();
      await fetchMyTables();
    } catch (err) {
      setError('Error al tomar la mesa');
      console.error('Error taking table:', err);
    } finally {
      setLoading(false);
    }
  };

  const releaseTable = async (tableId) => {
    try {
      setLoading(true);
      await api.post(`/api/tables/${tableId}/liberar`);
      setSuccess('Mesa liberada exitosamente');
      setShowManageModal(false);
      
      // Forzar actualización inmediata de datos
      await fetchTables();
      await fetchMyTables();
      setSelectedTable(null);
    } catch (err) {
      setError('Error al liberar la mesa');
      console.error('Error releasing table:', err);
    } finally {
      setLoading(false);
    }
  };

  const changeTableStatus = async (tableId, status) => {
    try {
      setLoading(true);
      await api.put(`/api/tables/${tableId}`, { status });
      setSuccess(`Estado de la mesa cambiado a ${status}`);
      
      // Forzar actualización inmediata de datos
      await fetchTables();
      await fetchMyTables();
      setShowManageModal(false);
    } catch (err) {
      setError('Error al cambiar el estado de la mesa');
      console.error('Error changing table status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTableAction = (mesa, action) => {
    setSelectedTable(mesa);
    switch (action) {
      case 'new-order':
        setCurrentOrder([]);
        setShowOrderModal(true);
        break;
      case 'add-on':
        setCurrentOrder([]);
        setShowAddOnModal(true);
        break;
      case 'release':
        releaseTable(mesa._id);
        break;
      case 'ocupar':
        changeTableStatus(mesa._id, 'ocupada');
        break;
      case 'limpiar':
        changeTableStatus(mesa._id, 'limpiando');
        break;
      default:
        break;
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

  const removeFromOrder = (index) => {
    setCurrentOrder(currentOrder.filter((_, i) => i !== index));
  };

  const submitOrder = async (isAddOn = false) => {
    try {
      setLoading(true);
      
      if (isAddOn) {
        // Para añadidos, usar la API específica
        const products = currentOrder.map(item => ({
          productId: item._id,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        }));

        // Los añadidos van a la mesa, no a un pedido específico
        await createAddOn(selectedTable._id, null, products);
        setSuccess('Añadido creado exitosamente');
      } else {
        // El mozo NO puede crear pedidos normales
        setError('Los mozos solo pueden crear añadidos, no pedidos nuevos');
        return;
      }
      
      setCurrentOrder([]);
      setSelectedTable(null);
      setSelectedParentOrder(null);
      setShowOrderModal(false);
      setShowAddOnModal(false);
      setShowManageModal(false);
      fetchOrderHistory();
      fetchTables();
      
    } catch (err) {
      setError('Error al enviar el pedido');
      console.error('Error submitting order:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mozo-container">
      {/* Contenido Principal */}
      <div className="mozo-main-content">
        {/* Header */}
        <div className="mozo-header">
          <div className="mozo-header-content">
            <h1 className="mozo-header-title">Panel del Mozo</h1>
            <div className="mozo-header-actions">
              <div className="mozo-welcome-badge">
                Bienvenido, {user?.name || 'Mozo'}
              </div>
              <button 
                className="mozo-logout-btn" 
                onClick={() => logout(() => window.location.reload())}
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="mozo-content">
          {/* Notificaciones */}
          {error && (
            <div className="notification error">
              {error}
              <button onClick={() => setError(null)} style={{ 
                background: 'none', 
                border: 'none', 
                color: 'white', 
                marginLeft: '1rem',
                cursor: 'pointer',
                fontSize: '1.2rem'
              }}>×</button>
            </div>
          )}

          {success && (
            <div className="notification success">
              {success}
              <button onClick={() => setSuccess(null)} style={{ 
                background: 'none', 
                border: 'none', 
                color: 'white', 
                marginLeft: '1rem',
                cursor: 'pointer',
                fontSize: '1.2rem'
              }}>×</button>
            </div>
          )}

          {/* Tabs */}
          <div className="mozo-tabs">
            <button 
              className={`mozo-tab ${activeTab === 'mesas' ? 'active' : ''}`}
              onClick={() => setActiveTab('mesas')}
            >
              🍽️ Mesas Disponibles
            </button>
            <button 
              className={`mozo-tab ${activeTab === 'mis-mesas' ? 'active' : ''}`}
              onClick={() => setActiveTab('mis-mesas')}
            >
              👨‍💼 Mis Mesas
            </button>
            <button 
              className={`mozo-tab ${activeTab === 'historial' ? 'active' : ''}`}
              onClick={() => setActiveTab('historial')}
            >
              📋 Historial
            </button>
          </div>

          {/* Contenido de Tabs */}
          {activeTab === 'mesas' && (
            <div className="mesas-grid-container">
              <MesasGrid 
                mesas={mesas} 
                onMesaClick={handleMesaClick} 
                loading={loading}
                error={error}
              />
            </div>
          )}
          
          {activeTab === 'mis-mesas' && (
            <div className="mesas-grid-container">
              <h3 style={{ marginBottom: '1.5rem', color: '#1e293b', fontSize: '1.5rem' }}>
                Mis Mesas Asignadas
              </h3>
              {myTables.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '3rem', 
                  color: '#64748b',
                  background: '#f8fafc',
                  borderRadius: '12px',
                  border: '2px dashed #cbd5e1'
                }}>
                  <p style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No tienes mesas asignadas</p>
                  <p>Ve a la pestaña "Mesas Disponibles" para tomar una mesa</p>
                </div>
              ) : (
                <div className="mesas-grid">
                  {myTables.map(mesa => (
                    <div key={mesa._id} className="mesa-card mia">
                      <div className="mesa-header">
                        <div className="mesa-number">Mesa {mesa.number}</div>
                        <div className={`mesa-status ${mesa.status}`}>
                          {mesa.status === 'libre' ? 'Libre' : 
                           mesa.status === 'assigned' ? 'Pendiente' :
                           mesa.status === 'ocupada' ? 'Ocupada' : 
                           mesa.status === 'limpiando' ? 'Limpiando' : mesa.status}
                        </div>
                      </div>
                      <div className="mesa-info">
                        <div className="mesa-capacity">
                          Capacidad: {mesa.capacity} personas
                        </div>
                        <div className="mesa-waiter">
                          Pedidos activos: {orderHistory.filter(o => 
                            o.tableId === mesa._id && 
                            !['delivered', 'cancelled'].includes(o.status)
                          ).length}
                        </div>
                      </div>
                      <div className="mesa-actions">
                        <button 
                          className="mesa-btn success"
                          onClick={() => handleTableAction(mesa, 'add-on')}
                          disabled={loading}
                        >
                          {loading ? <div className="loading-spinner"></div> : 'Añadir Items'}
                        </button>
                        {mesa.status === 'libre' && (
                          <button 
                            className="mesa-btn warning"
                            onClick={() => handleTableAction(mesa, 'ocupar')}
                            disabled={loading}
                          >
                            Marcar Ocupada
                          </button>
                        )}
                        {mesa.status === 'ocupada' && (
                          <button 
                            className="mesa-btn warning"
                            onClick={() => handleTableAction(mesa, 'limpiar')}
                            disabled={loading}
                          >
                            Marcar Limpiando
                          </button>
                        )}
                        <button 
                          className="mesa-btn primary"
                          onClick={() => handleTableAction(mesa, 'release')}
                          disabled={loading}
                        >
                          Liberar Mesa
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'historial' && (
            <div className="mesas-grid-container">
              <h3 style={{ marginBottom: '1.5rem', color: '#1e293b', fontSize: '1.5rem' }}>
                Historial de Pedidos
              </h3>
              <div style={{ display: 'grid', gap: '1rem' }}>
                {orderHistory.length === 0 ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '3rem', 
                    color: '#64748b',
                    background: '#f8fafc',
                    borderRadius: '12px',
                    border: '2px dashed #cbd5e1'
                  }}>
                    <p>No hay pedidos en el historial</p>
                  </div>
                ) : (
                  orderHistory.map(order => (
                    <div key={order._id} style={{
                      background: 'white',
                      padding: '1.5rem',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginBottom: '1rem'
                      }}>
                        <h4 style={{ margin: 0, color: '#1e293b' }}>Mesa {order.tableNumber || 'N/A'}</h4>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <span className={`mesa-status ${order.status}`}>
                            {order.status}
                          </span>
                          {order.isAddOn && (
                            <span style={{
                              background: '#3b82f6',
                              color: 'white',
                              padding: '0.25rem 0.75rem',
                              borderRadius: '20px',
                              fontSize: '0.75rem',
                              fontWeight: '600'
                            }}>
                              Añadido
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ color: '#64748b', fontSize: '0.875rem' }}>
                        <p style={{ margin: '0.5rem 0' }}>Total: ${order.total?.toFixed(2)}</p>
                        <p style={{ margin: '0.5rem 0' }}>Fecha: {new Date(order.createdAt).toLocaleDateString()}</p>
                        {order.items && order.items.length > 0 && (
                          <div style={{ marginTop: '1rem' }}>
                            <h5 style={{ margin: '0 0 0.5rem 0', color: '#1e293b' }}>Items:</h5>
                            {order.items.map((item, index) => (
                              <div key={index} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                padding: '0.25rem 0',
                                borderBottom: index < order.items.length - 1 ? '1px solid #f1f5f9' : 'none'
                              }}>
                                <span>{item.name} x{item.quantity}</span>
                                <span>${(item.price * item.quantity).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal para Nuevo Pedido */}
      {showOrderModal && selectedTable && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Nuevo Pedido - Mesa {selectedTable.number}</h3>
              <button className="btn-close" onClick={() => setShowOrderModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {/* Categorías de menú */}
              <div className="menu-categories">
                <button 
                  className={`category-btn ${!selectedCategory ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('')}
                >
                  Todos
                </button>
                {['Pollos', 'Bebidas', 'Acompañamientos', 'Postres'].map(category => (
                  <button 
                    key={category}
                    className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>

              <div className="modal-split">
                {/* Lista de items del menú */}
                <div className="menu-section">
                  <div className="menu-items-list">
                    {menuItems
                      .filter(item => !selectedCategory || item.category === selectedCategory)
                      .map(item => (
                      <div key={item._id} className="menu-item-card">
                        <div className="menu-item-info">
                          <div className="menu-item-name">{item.name}</div>
                          <div className="menu-item-description">{item.description}</div>
                          <div className="menu-item-price">${item.price}</div>
                        </div>
                        <div className="menu-item-actions">
                          <button 
                            className="add-item-btn"
                            onClick={() => addToOrder(item)}
                          >
                            Añadir
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Carrito/Pedido actual */}
                <div className="cart-section">
                  <div className="cart-preview">
                    <div className="cart-header">
                      <span>Pedido Actual</span>
                      <span className="cart-total">
                        ${currentOrder.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="cart-items">
                      {currentOrder.length === 0 ? (
                        <p style={{textAlign: 'center', color: '#6c757d', padding: '1rem'}}>
                          No hay items en el pedido
                        </p>
                      ) : (
                        currentOrder.map((item, index) => (
                          <div key={index} className="cart-item">
                            <div>
                              <div style={{fontWeight: '600'}}>{item.name}</div>
                              <div style={{fontSize: '0.85rem', color: '#6c757d'}}>
                                x{item.quantity} - ${(item.price * item.quantity).toFixed(2)}
                              </div>
                            </div>
                            <button 
                              className="btn-close"
                              onClick={() => removeFromOrder(index)}
                              style={{background: 'none', border: 'none', color: '#dc3545', fontSize: '1.2rem'}}
                            >
                              ×
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowOrderModal(false)}>
                Cancelar
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => submitOrder(false)}
                disabled={loading || currentOrder.length === 0}
              >
                {loading ? 'Enviando...' : 'Enviar Pedido'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Añadidos */}
      {showAddOnModal && selectedTable && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Añadir Items - Mesa {selectedTable.number}</h3>
              <button className="btn-close" onClick={() => setShowAddOnModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {/* Categorías de menú */}
              <div className="menu-categories">
                <button 
                  className={`category-btn ${!selectedCategory ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('')}
                >
                  Todos
                </button>
                {['Pollos', 'Bebidas', 'Acompañamientos', 'Postres'].map(category => (
                  <button 
                    key={category}
                    className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>

              <div className="modal-split">
                {/* Lista de items del menú */}
                <div className="menu-section">
                  <div className="menu-items-list">
                    {menuItems
                      .filter(item => !selectedCategory || item.category === selectedCategory)
                      .map(item => (
                      <div key={item._id} className="menu-item-card">
                        <div className="menu-item-info">
                          <div className="menu-item-name">{item.name}</div>
                          <div className="menu-item-description">{item.description}</div>
                          <div className="menu-item-price">${item.price}</div>
                        </div>
                        <div className="menu-item-actions">
                          <button 
                            className="add-item-btn"
                            onClick={() => addToOrder(item)}
                          >
                            Añadir
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Carrito/Items a añadir */}
                <div className="cart-section">
                  <div className="cart-preview">
                    <div className="cart-header">
                      <span>Items a Añadir</span>
                      <span className="cart-total">
                        ${currentOrder.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="cart-items">
                      {currentOrder.length === 0 ? (
                        <p style={{textAlign: 'center', color: '#6c757d', padding: '1rem'}}>
                          No hay items para añadir
                        </p>
                      ) : (
                        currentOrder.map((item, index) => (
                          <div key={index} className="cart-item">
                            <div>
                              <div style={{fontWeight: '600'}}>{item.name}</div>
                              <div style={{fontSize: '0.85rem', color: '#6c757d'}}>
                                x{item.quantity} - ${(item.price * item.quantity).toFixed(2)}
                              </div>
                            </div>
                            <button 
                              className="btn-close"
                              onClick={() => removeFromOrder(index)}
                              style={{background: 'none', border: 'none', color: '#dc3545', fontSize: '1.2rem'}}
                            >
                              ×
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddOnModal(false)}>
                Cancelar
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => submitOrder(true)}
                disabled={loading || currentOrder.length === 0}
              >
                {loading ? 'Añadiendo...' : 'Añadir Items'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Gestión de Mesa */}
      {showManageModal && selectedTable && (
        <div className="modal-overlay">
          <div className="modal modal-small">
            <div className="modal-header">
              <h3>Gestionar Mesa {selectedTable.number}</h3>
              <button className="btn-close" onClick={() => setShowManageModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="manage-options">
                <button 
                  className="manage-btn btn-secondary"
                  onClick={() => {
                    setShowManageModal(false);
                    setShowAddOnModal(true);
                  }}
                >
                  ➕ Agregar Añadido
                </button>
                
                <button 
                  className="manage-btn btn-warning"
                  onClick={() => changeTableStatus(selectedTable._id, 'limpiando')}
                >
                  🧹 Marcar Limpiando
                </button>
                
                <button 
                  className="manage-btn btn-danger"
                  onClick={() => releaseTable(selectedTable._id)}
                >
                  🚪 Liberar Mesa
                </button>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowManageModal(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MozoPage;

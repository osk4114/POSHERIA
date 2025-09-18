import React, { useState, useEffect } from 'react';
import api from '../../api';
import { connectSocket, onForceLogout, disconnectSocket } from '../../socket';
import { getUser, logout } from '../../auth';
import './MozoPage.css';

const MozoPage = () => {
  const user = getUser();
  const [activeTab, setActiveTab] = useState('mesas');
  const [mesas, setMesas] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [myTables, setMyTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [currentOrder, setCurrentOrder] = useState([]);
  const [orderHistory, setOrderHistory] = useState([]);
  const [addOnHistory, setAddOnHistory] = useState([]);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showAddOnModal, setShowAddOnModal] = useState(false);
  const [selectedParentOrder, setSelectedParentOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Socket connection useEffect
  useEffect(() => {
    if (user && user._id) {
      const socket = connectSocket(user._id);
      onForceLogout(() => {
        logout(() => window.location.reload());
      });
      
      if (socket) {
        socket.on('disconnect', () => {
          console.log('Socket disconnected');
        });
        
        socket.on('tableUpdated', (updatedTable) => {
          setMesas(prevMesas => 
            prevMesas.map(mesa => 
              mesa._id === updatedTable._id ? updatedTable : mesa
            )
          );
          setMyTables(prevTables => 
            prevTables.map(mesa => 
              mesa._id === updatedTable._id ? updatedTable : mesa
            )
          );
        });

        socket.on('newOrder', (newOrder) => {
          if (newOrder.table && myTables.some(t => t._id === newOrder.table)) {
            fetchOrderHistory();
          }
        });
      }
    }
    
    return () => disconnectSocket();
  }, [user, myTables]);

  // Data fetching useEffect
  useEffect(() => {
    fetchTables();
    fetchMenu();
    fetchMyTables();
    fetchOrderHistory();
  }, [user]);

  const fetchTables = async () => {
    try {
      const response = await api.get('/api/tables');
      setMesas(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Error fetching tables:', err);
    }
  };

  const fetchMenu = async () => {
    try {
      const response = await api.get('/api/menu');
      setMenuItems(Array.isArray(response.data) ? response.data.filter(item => item.available) : []);
    } catch (err) {
      console.error('Error fetching menu:', err);
    }
  };

  const fetchMyTables = async () => {
    try {
      const response = await api.get('/api/tables');
      const tables = Array.isArray(response.data) ? response.data : [];
      const assignedTables = tables.filter(table => 
        table.waiterId === user._id && table.waiterStatus === 'atendiendo'
      );
      setMyTables(assignedTables);
    } catch (err) {
      console.error('Error fetching my tables:', err);
    }
  };

  const fetchOrderHistory = async () => {
    try {
      const response = await api.get('/api/orders');
      const orders = Array.isArray(response.data) ? response.data : [];
      
      const myTableIds = myTables.map(t => t._id);
      const myOrders = orders.filter(order => 
        order.table && myTableIds.includes(order.table)
      );
      
      const mainOrders = myOrders.filter(order => order.type !== 'add-on');
      const addOns = myOrders.filter(order => order.type === 'add-on');
      
      setOrderHistory(mainOrders);
      setAddOnHistory(addOns);
    } catch (err) {
      console.error('Error fetching order history:', err);
    }
  };

  const takeTable = async (tableId) => {
    try {
      setLoading(true);
      await api.post(`/api/tables/${tableId}/asignar`);
      setSuccess('Mesa asignada correctamente');
      fetchTables();
      fetchMyTables();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al tomar la mesa');
    } finally {
      setLoading(false);
    }
  };

  const releaseTable = async (tableId) => {
    if (!window.confirm('¿Estás seguro de liberar esta mesa?')) {
      return;
    }
    
    try {
      setLoading(true);
      await api.post(`/api/tables/${tableId}/liberar`);
      setSuccess('Mesa liberada correctamente');
      fetchTables();
      fetchMyTables();
      
      if (selectedTable && selectedTable._id === tableId) {
        setSelectedTable(null);
        setCurrentOrder([]);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al liberar la mesa');
    } finally {
      setLoading(false);
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

  const calculateTotal = () => {
    return currentOrder.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const submitOrder = async (isAddOn = false) => {
    if (!selectedTable || currentOrder.length === 0) {
      setError('Selecciona una mesa y agrega productos');
      return;
    }

    try {
      setLoading(true);
      
      const orderData = {
        products: currentOrder.map(item => ({
          productId: item._id,
          name: item.name,
          quantity: item.quantity,
          price: item.price
        })),
        table: selectedTable._id,
        type: isAddOn ? 'add-on' : 'dine-in'
      };

      if (isAddOn && selectedParentOrder) {
        orderData.parentOrderId = selectedParentOrder._id;
      }

      const endpoint = isAddOn ? '/api/orders/addon' : '/api/orders';
      await api.post(endpoint, orderData);
      
      setSuccess(isAddOn ? 'Añadido creado correctamente' : 'Pedido creado correctamente');
      setCurrentOrder([]);
      setShowOrderModal(false);
      setShowAddOnModal(false);
      setSelectedParentOrder(null);
      fetchOrderHistory();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al crear el pedido');
    } finally {
      setLoading(false);
    }
  };

  const getTableStatus = (table) => {
    if (table.waiterId === user._id) {
      return 'mine';
    } else if (table.waiterId) {
      return 'taken';
    } else {
      return 'free';
    }
  };

  if (!user || user.role !== 'mozo') {
    return (
      <div className="access-denied">
        <h2>Acceso Denegado</h2>
        <p>Debes iniciar sesión como mozo.</p>
      </div>
    );
  }

  return (
    <div className="mozo-page">
      <div className="page-header">
        <h1>Panel del Mozo</h1>
        <div className="user-info">
          <span>Bienvenido, {user.name}</span>
          <button className="btn btn-secondary" onClick={() => logout(() => window.location.reload())}>
            Cerrar Sesión
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}
      {success && (
        <div className="alert alert-success">
          {success}
          <button onClick={() => setSuccess(null)}>×</button>
        </div>
      )}

      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'mesas' ? 'active' : ''}`}
          onClick={() => setActiveTab('mesas')}
        >
          Mesas Disponibles
        </button>
        <button 
          className={`tab ${activeTab === 'mis-mesas' ? 'active' : ''}`}
          onClick={() => setActiveTab('mis-mesas')}
        >
          Mis Mesas
        </button>
        <button 
          className={`tab ${activeTab === 'historial' ? 'active' : ''}`}
          onClick={() => setActiveTab('historial')}
        >
          Historial
        </button>
      </div>

      {activeTab === 'mesas' && (
        <div className="tables-section">
          <h3>Mesas Disponibles</h3>
          <div className="tables-grid">
            {mesas.map(mesa => {
              const status = getTableStatus(mesa);
              return (
                <div key={mesa._id} className={`table-card ${status}`}>
                  <div className="table-header">
                    <h4>Mesa {mesa.number}</h4>
                    <span className={`status-badge ${status}`}>
                      {status === 'mine' ? 'Mía' : 
                       status === 'taken' ? 'Ocupada' : 'Libre'}
                    </span>
                  </div>
                  <div className="table-actions">
                    {status === 'free' && (
                      <button 
                        className="btn btn-primary"
                        onClick={() => takeTable(mesa._id)}
                        disabled={loading}
                      >
                        Tomar Mesa
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'mis-mesas' && (
        <div className="my-tables-section">
          <h3>Mis Mesas Asignadas</h3>
          {myTables.length === 0 ? (
            <div className="empty-state">
              <p>No tienes mesas asignadas</p>
              <p>Ve a la pestaña "Mesas Disponibles" para tomar una mesa</p>
            </div>
          ) : (
            <div className="tables-grid">
              {myTables.map(mesa => (
                <div key={mesa._id} className="table-card mine">
                  <div className="table-header">
                    <h4>Mesa {mesa.number}</h4>
                    <span className="status-badge mine">Mía</span>
                  </div>
                  <div className="table-info">
                    <p>Estado: {mesa.status}</p>
                    <p>Pedidos activos: {orderHistory.filter(o => o.table === mesa._id && o.status !== 'delivered').length}</p>
                  </div>
                  <div className="table-actions">
                    <button 
                      className="btn btn-primary"
                      onClick={() => {
                        setSelectedTable(mesa);
                        setShowOrderModal(true);
                      }}
                    >
                      Crear Pedido
                    </button>
                    <button 
                      className="btn btn-outline"
                      onClick={() => {
                        setSelectedTable(mesa);
                        setShowAddOnModal(true);
                      }}
                    >
                      Añadir Items
                    </button>
                    <button 
                      className="btn btn-danger"
                      onClick={() => releaseTable(mesa._id)}
                    >
                      Liberar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'historial' && (
        <div className="history-section">
          <h3>Historial de Pedidos</h3>
          {orderHistory.length === 0 ? (
            <div className="empty-state">
              <p>No hay pedidos registrados</p>
              <p>Crea tu primer pedido desde "Mis Mesas"</p>
            </div>
          ) : (
            <div className="orders-list">
              {orderHistory.map(order => {
                const relatedAddOns = addOnHistory.filter(addon => addon.parentOrderId === order._id);
                return (
                  <div key={order._id} className={`order-item ${order.status}`}>
                    <div className="order-header">
                      <h4>Mesa {order.table} - {order.status}</h4>
                      <span className="order-total">
                        S/. {order.products.reduce((total, p) => total + (p.price * p.quantity), 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="order-products">
                      {order.products.map((product, index) => (
                        <div key={index} className="product-line">
                          {product.quantity}x {product.name} - S/. {(product.price * product.quantity).toFixed(2)}
                        </div>
                      ))}
                    </div>
                    {relatedAddOns.length > 0 && (
                      <div className="add-ons-section">
                        <h5>Añadidos ({relatedAddOns.length})</h5>
                        {relatedAddOns.map(addon => (
                          <div key={addon._id} className="addon-item">
                            {addon.products.map((product, index) => (
                              <div key={index} className="product-line addon">
                                + {product.quantity}x {product.name} - S/. {(product.price * product.quantity).toFixed(2)}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="order-footer">
                      <small>
                        Creado: {new Date(order.createdAt).toLocaleString()}
                      </small>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal Crear Pedido */}
      {showOrderModal && (
        <div className="modal">
          <div className="modal-content large">
            <div className="modal-header">
              <h3>Crear Pedido - Mesa {selectedTable?.number}</h3>
              <button className="close-btn" onClick={() => setShowOrderModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="order-creation">
                <div className="menu-section">
                  <h4>Menú Disponible</h4>
                  {menuItems.length === 0 ? (
                    <p>No hay productos disponibles en el menú</p>
                  ) : (
                    <div className="menu-grid">
                      {menuItems.map(item => (
                        <div key={item._id} className="menu-item">
                          <h5>{item.name}</h5>
                          <p className="price">S/. {item.price.toFixed(2)}</p>
                          {item.description && <p className="description">{item.description}</p>}
                          <button 
                            className="btn btn-sm btn-primary"
                            onClick={() => addToOrder(item)}
                          >
                            Agregar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="order-section">
                  <h4>Pedido Actual</h4>
                  {currentOrder.length === 0 ? (
                    <p>No hay productos en el pedido</p>
                  ) : (
                    <>
                      <div className="order-items">
                        {currentOrder.map(item => (
                          <div key={item._id} className="order-item-line">
                            <span className="item-name">{item.name}</span>
                            <div className="quantity-controls">
                              <button onClick={() => updateQuantity(item._id, item.quantity - 1)}>-</button>
                              <span>{item.quantity}</span>
                              <button onClick={() => updateQuantity(item._id, item.quantity + 1)}>+</button>
                            </div>
                            <span className="item-total">S/. {(item.price * item.quantity).toFixed(2)}</span>
                            <button 
                              className="btn btn-sm btn-danger"
                              onClick={() => removeFromOrder(item._id)}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="order-total-line">
                        <strong>Total: S/. {calculateTotal().toFixed(2)}</strong>
                      </div>
                    </>
                  )}
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
                {loading ? 'Creando...' : 'Crear Pedido'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Añadir Items */}
      {showAddOnModal && (
        <div className="modal">
          <div className="modal-content large">
            <div className="modal-header">
              <h3>Añadir Items - Mesa {selectedTable?.number}</h3>
              <button className="close-btn" onClick={() => setShowAddOnModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="parent-order-selection">
                <h4>Seleccionar Pedido Principal</h4>
                {orderHistory
                  .filter(order => order.table === selectedTable?._id && order.status !== 'delivered')
                  .length === 0 ? (
                  <p>No hay pedidos activos para esta mesa</p>
                ) : (
                  <div className="parent-orders">
                    {orderHistory
                      .filter(order => order.table === selectedTable?._id && order.status !== 'delivered')
                      .map(order => (
                        <div 
                          key={order._id} 
                          className={`parent-order ${selectedParentOrder?._id === order._id ? 'selected' : ''}`}
                          onClick={() => setSelectedParentOrder(order)}
                        >
                          <h5>Pedido #{order._id.slice(-6)}</h5>
                          <p>Estado: {order.status}</p>
                          <p>Items: {order.products.length}</p>
                          <p>Total: S/. {order.products.reduce((total, p) => total + (p.price * p.quantity), 0).toFixed(2)}</p>
                        </div>
                      ))}
                  </div>
                )}
              </div>
              
              {selectedParentOrder && (
                <div className="order-creation">
                  <div className="menu-section">
                    <h4>Menú Disponible</h4>
                    <div className="menu-grid">
                      {menuItems.map(item => (
                        <div key={item._id} className="menu-item">
                          <h5>{item.name}</h5>
                          <p className="price">S/. {item.price.toFixed(2)}</p>
                          <button 
                            className="btn btn-sm btn-primary"
                            onClick={() => addToOrder(item)}
                          >
                            Agregar
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="order-section">
                    <h4>Items a Añadir</h4>
                    {currentOrder.length === 0 ? (
                      <p>No hay productos seleccionados</p>
                    ) : (
                      <>
                        <div className="order-items">
                          {currentOrder.map(item => (
                            <div key={item._id} className="order-item-line">
                              <span className="item-name">{item.name}</span>
                              <div className="quantity-controls">
                                <button onClick={() => updateQuantity(item._id, item.quantity - 1)}>-</button>
                                <span>{item.quantity}</span>
                                <button onClick={() => updateQuantity(item._id, item.quantity + 1)}>+</button>
                              </div>
                              <span className="item-total">S/. {(item.price * item.quantity).toFixed(2)}</span>
                              <button 
                                className="btn btn-sm btn-danger"
                                onClick={() => removeFromOrder(item._id)}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="order-total-line">
                          <strong>Total Añadido: S/. {calculateTotal().toFixed(2)}</strong>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddOnModal(false)}>
                Cancelar
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => submitOrder(true)}
                disabled={loading || currentOrder.length === 0 || !selectedParentOrder}
              >
                {loading ? 'Añadiendo...' : 'Añadir Items'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MozoPage;
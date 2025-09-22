import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api';
import { getUser, logout } from '../../auth';
import { connectSocket, onForceLogout } from '../../socket';
import './CajaPage.css';

const CajaPage = () => {
  console.log('💰 [FRONTEND] CajaPage: Componente montado');
  
  const [user, setUser] = useState(null);
  const [socketError, setSocketError] = useState(null);
  const [activeSection, setActiveSection] = useState('ventas');
  
  // Estados para Caja
  const [cajaInfo, setCajaInfo] = useState(null);
  const [confirmandoMonto, setConfirmandoMonto] = useState(false);
  const [montoConfirmacion, setMontoConfirmacion] = useState('');
  const [nuevoMovimiento, setNuevoMovimiento] = useState({
    type: 'ingreso',
    amount: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  
  // Estados para pedidos y ventas
  const [pedidos, setPedidos] = useState([]);
  const [mesas, setMesas] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedMesa, setSelectedMesa] = useState(null);
  const [currentOrder, setCurrentOrder] = useState([]);
  const [total, setTotal] = useState(0);
  
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Socket connection y inicialización de usuario
  useEffect(() => {
    console.log('🔌 [FRONTEND] CajaPage: Configurando conexión socket...');
    const currentUser = getUser();
    setUser(currentUser);
    console.log('👤 [FRONTEND] CajaPage: Usuario actual:', currentUser);
    
    if (currentUser && currentUser._id) {
      console.log('🔌 [FRONTEND] CajaPage: Conectando socket para usuario:', currentUser._id);
      const socket = connectSocket(currentUser._id);
      onForceLogout(() => {
        console.log('⚠️ [FRONTEND] CajaPage: Force logout recibido');
        logout(() => window.location.reload());
      });
      if (socket) {
        socket.on('disconnect', () => {
          console.log('❌ [FRONTEND] CajaPage: Socket desconectado - CERRANDO SESIÓN');
          setSocketError('Conexión perdida con el servidor. Tu sesión ha sido cerrada.');
          logout(() => window.location.reload());
        });
        
        // Escuchar actualizaciones de pedidos
        socket.on('orderUpdated', (order) => {
          console.log('📦 [FRONTEND] CajaPage: Pedido actualizado:', order);
          setPedidos(prevPedidos => 
            prevPedidos.map(p => p._id === order._id ? order : p)
          );
        });
      }
    } else {
      console.log('❌ [FRONTEND] CajaPage: No hay usuario para conectar socket');
    }
    // No desconectar socket al desmontar - mantener conexión activa
  }, []); // ← DEPENDENCIAS VACÍAS para ejecutar solo una vez

  // Función para cargar información de la caja del usuario
  const fetchCajaInfo = useCallback(async () => {
    if (!user || !user._id) return;
    
    console.log('🔄 [FRONTEND] fetchCajaInfo: Iniciando carga para usuario:', user._id, user.name);
    setLoading(true);
    
    try {
      const res = await api.get('/api/caja/estado');
      setCajaInfo(res.data);
      console.log('📦 [FRONTEND] Caja cargada exitosamente:', res.data);
    } catch (err) {
      console.log('❌ [FRONTEND] Error al cargar caja:', err.response?.status, err.response?.data);
      if (err.response?.status === 404) {
        setCajaInfo(null);
        console.log('ℹ️ [FRONTEND] No hay caja asignada para este usuario');
      } else {
        setError('Error al cargar información de caja');
        console.error('Error al cargar caja:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Función para cargar datos iniciales
  const fetchInitialData = useCallback(async () => {
    try {
      const [mesasRes, menuRes, pedidosRes] = await Promise.all([
        api.get('/api/tables'),
        api.get('/api/menu'),
        api.get('/api/orders')
      ]);
      
      setMesas(Array.isArray(mesasRes.data) ? mesasRes.data : []);
      setMenuItems(Array.isArray(menuRes.data) ? menuRes.data : []);
      setPedidos(Array.isArray(pedidosRes.data) ? pedidosRes.data.filter(p => p.status !== 'pagado') : []);
    } catch (err) {
      console.error('Error al cargar datos iniciales:', err);
      setError('Error al cargar datos iniciales');
      setMesas([]);
      setMenuItems([]);
      setPedidos([]);
    }
  }, []);

  // Cargar información de caja y datos iniciales (solo carga inicial)
  useEffect(() => {
    console.log('📊 CajaPage: Verificando si debe cargar información de caja...');
    if (user && (user.role === 'caja' || user.role === 'admin')) {
      console.log('✅ CajaPage: Usuario autorizado, cargando información de caja...');
      
      // Solo carga inicial, sin intervalos
      fetchCajaInfo();
      fetchInitialData();
    } else {
      console.log('❌ CajaPage: Usuario no autorizado:', user);
    }
  }, [user, fetchCajaInfo, fetchInitialData]);

  // Calcular total cuando cambie el pedido actual
  useEffect(() => {
    const newTotal = currentOrder.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    setTotal(newTotal);
  }, [currentOrder]);

  // Verificar acceso
  if (!user || (user.role !== 'caja' && user.role !== 'admin')) {
    console.log('🚫 CajaPage: Acceso denegado');
    console.log('👤 CajaPage: Usuario:', user);
    console.log('🔑 CajaPage: Rol requerido: caja o admin');
    return (
      <div className="access-denied">
        <h2>Acceso Denegado</h2>
        <p>Debes iniciar sesión como cajero o administrador.</p>
      </div>
    );
  }

  console.log('✅ CajaPage: Acceso autorizado, renderizando componente...');

  // Función para confirmar monto inicial
  const confirmarMonto = async () => {
    if (!montoConfirmacion || parseFloat(montoConfirmacion) !== cajaInfo.initialAmount) {
      setError('El monto debe coincidir con el monto inicial asignado');
      return;
    }
    
    setLoading(true);
    try {
      await api.post('/api/caja/confirmar', {
        cajaId: cajaInfo._id,
        confirmedAmount: parseFloat(montoConfirmacion)
      });
      setSuccess('Caja confirmada correctamente');
      setConfirmandoMonto(false);
      setMontoConfirmacion('');
      
      // Recarga inmediata después de confirmar (encapsulación simple)
      fetchCajaInfo();
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al confirmar caja');
    } finally {
      setLoading(false);
    }
  };

  // Función para registrar movimiento
  const registrarMovimiento = async (e) => {
    e.preventDefault();
    if (!nuevoMovimiento.amount || !nuevoMovimiento.description) {
      setError('Debe completar todos los campos del movimiento');
      return;
    }
    
    setLoading(true);
    try {
      await api.post('/api/caja/movimiento', {
        cajaId: cajaInfo._id,
        type: nuevoMovimiento.type,
        amount: parseFloat(nuevoMovimiento.amount),
        description: nuevoMovimiento.description
      });
      setSuccess(`${nuevoMovimiento.type === 'ingreso' ? 'Ingreso' : 'Egreso'} registrado correctamente`);
      setNuevoMovimiento({ type: 'ingreso', amount: '', description: '' });
      
      // Recarga inmediata después de registrar movimiento (encapsulación simple)
      fetchCajaInfo();
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al registrar movimiento');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('es-AR');
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

      await api.post('/api/orders', orderData);
      
      // Actualizar estado de la mesa
      await api.put(`/api/tables/${selectedMesa._id}`, { status: 'disponible' });
      
      // Registrar movimiento en caja si es pago en efectivo
      if (paymentMethod === 'efectivo' && cajaInfo && cajaInfo.confirmed) {
        await api.post('/api/caja/movimiento', {
          cajaId: cajaInfo._id,
          type: 'ingreso',
          amount: total,
          description: `Venta Mesa ${selectedMesa.number} - ${paymentMethod}`
        });
      }
      
      // Limpiar pedido actual
      setCurrentOrder([]);
      setSelectedMesa(null);
      setTotal(0);
      
      setSuccess(`Pago procesado correctamente - Total: ${formatCurrency(total)}`);
      
      // Recarga inmediata después de procesar pago (encapsulación simple)
      fetchInitialData();
      fetchCajaInfo();
    } catch (err) {
      setError('Error al procesar el pago');
    }
  };

  // Recarga manual de datos (encapsulamiento simple)
  const handleManualReload = () => {
    fetchCajaInfo();
    fetchInitialData();
    setSuccess('Datos actualizados');
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
          <div className="caja-header-controls">
            <div className="caja-status">
              <span className={`caja-status-indicator ${cajaInfo?.status === 'open' && cajaInfo?.confirmed ? 'open' : 'closed'}`}>
                {cajaInfo?.status === 'open' && cajaInfo?.confirmed ? '🟢 Caja Abierta' : '🔴 Caja Cerrada'}
              </span>
              <span className="caja-amount">{cajaInfo ? formatCurrency(cajaInfo.totalAmount || cajaInfo.initialAmount) : 'S/ 0.00'}</span>
            </div>
            <div className="manual-update-control">
              <button 
                onClick={handleManualReload}
                className="manual-update-btn"
                title="Actualizar datos manualmente"
              >
                🔄 Actualizar
              </button>
            </div>
          </div>
        </div>

        {/* Mensajes de estado */}
        {error && (
            <div className="caja-error-msg">
              {error}
              <button onClick={() => setError(null)}>×</button>
            </div>
        )}
        {success && (
          <div className="caja-success-msg">
            {success}
            <button onClick={() => setSuccess(null)}>×</button>
          </div>
        )}
  {loading && <div className="loading-message">Cargando...</div>}
  {socketError && <div className="caja-error-msg">{socketError}</div>}

        {/* Sección de Ventas */}
        {activeSection === 'ventas' && (
          <div className="caja-sales-section">
            {!cajaInfo || !cajaInfo.confirmed ? (
              <div className="section-disabled">
                <div className="no-caja-assigned">
                  <div className="no-caja-icon">📪</div>
                  <h3>Caja no disponible para ventas</h3>
                  <p>
                    {!cajaInfo 
                      ? 'No tienes una caja asignada. Espera a que un administrador te asigne una caja.'
                      : 'Debes confirmar el monto inicial de la caja antes de realizar ventas.'
                    }
                  </p>
                </div>
              </div>
            ) : (
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
                          <span className="menu-item-price">{formatCurrency(item.price)}</span>
                          <button 
                            className="caja-btn caja-btn-success"
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
                      {mesas.filter(m => m.status === 'free').map(mesa => (
                        <option key={mesa._id} value={mesa._id}>
                          Mesa {mesa.number} (libre)
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
                            <span className="order-item-price">{formatCurrency(item.price)}</span>
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
                      Total: <strong>{formatCurrency(total)}</strong>
                    </div>
                    <div className="payment-buttons">
                      <button 
                        className="caja-btn caja-btn-primary"
                        onClick={() => processPayment('efectivo')}
                        disabled={currentOrder.length === 0}
                      >
                        💵 Efectivo
                      </button>
                      <button 
                        className="caja-btn caja-btn-primary"
                        onClick={() => processPayment('tarjeta')}
                        disabled={currentOrder.length === 0}
                      >
                        💳 Tarjeta
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sección Control de Caja */}
        {activeSection === 'caja' && (
          <div className="caja-control-section">
            {!cajaInfo ? (
              <div className="no-caja-assigned">
                <div className="no-caja-icon">📪</div>
                <h3>No tienes una caja asignada</h3>
                <p>Espera a que un administrador te asigne una caja para comenzar tu turno.</p>
              </div>
            ) : !cajaInfo.confirmed ? (
              <div className="caja-confirmation">
                <div className="confirmation-card">
                  <h3>� Confirmar Apertura de Caja</h3>
                  <div className="caja-details">
                    <p><strong>Caja ID:</strong> #{cajaInfo._id.slice(-6)}</p>
                    <p><strong>Monto Inicial Asignado:</strong> {formatCurrency(cajaInfo.initialAmount)}</p>
                    <p><strong>Asignada:</strong> {formatDate(cajaInfo.openedAt)}</p>
                  </div>
                  
                  <div className="confirmation-form">
                    <label>
                      Confirma el monto inicial en efectivo:
                      <input
                        type="number"
                        step="0.01"
                        value={montoConfirmacion}
                        onChange={(e) => setMontoConfirmacion(e.target.value)}
                        placeholder={`Ingresa ${cajaInfo.initialAmount}`}
                        required
                      />
                    </label>
                    <div className="confirmation-actions">
                      <button 
                        onClick={confirmarMonto} 
                        className="caja-btn caja-btn-primary"
                        disabled={loading}
                      >
                        Confirmar y Abrir Caja
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="caja-info-grid">
                <div className="caja-info-card">
                  <h3>💰 Estado de Caja</h3>
                  <div className="caja-details">
                    <p><strong>Estado:</strong> Confirmada y Activa</p>
                    <p><strong>Monto Inicial:</strong> {formatCurrency(cajaInfo.initialAmount)}</p>
                    <p><strong>Total Actual:</strong> {formatCurrency(cajaInfo.totalAmount || cajaInfo.initialAmount)}</p>
                    <p><strong>Movimientos:</strong> {cajaInfo.movements?.length || 0}</p>
                    <p><strong>Abierta:</strong> {formatDate(cajaInfo.openedAt)}</p>
                  </div>
                </div>

                <div className="caja-info-card">
                  <h3>� Registrar Movimiento</h3>
                  <form onSubmit={registrarMovimiento} className="movimiento-form">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Tipo:</label>
                        <select 
                          value={nuevoMovimiento.type}
                          onChange={(e) => setNuevoMovimiento({...nuevoMovimiento, type: e.target.value})}
                        >
                          <option value="ingreso">💰 Ingreso</option>
                          <option value="egreso">💸 Egreso</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Monto:</label>
                        <input 
                          type="number"
                          step="0.01"
                          min="0"
                          value={nuevoMovimiento.amount}
                          onChange={(e) => setNuevoMovimiento({...nuevoMovimiento, amount: e.target.value})}
                          placeholder="0.00"
                          required
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Descripción:</label>
                      <input 
                        type="text"
                        value={nuevoMovimiento.description}
                        onChange={(e) => setNuevoMovimiento({...nuevoMovimiento, description: e.target.value})}
                        placeholder="Ej: Venta, Cambio, Gastos varios..."
                        required
                      />
                    </div>
                    <button type="submit" className="caja-btn caja-btn-primary" disabled={loading}>
                      Registrar Movimiento
                    </button>
                  </form>
                </div>

                {/* Últimos movimientos */}
                {cajaInfo.movements && cajaInfo.movements.length > 0 && (
                  <div className="caja-info-card recent-movements">
                    <h3>📋 Últimos Movimientos</h3>
                    <div className="movements-list">
                      {cajaInfo.movements.slice(-5).reverse().map((mov, index) => (
                        <div key={index} className={`movement-item ${mov.type}`}>
                          <div className="movement-info">
                            <span className="movement-desc">{mov.description}</span>
                            <span className="movement-date">{formatDate(mov.date)}</span>
                          </div>
                          <span className={`movement-amount ${mov.type}`}>
                            {mov.type === 'ingreso' ? '+' : '-'}{formatCurrency(mov.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
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

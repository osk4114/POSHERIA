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
  const [montoConfirmacion, setMontoConfirmacion] = useState('');
  const [nuevoMovimiento, setNuevoMovimiento] = useState({
    type: 'ingreso',
    amount: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [movimientoLoading, setMovimientoLoading] = useState(false);
  const [confirmacionLoading, setConfirmacionLoading] = useState(false);
  const [declinarLoading, setDeclinarLoading] = useState(false);
  const [mostrarDeclinar, setMostrarDeclinar] = useState(false);
  const [razonDeclinar, setRazonDeclinar] = useState('');
  
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
        
        // Escuchar actualizaciones de mesas en tiempo real
        socket.on('tableUpdated', (data) => {
          console.log('🪑 [FRONTEND] CajaPage: Mesa actualizada:', data);
          
          if (data.action === 'created') {
            setMesas(prevMesas => [...prevMesas, data.table]);
          } else if (data.action === 'updated') {
            setMesas(prevMesas => 
              prevMesas.map(m => m._id === data.table._id ? data.table : m)
            );
          } else if (data.action === 'deleted') {
            setMesas(prevMesas => 
              prevMesas.filter(m => m._id !== data.tableId)
            );
          }
          
          // Mensaje informativo para el usuario
          if (data.action === 'liberated') {
            setSuccess('Mesa liberada - disponible para nuevos pedidos');
            setTimeout(() => setSuccess(null), 3000);
          }
        });
        
        // Escuchar actualizaciones de caja en tiempo real
        socket.on('cajaUpdated', (data) => {
          console.log('💰 [FRONTEND] CajaPage: Caja actualizada:', data);
          
          if (data.action === 'opened') {
            // Si es la caja del usuario actual, recargar datos
            if (data.caja && data.caja.assignedTo === currentUser._id) {
              fetchCajaInfo();
              setSuccess('Nueva caja abierta - actualizando datos...');
              setTimeout(() => setSuccess(null), 3000);
            }
          } else if (data.action === 'closed') {
            // Si es la caja del usuario actual, recargar datos
            if (data.caja && data.caja.assignedTo === currentUser._id) {
              fetchCajaInfo();
              setError('Tu caja ha sido cerrada por un administrador');
              setTimeout(() => setError(null), 5000);
            }
          } else if (data.action === 'confirmed') {
            // Si es la caja del usuario actual, recargar datos
            if (data.caja && data.caja.assignedTo === currentUser._id) {
              fetchCajaInfo();
              setSuccess('Caja confirmada y lista para usar');
              setTimeout(() => setSuccess(null), 3000);
            }
          } else if (data.action === 'declined') {
            // Si es la caja del usuario actual, recargar datos
            if (data.caja && data.caja.assignedTo === currentUser._id) {
              fetchCajaInfo();
              setSuccess('Caja declinada exitosamente - Se ha notificado al administrador');
              setTimeout(() => setSuccess(null), 5000);
            }
          } else if (data.action === 'movementAdded') {
            // Si es la caja del usuario actual, recargar datos
            if (data.caja && data.caja.assignedTo === currentUser._id) {
              fetchCajaInfo();
              setSuccess(`✅ ${data.message} - Datos actualizados`);
              setTimeout(() => setSuccess(null), 3000);
            }
          }
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
      console.log('📦 [FRONTEND] fetchCajaInfo: Caja cargada exitosamente:', res.data);
    } catch (err) {
      console.log('❌ [FRONTEND] fetchCajaInfo: Error al cargar caja:', err.response?.status, err.response?.data);
      if (err.response?.status === 404) {
        console.log('ℹ️ [FRONTEND] fetchCajaInfo: No hay caja asignada - actualizando cajaInfo a null');
        setCajaInfo(null);
        console.log('ℹ️ [FRONTEND] fetchCajaInfo: cajaInfo actualizado a null');
      } else {
        setError('Error al cargar información de caja');
        console.error('Error al cargar caja:', err);
      }
    } finally {
      setLoading(false);
      console.log('✅ [FRONTEND] fetchCajaInfo: Proceso completado');
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
  // Función para confirmar monto de caja con encapsulamiento completo
  const confirmarMonto = async () => {
    if (!montoConfirmacion || parseFloat(montoConfirmacion) !== cajaInfo.initialAmount) {
      setError('El monto debe coincidir con el monto inicial asignado');
      return;
    }
    
    setConfirmacionLoading(true);
    setError(null);
    setSuccess(null);
    
    console.log('💰 [FRONTEND] Confirmando monto de caja:', {
      cajaId: cajaInfo._id,
      montoConfirmacion: parseFloat(montoConfirmacion),
      montoEsperado: cajaInfo.initialAmount
    });
    
    try {
      // 1. Confirmar la caja
      const response = await api.post('/api/caja/confirmar', {
        cajaId: cajaInfo._id,
        confirmedAmount: parseFloat(montoConfirmacion)
      });
      
      console.log('✅ [FRONTEND] Caja confirmada exitosamente:', response.data);
      
      // 2. Limpiar formulario inmediatamente
      setMontoConfirmacion('');
      
      // 3. Recargar todos los datos en paralelo para sincronización completa
      console.log('🔄 [FRONTEND] Recargando todos los datos después de confirmar caja...');
      await Promise.all([
        fetchCajaInfo(),
        fetchInitialData()
      ]);
      
      setSuccess('✅ Caja confirmada correctamente - Datos actualizados');
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err) {
      console.error('❌ [FRONTEND] Error al confirmar caja:', err);
      const errorMessage = err?.response?.data?.message || 'Error al confirmar caja';
      setError(`❌ ${errorMessage}`);
      
      // Limpiar error después de 5 segundos
      setTimeout(() => setError(null), 5000);
    } finally {
      setConfirmacionLoading(false);
    }
  };

  // Función para declinar caja asignada con encapsulamiento completo
  const declinarCaja = async () => {
    if (!razonDeclinar.trim()) {
      setError('Debe proporcionar una razón para declinar la caja');
      return;
    }
    
    setDeclinarLoading(true);
    setError(null);
    setSuccess(null);
    
    console.log('❌ [FRONTEND] DECLINAR - Iniciando declinación de caja:', {
      cajaId: cajaInfo._id,
      razon: razonDeclinar,
      montoAsignado: cajaInfo.initialAmount
    });
    
    try {
      // 1. Declinar la caja
      console.log('❌ [FRONTEND] DECLINAR - Paso 1: Enviando solicitud de declinación...');
      const response = await api.post('/api/caja/declinar', {
        cajaId: cajaInfo._id,
        razon: razonDeclinar
      });
      
      console.log('✅ [FRONTEND] DECLINAR - Paso 1 completado. Respuesta del servidor:', response.data);
      
      // 2. Limpiar formularios inmediatamente
      console.log('🔄 [FRONTEND] DECLINAR - Paso 2: Limpiando formularios...');
      setRazonDeclinar('');
      setMostrarDeclinar(false);
      setMontoConfirmacion('');
      
      // 3. Recargar todos los datos en paralelo para sincronización completa
      console.log('🔄 [FRONTEND] DECLINAR - Paso 3: Iniciando recarga de datos...');
      await Promise.all([
        fetchCajaInfo(),        // Esto debe detectar que ya no hay caja asignada
        fetchInitialData()      // Recargar mesas, menu, pedidos
      ]);
      
      console.log('✅ [FRONTEND] DECLINAR - Paso 3 completado. Datos recargados exitosamente');
      
      // 4. Pequeño delay para asegurar que React actualice el estado
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('✅ [FRONTEND] DECLINAR - Proceso completo exitoso. La interfaz debería actualizarse ahora.');
      
      setSuccess('✅ Caja declinada exitosamente - Se ha notificado al administrador');
      
      // Limpiar mensaje después de 5 segundos
      setTimeout(() => setSuccess(null), 5000);
      
    } catch (err) {
      console.error('❌ [FRONTEND] DECLINAR - Error en el proceso:', err);
      const errorMessage = err?.response?.data?.message || 'Error al declinar caja';
      setError(`❌ ${errorMessage}`);
      
      // Limpiar error después de 5 segundos
      setTimeout(() => setError(null), 5000);
    } finally {
      setDeclinarLoading(false);
    }
  };

  // Función para registrar movimiento con encapsulamiento completo
  const registrarMovimiento = async (e) => {
    e.preventDefault();
    if (!nuevoMovimiento.amount || !nuevoMovimiento.description) {
      setError('Debe completar todos los campos del movimiento');
      return;
    }
    
    setMovimientoLoading(true);
    setError(null);
    setSuccess(null);
    
    console.log('💰 [FRONTEND] Registrando movimiento:', {
      type: nuevoMovimiento.type,
      amount: nuevoMovimiento.amount,
      description: nuevoMovimiento.description,
      cajaId: cajaInfo._id
    });
    
    try {
      // 1. Registrar el movimiento
      const response = await api.post('/api/caja/movimiento', {
        cajaId: cajaInfo._id,
        type: nuevoMovimiento.type,
        amount: parseFloat(nuevoMovimiento.amount),
        description: nuevoMovimiento.description
      });
      
      console.log('✅ [FRONTEND] Movimiento registrado exitosamente:', response.data);
      
      // 2. Limpiar formulario inmediatamente
      setNuevoMovimiento({ type: 'ingreso', amount: '', description: '' });
      
      // 3. Recargar todos los datos en paralelo para sincronización completa
      console.log('🔄 [FRONTEND] Recargando todos los datos después de registrar movimiento...');
      await Promise.all([
        fetchCajaInfo(),
        fetchInitialData()
      ]);
      
      const tipoMovimiento = nuevoMovimiento.type === 'ingreso' ? 'Ingreso' : 'Egreso';
      setSuccess(`✅ ${tipoMovimiento} registrado correctamente - Datos actualizados`);
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err) {
      console.error('❌ [FRONTEND] Error al registrar movimiento:', err);
      const errorMessage = err?.response?.data?.message || 'Error al registrar movimiento';
      setError(`❌ ${errorMessage}`);
      
      // Limpiar error después de 5 segundos
      setTimeout(() => setError(null), 5000);
    } finally {
      setMovimientoLoading(false);
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

    if (!cajaInfo || !cajaInfo.confirmed) {
      setError('No se puede procesar el pago: la caja no está confirmada');
      return;
    }

    setPaymentLoading(true);
    setError(null); // Limpiar errores previos
    
    try {
      // 1. Crear la orden según el flujo del backend
      const orderData = {
        products: currentOrder.map(item => ({
          productId: item._id,
          name: item.name,
          quantity: item.quantity,
          price: item.price
        })),
        table: selectedMesa._id,
        type: 'dine-in'
      };

      console.log('🔄 [FRONTEND] Creando orden:', orderData);
      const orderResponse = await api.post('/api/orders', orderData);
      const orderId = orderResponse.data.orderId;
      
      // 2. Procesar el pago de la orden
      console.log('💳 [FRONTEND] Procesando pago para orden:', orderId);
      await api.post(`/api/orders/${orderId}/pay`);
      
      // 3. Limpiar el estado del pedido actual
      const totalPagado = total;
      const mesaNumber = selectedMesa.number;
      
      setCurrentOrder([]);
      setSelectedMesa(null);
      setTotal(0);
      
      // 4. Mostrar mensaje de éxito
      setSuccess(`💰 Pago procesado correctamente - Mesa ${mesaNumber} - Total: ${formatCurrency(totalPagado)} (${paymentMethod})`);
      
      // 5. Recargar datos inmediatamente
      console.log('🔄 [FRONTEND] Recargando datos después del pago...');
      await Promise.all([
        fetchInitialData(),
        fetchCajaInfo()
      ]);
      
      console.log('✅ [FRONTEND] Pago completado y datos actualizados');
      
    } catch (err) {
      console.error('❌ [FRONTEND] Error al procesar pago:', err);
      const errorMsg = err.response?.data?.message || 'Error al procesar el pago';
      setError(`Error: ${errorMsg}`);
    } finally {
      setPaymentLoading(false);
    }
  };

  // Recarga manual de datos (encapsulamiento simple)
  const handleManualReload = async () => {
    setLoading(true);
    try {
      console.log('🔄 [FRONTEND] Recarga manual iniciada...');
      await Promise.all([
        fetchCajaInfo(),
        fetchInitialData()
      ]);
      setSuccess('✅ Datos actualizados correctamente');
      console.log('✅ [FRONTEND] Recarga manual completada');
    } catch (err) {
      console.error('❌ [FRONTEND] Error en recarga manual:', err);
      setError('Error al actualizar los datos');
    } finally {
      setLoading(false);
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
                        disabled={currentOrder.length === 0 || paymentLoading}
                      >
                        {paymentLoading ? '⏳ Procesando...' : '💵 Efectivo'}
                      </button>
                      <button 
                        className="caja-btn caja-btn-primary"
                        onClick={() => processPayment('tarjeta')}
                        disabled={currentOrder.length === 0 || paymentLoading}
                      >
                        {paymentLoading ? '⏳ Procesando...' : '💳 Tarjeta'}
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
                        disabled={confirmacionLoading || declinarLoading}
                      >
                        {confirmacionLoading ? 'Confirmando...' : 'Confirmar y Abrir Caja'}
                      </button>
                      <button 
                        onClick={() => setMostrarDeclinar(true)} 
                        className="caja-btn caja-btn-danger"
                        disabled={confirmacionLoading || declinarLoading}
                      >
                        No Cuadra - Declinar
                      </button>
                    </div>
                    
                    {/* Modal para declinar caja */}
                    {mostrarDeclinar && (
                      <div className="modal-overlay">
                        <div className="modal-content">
                          <h4>🚨 Declinar Caja Asignada</h4>
                          <p>Si el monto en efectivo no coincide con el asignado, puedes declinar esta caja.</p>
                          <div className="declinar-form">
                            <label>
                              Motivo de la declinación:
                              <textarea
                                value={razonDeclinar}
                                onChange={(e) => setRazonDeclinar(e.target.value)}
                                placeholder="Ej: El efectivo en caja solo suma $15.50, no los $20.00 asignados"
                                rows={3}
                                required
                              />
                            </label>
                            <div className="modal-actions">
                              <button 
                                onClick={declinarCaja}
                                className="caja-btn caja-btn-danger"
                                disabled={declinarLoading || !razonDeclinar.trim()}
                              >
                                {declinarLoading ? 'Declinando...' : 'Confirmar Declinación'}
                              </button>
                              <button 
                                onClick={() => {
                                  setMostrarDeclinar(false);
                                  setRazonDeclinar('');
                                }}
                                className="caja-btn caja-btn-secondary"
                                disabled={declinarLoading}
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
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
                    <button type="submit" className="caja-btn caja-btn-primary" disabled={movimientoLoading}>
                      {movimientoLoading ? 'Registrando...' : 'Registrar Movimiento'}
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

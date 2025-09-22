import React, { useState, useEffect } from 'react';
import AdminDashboardPanel from './AdminDashboardPanel';
import TableManagement from '../../components/TableManagement';
import MenuManagement from '../../components/MenuManagement';
import KitchenPage from '../kitchenPages/KitchenPage';
import MozoPage from '../mozoPages/MozoPage';
import './AdminPage.css';
import './AdminCajaStyles.css';
import api from '../../api';
import { setSession, getUser, logout } from '../../auth';
import { connectSocket, onForceLogout } from '../../socket';
import { useNavigate } from 'react-router-dom';

const AdminPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(getUser());
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [nuevoUsuario, setNuevoUsuario] = useState({ name: '', username: '', password: '', role: 'mozo' });
  const [editando, setEditando] = useState(null);
  const [editUser, setEditUser] = useState({ name: '', username: '', password: '', role: 'mozo' });
  const [statusMsg, setStatusMsg] = useState(null);
  const [socketError, setSocketError] = useState(null);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [reportes, setReportes] = useState({
    ventasHoy: 0,
    pedidosHoy: 0,
    mesasOcupadas: 0,
    usuariosActivos: 0
  });
  const [pedidos, setPedidos] = useState([]);
  const [loadingReportes, setLoadingReportes] = useState(false);
  const [loadingPedidos, setLoadingPedidos] = useState(false);

  // Estados para gestión de caja
  const [cajasAbiertas, setCajasAbiertas] = useState([]);
  const [historialCajas, setHistorialCajas] = useState([]);
  const [cajeros, setCajeros] = useState([]);
  const [nuevaCaja, setNuevaCaja] = useState({
    assignedTo: '',
    initialAmount: ''
  });
  const [loadingCajas, setLoadingCajas] = useState(false);
  const [errorCaja, setErrorCaja] = useState(null);

  // useEffect hooks
  useEffect(() => {
    if (token && user && user._id) {
      const socket = connectSocket(user._id);
      onForceLogout(() => {
        logout(() => window.location.reload());
      });
      if (socket) {
        socket.on('disconnect', () => {
          setSocketError('Conexión perdida con el servidor. Tu sesión ha sido cerrada.');
          logout(() => window.location.reload());
        });
      }
    }
    // Mantener socket activo al navegar
  }, [token, user]);

  // Cargar datos iniciales del dashboard
  useEffect(() => {
    if (token && user && user.role === 'admin') {
      fetchUsuarios();
      fetchReportes();
    }
  }, [token, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cargar datos de caja cuando se activa la sección (con encapsulación)
  useEffect(() => {
    if (token && user && user.role === 'admin' && activeSection === 'caja') {
      // Carga inicial inmediata
      fetchCajasAbiertas();
      fetchHistorialCajas();
      fetchCajeros();
    }
  }, [token, user, activeSection]); // eslint-disable-line react-hooks/exhaustive-deps

  // Login admin
  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await api.post('/api/users/login', { username, password });
      const me = await api.get('/api/users/me', {
        headers: { Authorization: `Bearer ${res.data.token}` }
      });
      setSession(res.data.token, me.data);
      setToken(res.data.token);
      setUser(me.data);
      connectSocket(me.data._id);
      onForceLogout(() => {
        logout(() => window.location.reload());
      });
      if (me.data.role === 'admin') navigate('/admin');
      else if (me.data.role === 'caja') navigate('/caja');
      else if (me.data.role === 'mozo') navigate('/mozo');
      else if (me.data.role === 'cocina') navigate('/cocina');
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al iniciar sesión');
    }
  };

  const fetchUsuarios = async () => {
    setError(null);
    try {
      const res = await api.get('/api/users');
      setUsuarios(res.data);
    } catch (err) {
      setError('Error al obtener usuarios');
    }
  };

  const fetchReportes = async () => {
    setLoadingReportes(true);
    setError(null);
    try {
      // Obtener estadísticas del día
      const [ventasRes, pedidosRes, mesasRes] = await Promise.all([
        api.get('/api/caja/ventas-hoy').catch(() => ({ data: { total: 0 } })),
        api.get('/api/orders/estadisticas-hoy').catch(() => ({ data: { total: 0 } })),
        api.get('/api/tables/ocupadas').catch(() => ({ data: { ocupadas: 0 } }))
      ]);

      setReportes({
        ventasHoy: ventasRes.data.total || 0,
        pedidosHoy: pedidosRes.data.total || 0,
        mesasOcupadas: mesasRes.data.ocupadas || 0,
        usuariosActivos: usuarios.length
      });
    } catch (err) {
      setError('Error al obtener reportes');
    } finally {
      setLoadingReportes(false);
    }
  };

  const fetchPedidos = async () => {
    setLoadingPedidos(true);
    setError(null);
    try {
      const res = await api.get('/api/orders/historial');
      setPedidos(res.data);
    } catch (err) {
      setError('Error al obtener historial de pedidos');
    } finally {
      setLoadingPedidos(false);
    }
  };

  // Funciones de gestión de caja (con encapsulación)
  const fetchCajasAbiertas = async () => {
    setLoadingCajas(true);
    setErrorCaja(null);
    
    try {
      const res = await api.get('/api/caja/todas-abiertas');
      const cajasValidas = (Array.isArray(res.data) ? res.data : [])
        .filter(caja => caja && caja._id && caja.status === 'open');
      
      // Limpieza automática: verificar que cada caja realmente exista
      const cajasVerificadas = [];
      for (const caja of cajasValidas) {
        try {
          // Verificar que la caja aún existe haciendo una consulta específica
          await api.get(`/api/caja/estado?assignedTo=${caja.assignedTo?._id || caja.assignedTo}`);
          cajasVerificadas.push(caja);
        } catch (verificacionError) {
          // Si la caja no existe (404), la excluimos automáticamente
          if (verificacionError.response?.status === 404) {
            console.log(`🧹 [ENCAPSULACIÓN ADMIN] Limpiando caja inexistente: ${caja._id}`);
          } else {
            // Si es otro error, mantenemos la caja pero logueamos el error
            console.warn(`⚠️ Error verificando caja ${caja._id}:`, verificacionError.message);
            cajasVerificadas.push(caja);
          }
        }
      }
      
      // Solo actualizar si hay cambios (encapsulación inteligente)
      if (JSON.stringify(cajasAbiertas) !== JSON.stringify(cajasVerificadas)) {
        setCajasAbiertas(cajasVerificadas);
        console.log(`🔄 [ENCAPSULACIÓN ADMIN] Cajas actualizadas automáticamente: ${cajasVerificadas.length}`);
      } else {
        console.log(`📦 Cajas abiertas válidas: ${cajasVerificadas.length} de ${cajasValidas.length}`);
      }
    } catch (err) {
      console.error('Error al obtener cajas abiertas:', err);
      setErrorCaja('Error al obtener cajas abiertas');
      setCajasAbiertas([]);
    } finally {
      setLoadingCajas(false);
    }
  };

  const fetchHistorialCajas = async () => {
    try {
      const res = await api.get('/api/caja/historial');
      setHistorialCajas(res.data);
    } catch (err) {
      setErrorCaja('Error al obtener historial de cajas');
    }
  };

  const fetchCajeros = async () => {
    try {
      const res = await api.get('/api/users');
      setCajeros(res.data.filter(user => user.role === 'caja'));
    } catch (err) {
      setErrorCaja('Error al obtener cajeros');
    }
  };

  // Función para recargar todos los datos de caja
  const loadCajaData = async () => {
    setLoadingCajas(true);
    setErrorCaja(null);
    try {
      await Promise.all([
        fetchCajasAbiertas(),
        fetchHistorialCajas(),
        fetchCajeros()
      ]);
    } catch (err) {
      console.error('Error al cargar datos de caja:', err);
      setErrorCaja('Error al actualizar los datos');
    } finally {
      setLoadingCajas(false);
    }
  };

  const abrirNuevaCaja = async (e) => {
    e.preventDefault();
    setErrorCaja(null);
    
    if (!nuevaCaja.assignedTo || !nuevaCaja.initialAmount) {
      setErrorCaja('Debe seleccionar un cajero y especificar el monto inicial');
      return;
    }
    
    setLoadingCajas(true);
    
    try {
      console.log('🔓 [ADMIN CAJA] Abriendo nueva caja:', nuevaCaja);
      await api.post('/api/caja/abrir', {
        assignedTo: nuevaCaja.assignedTo,
        initialAmount: parseFloat(nuevaCaja.initialAmount)
      });
      
      // Limpiar formulario
      const cajeroNombre = cajeros.find(c => c._id === nuevaCaja.assignedTo)?.name || 'Cajero';
      const montoInicial = parseFloat(nuevaCaja.initialAmount);
      setNuevaCaja({ assignedTo: '', initialAmount: '' });
      
      // Mensaje de éxito
      const successMsg = `✅ Caja abierta para ${cajeroNombre} - Monto inicial: ${formatCurrency(montoInicial)}`;
      setStatusMsg(successMsg);
      setTimeout(() => setStatusMsg(null), 5000);
      
      // Recarga inmediata después de abrir caja (encapsulación)
      console.log('🔄 [ADMIN CAJA] Recarga inmediata después de abrir caja');
      await Promise.all([
        fetchCajasAbiertas(),
        fetchHistorialCajas()
      ]);
      
    } catch (err) {
      console.error('❌ [ADMIN CAJA] Error al abrir caja:', err);
      setErrorCaja(err?.response?.data?.message || 'Error al abrir caja');
      setTimeout(() => setErrorCaja(null), 5000);
    } finally {
      setLoadingCajas(false);
    }
  };

  const cerrarCaja = async (cajaId, totalAmount) => {
    setErrorCaja(null);
    if (!cajaId) {
      setErrorCaja('ID de caja inválido');
      return;
    }
    
    // Confirmación adicional del usuario
    if (!window.confirm(`¿Estás seguro de cerrar la caja con un total de ${formatCurrency(totalAmount)}?`)) {
      return;
    }
    
    setLoadingCajas(true);
    
    try {
      console.log('🔒 [ADMIN CAJA] Cerrando caja:', { cajaId, finalAmount: totalAmount });
      await api.post('/api/caja/cerrar', {
        cajaId: cajaId,
        finalAmount: totalAmount
      });
      console.log('✅ [ADMIN CAJA] Caja cerrada exitosamente');
      
      // Limpieza automática: remover la caja cerrada del estado inmediatamente
      setCajasAbiertas(prevCajas => prevCajas.filter(caja => caja._id !== cajaId));
      
      // Mensaje de éxito
      const successMsg = `✅ Caja cerrada exitosamente - Total final: ${formatCurrency(totalAmount)}`;
      setStatusMsg(successMsg);
      setTimeout(() => setStatusMsg(null), 5000);
      
      // Recarga inmediata después de cerrar caja (encapsulación)
      console.log('🔄 [ADMIN CAJA] Recarga inmediata después de cerrar caja');
      await Promise.all([
        fetchCajasAbiertas(),
        fetchHistorialCajas()
      ]);
      
    } catch (err) {
      console.error('❌ [ADMIN CAJA] Error al cerrar caja:', err);
      
      // Si la caja ya no existe (404), limpiarla automáticamente del estado
      if (err.response?.status === 404) {
        console.log('🧹 [ADMIN CAJA] Caja ya no existe, limpiando del estado');
        setCajasAbiertas(prevCajas => prevCajas.filter(caja => caja._id !== cajaId));
        setErrorCaja('La caja ya fue cerrada o no existe');
      } else {
        setErrorCaja(err?.response?.data?.message || 'Error al cerrar caja');
      }
      setTimeout(() => setErrorCaja(null), 5000);
    } finally {
      setLoadingCajas(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('es-CO', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'N/A';
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Hace menos de 1h';
    if (diffInHours < 24) return `Hace ${diffInHours}h`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `Hace ${diffInDays}d`;
  };

  const crearUsuario = async (e) => {
    e.preventDefault();
    setStatusMsg(null);
    try {
      await api.post('/api/users', nuevoUsuario);
      setStatusMsg('Usuario creado correctamente');
      setNuevoUsuario({ name: '', username: '', password: '', role: 'mozo' });
      fetchUsuarios();
    } catch (err) {
      setStatusMsg('Error al crear usuario');
    }
  };

  const eliminarUsuario = async (id) => {
    setStatusMsg(null);
    try {
      await api.delete(`/api/users/${id}`);
      setStatusMsg('Usuario eliminado');
      fetchUsuarios();
    } catch (err) {
      setStatusMsg('Error al eliminar usuario');
    }
  };

  const iniciarEdicion = (usuario) => {
    setEditando(usuario._id);
    setEditUser({
      name: usuario.name,
      username: usuario.username,
      password: '',
      role: usuario.role
    });
  };

  const cancelarEdicion = () => {
    setEditando(null);
    setEditUser({ name: '', username: '', password: '', role: 'mozo' });
  };

  const guardarEdicion = async (e) => {
    e.preventDefault();
    setStatusMsg(null);
    try {
      await api.put(`/api/users/${editando}`, editUser);
      setStatusMsg('Usuario actualizado');
      setEditando(null);
      fetchUsuarios();
    } catch (err) {
      setStatusMsg('Error al actualizar usuario');
    }
  };

  // Si no hay token, mostrar login
  if (!token || !user) {
    return (
      <div className="wood-background">
        <div className="app-container">
          <div className="auth-container">
            <div className="auth-card">
              <h2 className="auth-title">Administración</h2>
              <form onSubmit={handleLogin} className="auth-form">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Usuario"
                  className="auth-input"
                  required
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Contraseña"
                  className="auth-input"
                  required
                />
                <button type="submit" className="auth-button">
                  Ingresar
                </button>
              </form>
              {error && <div className="error-msg">{error}</div>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Si el usuario no es admin, no permitir acceso
  if (user.role !== 'admin') {
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

  // Dashboard admin con layout de ancho completo
  return (
    <div className="admin-dashboard-layout">
      {/* Sidebar */}
      <AdminDashboardPanel 
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        user={user}
      />

      {/* Contenido principal */}
      <div className="admin-main-content">
        <div className="admin-content-header">
          <h1>
            {activeSection === 'dashboard' && '🏠 Dashboard Principal'}
            {activeSection === 'usuarios' && '👥 Gestión de Usuarios'}
            {activeSection === 'mesas' && '🪑 Gestión de Mesas'}
            {activeSection === 'menu' && '🍽️ Gestión de Menú'}
            {activeSection === 'caja' && '💰 Sistema de Caja'}
            {activeSection === 'cocina' && '👨‍🍳 Dashboard de Cocina'}
            {activeSection === 'mozo' && '🧑‍🍽️ Sistema de Mozos'}
            {activeSection === 'reportes' && '📊 Reportes y Estadísticas'}
            {activeSection === 'pedidos' && '📋 Historial de Pedidos'}
          </h1>
          {activeSection === 'usuarios' && (
            <button onClick={fetchUsuarios} className="admin-btn admin-btn-primary">
              Cargar Usuarios
            </button>
          )}
          {activeSection === 'reportes' && (
            <button 
              onClick={fetchReportes} 
              className="admin-btn admin-btn-primary"
              disabled={loadingReportes}
            >
              {loadingReportes ? 'Cargando...' : 'Actualizar Reportes'}
            </button>
          )}
          {activeSection === 'pedidos' && (
            <button 
              onClick={fetchPedidos} 
              className="admin-btn admin-btn-primary"
              disabled={loadingPedidos}
            >
              {loadingPedidos ? 'Cargando...' : 'Cargar Pedidos'}
            </button>
          )}
        </div>

        {/* Mensajes de estado */}
        {error && <div className="admin-error-msg">{error}</div>}
        {statusMsg && <div className="admin-status-msg">{statusMsg}</div>}
        {socketError && <div className="admin-error-msg">{socketError}</div>}

        {/* Dashboard de bienvenida por defecto */}
        {activeSection === 'dashboard' && (
          <div className="admin-section fade-in dashboard-container">
            {/* Header compacto */}
            <div className="dashboard-header">
              <div className="dashboard-title">
                <span style={{fontSize: '2.5rem', marginRight: '1rem'}}>🏪</span>
                <div>
                  <h2>Panel de Administración POSHERIA</h2>
                  <p>Sistema de gestión integral para restaurante</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  fetchUsuarios();
                  fetchReportes();
                  setStatusMsg('Dashboard actualizado exitosamente');
                  setTimeout(() => setStatusMsg(null), 3000);
                }}
                className="admin-btn admin-btn-primary dashboard-refresh-btn"
                disabled={loadingReportes}
              >
                {loadingReportes ? '🔄 Actualizando...' : '🔄 Actualizar'}
              </button>
            </div>

            {/* Estadísticas compactas */}
            <div className="dashboard-stats-compact">
              <div className="stat-card-compact users">
                <div className="stat-icon">👥</div>
                <div className="stat-info">
                  <span className="stat-number">{usuarios.length || 0}</span>
                  <span className="stat-label">Usuarios</span>
                </div>
              </div>
              <div className="stat-card-compact tables">
                <div className="stat-icon">🪑</div>
                <div className="stat-info">
                  <span className="stat-number">12</span>
                  <span className="stat-label">Mesas</span>
                </div>
              </div>
              <div className="stat-card-compact menu">
                <div className="stat-icon">🍽️</div>
                <div className="stat-info">
                  <span className="stat-number">45</span>
                  <span className="stat-label">Productos</span>
                </div>
              </div>
              <div className="stat-card-compact orders">
                <div className="stat-icon">📋</div>
                <div className="stat-info">
                  <span className="stat-number">{reportes.pedidosHoy || 0}</span>
                  <span className="stat-label">Pedidos Hoy</span>
                </div>
              </div>
            </div>

            {/* Tarjetas de navegación compactas */}
            <div className="dashboard-nav-grid">
              <div className="nav-card" onClick={() => setActiveSection('usuarios')}>
                <span className="nav-icon">👥</span>
                <span className="nav-label">Usuarios</span>
              </div>
              <div className="nav-card" onClick={() => setActiveSection('reportes')}>
                <span className="nav-icon">📊</span>
                <span className="nav-label">Reportes</span>
              </div>
              <div className="nav-card" onClick={() => setActiveSection('menu')}>
                <span className="nav-icon">🍽️</span>
                <span className="nav-label">Menú</span>
              </div>
              <div className="nav-card" onClick={() => setActiveSection('mesas')}>
                <span className="nav-icon">🪑</span>
                <span className="nav-label">Mesas</span>
              </div>
              <div className="nav-card" onClick={() => setActiveSection('caja')}>
                <span className="nav-icon">💰</span>
                <span className="nav-label">Caja</span>
              </div>
              <div className="nav-card" onClick={() => setActiveSection('cocina')}>
                <span className="nav-icon">👨‍🍳</span>
                <span className="nav-label">Cocina</span>
              </div>
            </div>
          </div>
        )}

        {/* Renderizado condicional según la sección activa */}
        {activeSection === 'usuarios' && (
          <div className="admin-section compact-view">
            {/* Layout de dos columnas: formulario + tabla */}
            <div className="users-layout">
              {/* Columna izquierda: Formulario compacto */}
              <div className="users-form-section">
                <h3 className="section-title">
                  {editando ? '✏️ Editar Usuario' : '➕ Crear Usuario'}
                </h3>
                
                <form onSubmit={editando ? guardarEdicion : crearUsuario} className="compact-form">
                  <div className="form-row">
                    <input
                      type="text"
                      value={editando ? editUser.name : nuevoUsuario.name}
                      onChange={(e) => editando 
                        ? setEditUser({ ...editUser, name: e.target.value })
                        : setNuevoUsuario({ ...nuevoUsuario, name: e.target.value })
                      }
                      placeholder="Nombre completo"
                      className="admin-input"
                      required
                    />
                  </div>
                  <div className="form-row">
                    <input
                      type="text"
                      value={editando ? editUser.username : nuevoUsuario.username}
                      onChange={(e) => editando 
                        ? setEditUser({ ...editUser, username: e.target.value })
                        : setNuevoUsuario({ ...nuevoUsuario, username: e.target.value })
                      }
                      placeholder="Usuario"
                      className="admin-input"
                      required
                    />
                    <select
                      value={editando ? editUser.role : nuevoUsuario.role}
                      onChange={(e) => editando 
                        ? setEditUser({ ...editUser, role: e.target.value })
                        : setNuevoUsuario({ ...nuevoUsuario, role: e.target.value })
                      }
                      className="admin-input"
                    >
                      <option value="mozo">Mozo</option>
                      <option value="caja">Caja</option>
                      <option value="cocina">Cocina</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="form-row">
                    <input
                      type="password"
                      value={editando ? editUser.password : nuevoUsuario.password}
                      onChange={(e) => editando 
                        ? setEditUser({ ...editUser, password: e.target.value })
                        : setNuevoUsuario({ ...nuevoUsuario, password: e.target.value })
                      }
                      placeholder={editando ? "Nueva contraseña (opcional)" : "Contraseña"}
                      className="admin-input"
                      required={!editando}
                    />
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="admin-btn admin-btn-primary">
                      {editando ? '💾 Actualizar' : '➕ Crear'}
                    </button>
                    {editando && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditando(null);
                          setEditUser({ name: '', username: '', password: '', role: 'mozo' });
                        }}
                        className="admin-btn admin-btn-secondary"
                      >
                        ❌ Cancelar
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Columna derecha: Lista de usuarios */}
              <div className="users-list-section">
                <div className="section-header">
                  <h3 className="section-title">👥 Usuarios del Sistema ({usuarios.length})</h3>
                  <button onClick={fetchUsuarios} className="admin-btn admin-btn-refresh">
                    🔄 Recargar
                  </button>
                </div>
                
                <div className="users-table-container">
                  {usuarios.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">👥</div>
                      <p>No hay usuarios cargados</p>
                      <button onClick={fetchUsuarios} className="admin-btn admin-btn-primary">
                        Cargar Usuarios
                      </button>
                    </div>
                  ) : (
                    <table className="users-table">
                      <thead>
                        <tr>
                          <th>Nombre</th>
                          <th>Usuario</th>
                          <th>Rol</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usuarios.map((usuario) => (
                          <tr key={usuario._id}>
                            <td>{usuario.name}</td>
                            <td>{usuario.username}</td>
                            <td>
                              <span className={`role-badge role-${usuario.role}`}>
                                {usuario.role}
                              </span>
                            </td>
                            <td className="actions-cell">
                              <button
                                onClick={() => {
                                  setEditando(usuario._id);
                                  setEditUser({
                                    name: usuario.name,
                                    username: usuario.username,
                                    password: '',
                                    role: usuario.role
                                  });
                                }}
                                className="action-btn edit-btn"
                                title="Editar usuario"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => eliminarUsuario(usuario._id)}
                                className="action-btn delete-btn"
                                title="Eliminar usuario"
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sección de Mesas */}
        {activeSection === 'mesas' && (
          <div className="admin-section compact-view">
            <div className="section-header">
              <h3 className="section-title">🪑 Gestión de Mesas</h3>
            </div>
            <TableManagement />
          </div>
        )}

        {/* Sección de Menú */}
        {activeSection === 'menu' && (
          <div className="admin-section menu-dashboard">
            <div className="section-header">
              <h3 className="section-title">🍽️ Gestión de Menú</h3>
              <div className="menu-quick-actions">
                <button 
                  className="admin-btn admin-btn-primary"
                  onClick={() => window.open('/menu-display', '_blank')}
                >
                  📺 Ver Menú en Pantalla
                </button>
              </div>
            </div>
            
            {/* Dashboard de estadísticas del menú */}
            <div className="menu-stats-grid">
              <div className="stat-card-compact menu-total">
                <div className="stat-icon">🍽️</div>
                <div className="stat-info">
                  <span className="stat-number">45</span>
                  <span className="stat-label">Total Productos</span>
                </div>
              </div>
              <div className="stat-card-compact menu-active">
                <div className="stat-icon">✅</div>
                <div className="stat-info">
                  <span className="stat-number">42</span>
                  <span className="stat-label">Disponibles</span>
                </div>
              </div>
              <div className="stat-card-compact menu-categories">
                <div className="stat-icon">📁</div>
                <div className="stat-info">
                  <span className="stat-number">5</span>
                  <span className="stat-label">Categorías</span>
                </div>
              </div>
              <div className="stat-card-compact menu-revenue">
                <div className="stat-icon">💰</div>
                <div className="stat-info">
                  <span className="stat-number">S/. 1,245</span>
                  <span className="stat-label">Ventas Hoy</span>
                </div>
              </div>
            </div>

            <MenuManagement />
          </div>
        )}

        {/* Sección de Caja */}
        {activeSection === 'caja' && (
          <div className="admin-section caja-dashboard">
            <div className="section-header">
              <h3 className="section-title">💰 Sistema de Caja - Administración</h3>
              <button 
                onClick={loadCajaData} 
                className="refresh-btn"
                disabled={loadingCajas}
              >
                {loadingCajas ? '🔄' : '🔄'} Actualizar
              </button>
            </div>
            
            {errorCaja && (
              <div className="error-banner">
                ❌ {errorCaja}
              </div>
            )}

            {/* Dashboard de Estadísticas */}
            <div className="caja-stats-grid">
              <div className="stat-card primary">
                <div className="stat-icon">🔓</div>
                <div className="stat-content">
                  <h4>{cajasAbiertas.length}</h4>
                  <p>Cajas Abiertas</p>
                </div>
              </div>
              <div className="stat-card success">
                <div className="stat-icon">✅</div>
                <div className="stat-content">
                  <h4>{cajasAbiertas.filter(c => c.confirmed).length}</h4>
                  <p>Confirmadas</p>
                </div>
              </div>
              <div className="stat-card warning">
                <div className="stat-icon">⏳</div>
                <div className="stat-content">
                  <h4>{cajasAbiertas.filter(c => !c.confirmed).length}</h4>
                  <p>Pendientes</p>
                </div>
              </div>
              <div className="stat-card info">
                <div className="stat-icon">💰</div>
                <div className="stat-content">
                  <h4>{formatCurrency(cajasAbiertas.reduce((total, caja) => total + (caja.totalAmount || caja.initialAmount), 0))}</h4>
                  <p>Total en Cajas</p>
                </div>
              </div>
            </div>

            {/* Panel de Control Principal */}
            <div className="caja-main-panel">
              
              {/* Formulario Abrir Nueva Caja */}
              <div className="panel-section nueva-caja-panel">
                <div className="panel-header">
                  <h4>🔓 Abrir Nueva Caja</h4>
                </div>
                <div className="panel-content">
                  <form onSubmit={abrirNuevaCaja} className="nueva-caja-form-modern">
                    <div className="form-row">
                      <div className="form-field">
                        <label>👤 Asignar a Cajero</label>
                        <select 
                          value={nuevaCaja.assignedTo} 
                          onChange={(e) => setNuevaCaja({...nuevaCaja, assignedTo: e.target.value})}
                          required
                          className="form-select"
                        >
                          <option value="">Seleccionar cajero...</option>
                          {cajeros.map(cajero => (
                            <option key={cajero._id} value={cajero._id}>
                              👤 {cajero.name} ({cajero.username})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-field">
                        <label>💵 Monto Inicial</label>
                        <input 
                          type="number" 
                          step="0.01"
                          min="0"
                          value={nuevaCaja.initialAmount}
                          onChange={(e) => setNuevaCaja({...nuevaCaja, initialAmount: e.target.value})}
                          placeholder="Ej: 10000"
                          required
                          className="form-input"
                        />
                      </div>
                      <div className="form-field">
                        <button type="submit" className="btn-abrir-caja" disabled={loadingCajas}>
                          {loadingCajas ? '⏳ Abriendo...' : '🔓 Abrir Caja'}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>

              {/* Cajas Abiertas */}
              <div className="panel-section cajas-abiertas-panel">
                <div className="panel-header">
                  <h4>📖 Cajas Abiertas Actualmente</h4>
                  <span className="badge">{cajasAbiertas.length}</span>
                </div>
                <div className="panel-content">
                  {cajasAbiertas.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">📭</div>
                      <p>No hay cajas abiertas actualmente</p>
                    </div>
                  ) : (
                    <div className="cajas-table-wrapper">
                      <table className="cajas-table modern">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>👤 Cajero</th>
                            <th>💰 Montos</th>
                            <th>📊 Actividad</th>
                            <th>⏰ Estado</th>
                            <th>🛠️ Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cajasAbiertas.map((caja) => (
                            <tr key={caja._id} className={`caja-row ${caja.confirmed ? 'confirmed' : 'pending'}`}>
                              <td>
                                <span className="caja-id-badge">#{caja._id.slice(-6)}</span>
                              </td>
                              <td>
                                <div className="cajero-info">
                                  <span className="cajero-name">{caja.assignedTo?.name || 'No asignado'}</span>
                                  <small className="cajero-username">@{caja.assignedTo?.username}</small>
                                </div>
                              </td>
                              <td>
                                <div className="montos-info">
                                  <div className="monto-inicial">Inicial: {formatCurrency(caja.initialAmount)}</div>
                                  <div className="monto-actual">Actual: {formatCurrency(caja.totalAmount || caja.initialAmount)}</div>
                                </div>
                              </td>
                              <td>
                                <div className="actividad-info">
                                  <span className="movimientos-count">{caja.movements?.length || 0} movimientos</span>
                                  <small className="tiempo-abierta">Abierta: {formatTimeAgo(caja.openedAt)}</small>
                                </div>
                              </td>
                              <td>
                                <span className={`status-pill ${caja.confirmed ? 'confirmed' : 'pending'}`}>
                                  {caja.confirmed ? '✅ Confirmada' : '⏳ Pendiente'}
                                </span>
                              </td>
                              <td>
                                <div className="action-buttons">
                                  <button 
                                    onClick={() => cerrarCaja(caja._id, caja.totalAmount || caja.initialAmount)}
                                    className="btn-cerrar-caja"
                                    disabled={loadingCajas}
                                    title="Cerrar esta caja"
                                  >
                                    {loadingCajas ? '⏳' : '🔒'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Historial de Cajas Mejorado */}
              <div className="panel-section historial-panel">
                <div className="panel-header">
                  <h4>📚 Historial de Cajas</h4>
                  <div className="historial-controls">
                    <input 
                      type="text" 
                      placeholder="🔍 Buscar por cajero..." 
                      className="search-input"
                    />
                    <select className="filter-select">
                      <option value="">Todos los estados</option>
                      <option value="open">Abiertas</option>
                      <option value="closed">Cerradas</option>
                      <option value="declined">Declinadas</option>
                    </select>
                  </div>
                </div>
                <div className="panel-content">
                  {historialCajas.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">📝</div>
                      <p>No hay historial de cajas disponible</p>
                    </div>
                  ) : (
                    <div className="historial-table-wrapper">
                      <table className="historial-table modern">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>👤 Cajero</th>
                            <th>💰 Montos</th>
                            <th>📊 Actividad</th>
                            <th>📅 Fechas</th>
                            <th>🏷️ Estado</th>
                            <th>ℹ️ Detalles</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historialCajas.slice(0, 20).map((caja) => (
                            <tr key={caja._id} className={`historial-row ${caja.status}`}>
                              <td>
                                <span className="caja-id-badge">#{caja._id.slice(-6)}</span>
                              </td>
                              <td>
                                <div className="cajero-info">
                                  <span className="cajero-name">{caja.assignedTo?.name || 'Sin asignar'}</span>
                                  <small className="cajero-username">@{caja.assignedTo?.username || 'N/A'}</small>
                                </div>
                              </td>
                              <td>
                                <div className="montos-historial">
                                  <div className="monto-row">
                                    <span className="monto-label">Inicial:</span>
                                    <span className="monto-value">{formatCurrency(caja.initialAmount)}</span>
                                  </div>
                                  {caja.status !== 'declined' && (
                                    <div className="monto-row">
                                      <span className="monto-label">Final:</span>
                                      <span className="monto-value">{formatCurrency(caja.totalAmount || caja.initialAmount)}</span>
                                    </div>
                                  )}
                                  {caja.status === 'declined' && (
                                    <div className="monto-row declined">
                                      <span className="monto-label">Estado:</span>
                                      <span className="monto-value">❌ No procesado</span>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td>
                                <div className="actividad-historial">
                                  <span className="movimientos-badge">{caja.movements?.length || 0} movimientos</span>
                                  {caja.confirmed && (
                                    <small className="confirmado-badge">✅ Confirmada</small>
                                  )}
                                  {caja.status === 'declined' && (
                                    <small className="declinado-badge">❌ Declinada</small>
                                  )}
                                </div>
                              </td>
                              <td>
                                <div className="fechas-info">
                                  <div className="fecha-row">
                                    <span className="fecha-label">Abierta:</span>
                                    <span className="fecha-value">{formatDateTime(caja.createdAt)}</span>
                                  </div>
                                  {caja.closedAt && (
                                    <div className="fecha-row">
                                      <span className="fecha-label">Cerrada:</span>
                                      <span className="fecha-value">{formatDateTime(caja.closedAt)}</span>
                                    </div>
                                  )}
                                  {caja.declinedAt && (
                                    <div className="fecha-row declined">
                                      <span className="fecha-label">Declinada:</span>
                                      <span className="fecha-value">{formatDateTime(caja.declinedAt)}</span>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td>
                                <span className={`status-pill ${caja.status}`}>
                                  {caja.status === 'open' ? '🔓 Abierta' : 
                                   caja.status === 'closed' ? '🔒 Cerrada' : 
                                   caja.status === 'declined' ? '❌ Declinada' : caja.status}
                                </span>
                              </td>
                              <td>
                                <div className="detalles-info">
                                  {caja.status === 'declined' && caja.declineReason && (
                                    <div className="decline-details">
                                      <span className="detail-label">Motivo:</span>
                                      <span className="detail-value" title={caja.declineReason}>
                                        {caja.declineReason.length > 20 
                                          ? `${caja.declineReason.substring(0, 20)}...` 
                                          : caja.declineReason}
                                      </span>
                                    </div>
                                  )}
                                  {caja.status === 'closed' && (
                                    <div className="close-details">
                                      <span className="detail-label">Duración:</span>
                                      <span className="detail-value">
                                        {caja.closedAt && caja.createdAt 
                                          ? `${Math.round((new Date(caja.closedAt) - new Date(caja.createdAt)) / (1000 * 60 * 60))}h`
                                          : 'N/A'}
                                      </span>
                                    </div>
                                  )}
                                  {caja.status === 'open' && (
                                    <div className="open-details">
                                      <span className="detail-label">Activa desde:</span>
                                      <span className="detail-value">{formatTimeAgo(caja.createdAt)}</span>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
              
            </div>
          </div>
        )}

        {/* Sección de Cocina */}
        {activeSection === 'cocina' && (
          <div className="admin-section compact-view">
            <div className="section-header">
              <h3 className="section-title">👨‍🍳 Dashboard de Cocina</h3>
            </div>
            <div className="component-wrapper">
              <KitchenPage />
            </div>
          </div>
        )}

        {/* Sección de Mozo */}
        {activeSection === 'mozo' && (
          <div className="admin-section compact-view">
            <div className="section-header">
              <h3 className="section-title">🧑‍🍽️ Sistema de Mozos</h3>
            </div>
            <div className="component-wrapper">
              <MozoPage />
            </div>
          </div>
        )}

        {/* Sección de Reportes */}
        {activeSection === 'reportes' && (
          <div className="admin-section compact-view">
            <div className="section-header">
              <h3 className="section-title">📊 Reportes y Estadísticas</h3>
              <button onClick={fetchReportes} className="admin-btn admin-btn-refresh" disabled={loadingReportes}>
                {loadingReportes ? '🔄 Cargando...' : '🔄 Actualizar'}
              </button>
            </div>
            
            <div className="reports-compact-layout">
              {/* Métricas principales en una fila */}
              <div className="reports-metrics">
                <div className="metric-card sales">
                  <div className="metric-icon">💰</div>
                  <div className="metric-info">
                    <span className="metric-value">{formatCurrency(reportes.ventasHoy)}</span>
                    <span className="metric-label">Ventas Hoy</span>
                  </div>
                </div>
                <div className="metric-card orders">
                  <div className="metric-icon">📋</div>
                  <div className="metric-info">
                    <span className="metric-value">{reportes.pedidosHoy}</span>
                    <span className="metric-label">Pedidos Hoy</span>
                  </div>
                </div>
                <div className="metric-card tables">
                  <div className="metric-icon">🪑</div>
                  <div className="metric-info">
                    <span className="metric-value">{reportes.mesasOcupadas}</span>
                    <span className="metric-label">Mesas Ocupadas</span>
                  </div>
                </div>
                <div className="metric-card users">
                  <div className="metric-icon">👥</div>
                  <div className="metric-info">
                    <span className="metric-value">{reportes.usuariosActivos}</span>
                    <span className="metric-label">Usuarios Activos</span>
                  </div>
                </div>
              </div>

              {/* Gráfico y resumen en dos columnas */}
              <div className="reports-details">
                <div className="chart-section">
                  <h4>📈 Tendencia de Ventas</h4>
                  <div className="chart-placeholder">
                    <p>Gráfico de ventas diarias</p>
                    <div className="mock-chart">
                      {[...Array(7)].map((_, i) => (
                        <div key={i} className="chart-bar" style={{height: `${Math.random() * 100}%`}}></div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="summary-section">
                  <h4>📋 Resumen del Día</h4>
                  <div className="summary-items">
                    <div className="summary-item">
                      <span className="summary-label">Producto más vendido:</span>
                      <span className="summary-value">Pollo a la plancha</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Mesa más activa:</span>
                      <span className="summary-value">Mesa #5</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Hora pico:</span>
                      <span className="summary-value">12:30 - 14:00</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Promedio por pedido:</span>
                      <span className="summary-value">{formatCurrency(reportes.ventasHoy / Math.max(reportes.pedidosHoy, 1))}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sección de Pedidos */}
        {activeSection === 'pedidos' && (
          <div className="admin-section">
            <h3>📋 Historial de Pedidos</h3>
            
            {loadingPedidos ? (
              <div className="loading-spinner">Cargando pedidos...</div>
            ) : pedidos.length === 0 ? (
              <div className="empty-state">
                <p>No hay pedidos registrados</p>
                <button onClick={fetchPedidos} className="admin-btn admin-btn-primary">
                  Cargar Pedidos
                </button>
              </div>
            ) : (
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>ID Pedido</th>
                      <th>Mesa</th>
                      <th>Mozo</th>
                      <th>Items</th>
                      <th>Total</th>
                      <th>Estado</th>
                      <th>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedidos.map((pedido) => (
                      <tr key={pedido._id}>
                        <td>#{pedido._id.slice(-6)}</td>
                        <td>Mesa {pedido.tableNumber || 'N/A'}</td>
                        <td>{pedido.waiter?.name || 'N/A'}</td>
                        <td>
                          <div className="items-summary">
                            {pedido.items?.slice(0, 2).map((item, idx) => (
                              <span key={idx} className="item-chip">
                                {item.quantity}x {item.name}
                              </span>
                            ))}
                            {pedido.items?.length > 2 && (
                              <span className="item-more">
                                +{pedido.items.length - 2} más
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="amount-cell">
                          {formatCurrency(pedido.total || 0)}
                        </td>
                        <td>
                          <span className={`status-badge status-${pedido.status}`}>
                            {pedido.status === 'pending' && '⏳ Pendiente'}
                            {pedido.status === 'preparing' && '👨‍🍳 Preparando'}
                            {pedido.status === 'ready' && '✅ Listo'}
                            {pedido.status === 'delivered' && '🍽️ Entregado'}
                            {pedido.status === 'paid' && '💰 Pagado'}
                          </span>
                        </td>
                        <td className="date-cell">
                          {formatDate(pedido.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Estadísticas rápidas de pedidos */}
            {pedidos.length > 0 && (
              <div className="pedidos-stats">
                <h4>📊 Estadísticas Rápidas</h4>
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-value">{pedidos.length}</span>
                    <span className="stat-label">Total Pedidos</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">
                      {pedidos.filter(p => p.status === 'paid').length}
                    </span>
                    <span className="stat-label">Completados</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">
                      {formatCurrency(
                        pedidos
                          .filter(p => p.status === 'paid')
                          .reduce((sum, p) => sum + (p.total || 0), 0)
                      )}
                    </span>
                    <span className="stat-label">Total Facturado</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
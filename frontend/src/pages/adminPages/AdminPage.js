import React, { useState, useEffect } from 'react';
import AdminDashboardPanel from './AdminDashboardPanel';
import TableManagement from '../../components/TableManagement';
import '../../AppBase.css';
import api from '../../api';
import { setSession, getUser, logout } from '../../auth';
import { connectSocket, onForceLogout, disconnectSocket } from '../../socket';
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
  const [activeSection, setActiveSection] = useState('usuarios');

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
    return () => disconnectSocket();
  }, [token, user]);

  const fetchUsuarios = async () => {
    setError(null);
    try {
      const res = await api.get('/api/users');
      setUsuarios(res.data);
    } catch (err) {
      setError('Error al obtener usuarios');
    }
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
      <div className="admin-sidebar">
        <div className="admin-sidebar-header">
          <h2>Panel Admin</h2>
          <div className="admin-user-info">
            <span>{user.name}</span>
            <button 
              onClick={() => logout(() => window.location.reload())} 
              className="logout-btn"
            >
              Salir
            </button>
          </div>
        </div>
        
                <AdminDashboardPanel 
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          user={user}
        />
      </div>

      {/* Contenido principal */}
      <div className="admin-main-content">
        <div className="admin-content-header">
          <h1>
            {activeSection === 'usuarios' && 'Gestión de Usuarios'}
            {activeSection === 'mesas' && 'Gestión de Mesas'}
            {activeSection === 'reportes' && 'Reportes y Estadísticas'}
            {activeSection === 'pedidos' && 'Historial de Pedidos'}
          </h1>
          {activeSection === 'usuarios' && (
            <button onClick={fetchUsuarios} className="admin-btn admin-btn-primary">
              Cargar Usuarios
            </button>
          )}
        </div>

        {/* Mensajes de estado */}
        {error && <div className="admin-error-msg">{error}</div>}
        {statusMsg && <div className="admin-status-msg">{statusMsg}</div>}
        {socketError && <div className="admin-error-msg">{socketError}</div>}

        {/* Renderizado condicional según la sección activa */}
        {activeSection === 'usuarios' && (
          <>
            {/* Formulario crear usuario */}
            <div className="admin-section">
              <h3>Crear Nuevo Usuario</h3>
              <form onSubmit={crearUsuario} className="admin-form">
                <div className="admin-form-grid">
                  <input
                    type="text"
                    value={nuevoUsuario.name}
                    onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, name: e.target.value })}
                    placeholder="Nombre completo"
                    className="admin-input"
                    required
                  />
                  <input
                    type="text"
                    value={nuevoUsuario.username}
                    onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, username: e.target.value })}
                    placeholder="Usuario"
                    className="admin-input"
                    required
                  />
                  <input
                    type="password"
                    value={nuevoUsuario.password}
                    onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, password: e.target.value })}
                    placeholder="Contraseña"
                    className="admin-input"
                    required
                  />
                  <select
                    value={nuevoUsuario.role}
                    onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, role: e.target.value })}
                    className="admin-select"
                  >
                    <option value="mozo">Mozo</option>
                    <option value="caja">Caja</option>
                    <option value="cocina">Cocina</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <button type="submit" className="admin-btn admin-btn-success">
                  Crear Usuario
                </button>
              </form>
            </div>

            {/* Lista de usuarios */}
            <div className="admin-section">
              <h3>Usuarios Existentes</h3>
              <div className="admin-table-container">
                <table className="admin-table">
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
                        {editando === usuario._id ? (
                          <>
                            <td>
                              <input
                                type="text"
                                value={editUser.name}
                                onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                                className="admin-input-small"
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                value={editUser.username}
                                onChange={(e) => setEditUser({ ...editUser, username: e.target.value })}
                                className="admin-input-small"
                              />
                            </td>
                            <td>
                              <select
                                value={editUser.role}
                                onChange={(e) => setEditUser({ ...editUser, role: e.target.value })}
                                className="admin-select-small"
                              >
                                <option value="mozo">Mozo</option>
                                <option value="caja">Caja</option>
                                <option value="cocina">Cocina</option>
                                <option value="admin">Admin</option>
                              </select>
                            </td>
                            <td>
                              <button 
                                onClick={guardarEdicion} 
                                className="admin-btn admin-btn-sm admin-btn-success"
                              >
                                Guardar
                              </button>
                              <button 
                                onClick={cancelarEdicion} 
                                className="admin-btn admin-btn-sm admin-btn-secondary"
                              >
                                Cancelar
                              </button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td>{usuario.name}</td>
                            <td>{usuario.username}</td>
                            <td>{usuario.role}</td>
                            <td>
                              <button 
                                onClick={() => iniciarEdicion(usuario)} 
                                className="admin-btn admin-btn-sm admin-btn-warning"
                              >
                                Editar
                              </button>
                              <button 
                                onClick={() => eliminarUsuario(usuario._id)} 
                                className="admin-btn admin-btn-sm admin-btn-danger"
                              >
                                Eliminar
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Sección de Mesas */}
        {activeSection === 'mesas' && (
          <div className="admin-section">
            <TableManagement />
          </div>
        )}

        {/* Sección de Reportes */}
        {activeSection === 'reportes' && (
          <div className="admin-section">
            <h3>Reportes y Estadísticas</h3>
            <div className="reports-grid">
              <div className="report-card">
                <h4>📊 Ventas del Día</h4>
                <p>Próximamente...</p>
              </div>
              <div className="report-card">
                <h4>👥 Usuarios Activos</h4>
                <p>Total: {usuarios.length}</p>
              </div>
              <div className="report-card">
                <h4>🍽️ Pedidos Completados</h4>
                <p>Próximamente...</p>
              </div>
            </div>
          </div>
        )}

        {/* Sección de Pedidos */}
        {activeSection === 'pedidos' && (
          <div className="admin-section">
            <h3>Historial de Pedidos</h3>
            <p>Funcionalidad en desarrollo...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
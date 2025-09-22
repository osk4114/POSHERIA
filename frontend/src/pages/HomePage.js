import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { setSession, logout, getUser, isAuthenticated } from '../auth';
import { connectSocket, onForceLogout, disconnectSocket } from '../socket';
import './HomePage.css';



const HomePage = () => {

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  // Eliminado: const [selectedRole, setSelectedRole] = useState('caja');
  const [error, setError] = useState(null);
  const [socketError, setSocketError] = useState(null);
  const navigate = useNavigate();
  const user = getUser();

  // Al cargar, validar token con el backend. Si no es válido, cerrar sesión.
  useEffect(() => {
    async function validateSession() {
      if (isAuthenticated()) {
        try {
          await api.get('/api/users/me');
          // Conectar socket para sesión en tiempo real
          const u = getUser();
          if (u && u._id) {
            const socket = connectSocket(u._id);
            onForceLogout(() => {
              console.log('⚠️ [FRONTEND] Force logout recibido - cerrando sesión');
              logout(() => window.location.reload());
            });
            
            // Solo cerrar sesión en caso de desconexiones permanentes, no temporales
            if (socket) {
              socket.on('disconnect', (reason) => {
                console.log('🔌 [FRONTEND] Socket desconectado, razón:', reason);
                // Solo cerrar sesión si es una desconexión del servidor, no del cliente
                if (reason === 'io server disconnect' || reason === 'ping timeout') {
                  console.log('⚠️ [FRONTEND] Desconexión del servidor - cerrando sesión');
                  setSocketError('Conexión perdida con el servidor. Tu sesión ha sido cerrada.');
                  logout(() => window.location.reload());
                }
              });
            }
          }
        } catch (err) {
          console.log('❌ [FRONTEND] Token inválido - cerrando sesión');
          logout(() => window.location.reload());
        }
      }
    }
    validateSession();
    // No desconectar socket al navegar - solo en logout
  }, []);

  // Redirigir automáticamente si ya está autenticado
  useEffect(() => {
    if (isAuthenticated() && user) {
      console.log('🔄 Usuario ya autenticado, redirigiendo automáticamente...');
      console.log('👤 Usuario actual:', user);
      if (user.role === 'admin') {
        console.log('🚀 Redirigiendo a /admin');
        navigate('/admin');
      } else if (user.role === 'caja') {
        console.log('🚀 Redirigiendo a /caja');
        navigate('/caja');
      } else if (user.role === 'mozo') {
        console.log('🚀 Redirigiendo a /mozo');
        navigate('/mozo');
      } else if (user.role === 'cocina') {
        console.log('🚀 Redirigiendo a /cocina');
        navigate('/cocina');
      }
    }
  }, [user, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    console.log('🔐 [FRONTEND] Iniciando proceso de login...');
    try {
      console.log('📡 [FRONTEND] Enviando credenciales al servidor...');
      const res = await api.post('/api/users/login', { username, password });
      console.log('✅ [FRONTEND] Login exitoso, obteniendo datos del usuario...');
      
      const me = await api.get('/api/users/me', {
        headers: { Authorization: `Bearer ${res.data.token}` }
      });
      console.log('👤 [FRONTEND] Datos del usuario obtenidos:', me.data);
      
      setSession(res.data.token, me.data);
      console.log('💾 [FRONTEND] Sesión guardada en localStorage');
      
      // Conectar socket para sesión en tiempo real
      console.log('🔌 [FRONTEND] Conectando socket...');
      connectSocket(me.data._id);
      onForceLogout(() => {
        console.log('⚠️ [FRONTEND] Force logout recibido desde socket');
        logout(() => window.location.reload());
      });
      
      // Redirigir según rol
      console.log(`🚀 [FRONTEND] Redirigiendo a página correspondiente para rol: ${me.data.role}`);
      if (me.data.role === 'admin') navigate('/admin');
      else if (me.data.role === 'caja') navigate('/caja');
      else if (me.data.role === 'mozo') navigate('/mozo');
      else if (me.data.role === 'cocina') navigate('/cocina');
      else navigate('/');
    } catch (err) {
      console.error('❌ [FRONTEND] Error en login:', err);
      setError(err?.response?.data?.message || 'Error al iniciar sesión');
    }
  };

  if (isAuthenticated() && user) {
    return (
      <div className="login-madera-bg">
        <div className="login-bar">
          ACCESO AL SISTEMA
        </div>
        <div className="login-panel">
          <div className="login-title">Bienvenido a POSHERIA</div>
          {socketError && <div className="error">{socketError}</div>}
          <div style={{ marginBottom: 16 }}>
            Sesión iniciada como <b>{user.name}</b> ({user.role})
          </div>
          <button className="button danger" style={{ marginTop: 24 }} onClick={() => logout(() => window.location.reload())}>Cerrar sesión</button>
        </div>
      </div>
    );
  }
  return (
    <div className="login-madera-bg">
      <div className="login-bar">
        ACCESO AL SISTEMA
      </div>
      <form className="login-panel" onSubmit={handleLogin}>
        <div className="login-title">INICIO DE SESIÓN</div>
        <input
          className="input"
          type="text"
          placeholder="Usuario"
          value={username}
          onChange={e => setUsername(e.target.value)}
          autoComplete="username"
          required
        />
        <input
          className="input"
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
        <button className="button" type="submit">ENTRAR</button>
        {error && <div className="error">{error}</div>}
      </form>
    </div>
  );
};

export default HomePage;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { setSession, logout, getUser, isAuthenticated } from '../auth';
import { connectSocket, onForceLogout, disconnectSocket } from '../socket';
import '../AppBase.css';



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
              logout(() => window.location.reload());
            });
            if (socket) {
              socket.on('disconnect', () => {
                setSocketError('Conexión perdida con el servidor. Tu sesión ha sido cerrada.');
                logout(() => window.location.reload());
              });
            }
          }
        } catch (err) {
          logout(() => window.location.reload());
        }
      }
    }
    validateSession();
    // Cleanup socket al desmontar
    return () => disconnectSocket();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await api.post('/api/users/login', { username, password });
      const me = await api.get('/api/users/me', {
        headers: { Authorization: `Bearer ${res.data.token}` }
      });
      setSession(res.data.token, me.data);
      // Conectar socket para sesión en tiempo real
      connectSocket(me.data._id);
      onForceLogout(() => {
        logout(() => window.location.reload());
      });
      // Redirigir según rol
      if (me.data.role === 'admin') navigate('/admin');
      else if (me.data.role === 'caja') navigate('/caja');
      else if (me.data.role === 'mozo') navigate('/mozo');
      else if (me.data.role === 'cocina') navigate('/cocina');
      else navigate('/');
    } catch (err) {
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
          required
        />
        <input
          className="input"
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <button className="button" type="submit">ENTRAR</button>
        {error && <div className="error">{error}</div>}
      </form>
    </div>
  );
};

export default HomePage;

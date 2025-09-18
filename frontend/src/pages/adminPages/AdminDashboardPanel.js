
import React from 'react';

// Panel de navegación para el dashboard de administrador
export default function AdminDashboardPanel({ activeSection, setActiveSection, user }) {
  const adminSections = [
    { 
      id: 'usuarios', 
      label: 'Usuarios', 
      icon: '👥', 
      description: 'Gestionar usuarios del sistema' 
    },
    { 
      id: 'mesas', 
      label: 'Mesas', 
      icon: '🪑', 
      description: 'Administrar mesas del restaurante' 
    },
    { 
      id: 'menu', 
      label: 'Menú', 
      icon: '🍽️', 
      description: 'Gestionar productos del menú' 
    },
    { 
      id: 'caja', 
      label: 'Caja', 
      icon: '💰', 
      description: 'Sistema de caja y ventas' 
    },
    { 
      id: 'cocina', 
      label: 'Cocina', 
      icon: '👨‍🍳', 
      description: 'Dashboard de cocina' 
    },
    { 
      id: 'mozo', 
      label: 'Mozo', 
      icon: '🧑‍🍽️', 
      description: 'Sistema de mozos y pedidos' 
    },
    { 
      id: 'reportes', 
      label: 'Reportes', 
      icon: '📊', 
      description: 'Ver estadísticas y reportes' 
    },
    { 
      id: 'pedidos', 
      label: 'Pedidos', 
      icon: '📋', 
      description: 'Historial de pedidos' 
    }
  ];

  return (
    <div className="admin-sidebar">
      <div className="admin-sidebar-header">
        <h2>Panel Admin</h2>
        <div className="admin-user-info">
          <div className="admin-user-avatar">👤</div>
          <div className="admin-user-details">
            <span className="admin-user-name">{user?.name || 'Admin'}</span>
            <span className="admin-user-role">Administrador</span>
          </div>
        </div>
      </div>

      <nav className="admin-sidebar-nav">
        {adminSections.map(section => (
          <button
            key={section.id}
            className={`admin-nav-btn ${activeSection === section.id ? 'active' : ''}`}
            onClick={() => setActiveSection(section.id)}
            title={section.description}
          >
            <span className="nav-icon">{section.icon}</span>
            <span className="nav-label">{section.label}</span>
          </button>
        ))}
      </nav>

      <div className="admin-sidebar-footer">
        <button 
          className="admin-logout-btn"
          onClick={() => {
            localStorage.removeItem('token');
            window.location.href = '/';
          }}
        >
          🚪 Cerrar Sesión
        </button>
      </div>
    </div>
  );
}

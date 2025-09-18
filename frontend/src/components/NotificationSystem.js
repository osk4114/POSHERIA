// components/NotificationSystem.js
import React, { useState, useEffect } from 'react';
import { getSocket } from '../socket';

const NotificationSystem = () => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const socket = getSocket();
    
    if (socket) {
      // Escuchar eventos de notificaciones
      socket.on('newOrder', (data) => {
        addNotification({
          id: Date.now(),
          type: 'info',
          title: 'Nuevo Pedido',
          message: `Mesa ${data.tableNumber} - ${data.products?.length || 0} items`,
          duration: 5000
        });
      });

      socket.on('orderStatusChanged', (data) => {
        addNotification({
          id: Date.now(),
          type: 'success',
          title: 'Pedido Actualizado',
          message: `Mesa ${data.tableNumber} - ${data.status}`,
          duration: 4000
        });
      });

      socket.on('cajaEvent', (data) => {
        addNotification({
          id: Date.now(),
          type: data.type === 'opened' ? 'success' : 'warning',
          title: `Caja ${data.type === 'opened' ? 'Abierta' : 'Cerrada'}`,
          message: `Usuario: ${data.userName}`,
          duration: 3000
        });
      });

      socket.on('userLogin', (data) => {
        addNotification({
          id: Date.now(),
          type: 'info',
          title: 'Usuario Conectado',
          message: `${data.userName} (${data.role})`,
          duration: 2000
        });
      });
    }

    return () => {
      if (socket) {
        socket.off('newOrder');
        socket.off('orderStatusChanged');
        socket.off('cajaEvent');
        socket.off('userLogin');
      }
    };
  }, []);

  const addNotification = (notification) => {
    setNotifications(prev => [...prev, notification]);
    
    // Auto-remove después del duration
    setTimeout(() => {
      removeNotification(notification.id);
    }, notification.duration);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'info': return 'ℹ️';
      default: return '🔔';
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div className="notification-system">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`notification notification-${notification.type}`}
          onClick={() => removeNotification(notification.id)}
        >
          <div className="notification-icon">
            {getNotificationIcon(notification.type)}
          </div>
          <div className="notification-content">
            <div className="notification-title">{notification.title}</div>
            <div className="notification-message">{notification.message}</div>
          </div>
          <button 
            className="notification-close"
            onClick={(e) => {
              e.stopPropagation();
              removeNotification(notification.id);
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationSystem;
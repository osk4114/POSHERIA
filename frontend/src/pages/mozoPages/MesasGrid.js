import React from 'react';
import { getUser } from '../../auth';

const MesasGrid = ({ onMesaClick, mesas = [], loading = false, error = null }) => {
  const user = getUser();

  const getTableDisplayInfo = (mesa) => {
    const isMyTable = mesa.waiterId === user._id;
    const status = mesa.status || 'libre';
    
    let displayStatus = status;
    let clickable = true;
    let actionText = '';
    let cssClass = status;

    if (isMyTable) {
      displayStatus = status;
      actionText = 'Gestionar';
      cssClass = 'mia';
    } else if (status === 'libre' || !mesa.waiterId) {
      actionText = 'Tomar Mesa';
      cssClass = 'libre';
    } else {
      actionText = 'Ocupada por otro mozo';
      clickable = false;
      cssClass = 'occupied';
    }

    return {
      displayStatus,
      clickable,
      actionText,
      isMyTable,
      cssClass
    };
  };

  if (loading) {
    return (
      <div className="mesas-grid">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="mesa-card">
            <div className="loading-overlay">
              <div className="loading-spinner"></div>
            </div>
            <div className="mesa-header">
              <div className="mesa-number">Mesa -</div>
              <div className="mesa-status">Cargando...</div>
            </div>
            <div className="mesa-info">
              <div className="mesa-capacity">Capacidad: -</div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '3rem', 
        color: '#ef4444',
        background: '#fef2f2',
        borderRadius: '12px',
        border: '2px solid #fecaca'
      }}>
        <p style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>❌ Error al cargar las mesas</p>
        <p>{error}</p>
      </div>
    );
  }

  if (mesas.length === 0) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '3rem', 
        color: '#64748b',
        background: '#f8fafc',
        borderRadius: '12px',
        border: '2px dashed #cbd5e1'
      }}>
        <p style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>🍽️ No hay mesas disponibles</p>
        <p>Las mesas aparecerán aquí cuando estén disponibles</p>
      </div>
    );
  }

  return (
    <div className="mesas-grid">
      {mesas.map(mesa => {
        const displayInfo = getTableDisplayInfo(mesa);
        
        return (
          <div
            key={mesa._id}
            className={`mesa-card ${displayInfo.cssClass} ${!displayInfo.clickable ? 'disabled' : ''}`}
            onClick={() => displayInfo.clickable && onMesaClick && onMesaClick(mesa)}
            style={{ 
              cursor: displayInfo.clickable ? 'pointer' : 'not-allowed',
              opacity: displayInfo.clickable ? 1 : 0.6
            }}
          >
            <div className="mesa-header">
              <div className="mesa-number">Mesa {mesa.number}</div>
              <div className={`mesa-status ${displayInfo.displayStatus}`}>
                {displayInfo.displayStatus === 'libre' ? 'Libre' : 
                 displayInfo.displayStatus === 'ocupada' ? 'Ocupada' : 
                 displayInfo.displayStatus === 'limpiando' ? 'Limpiando' : 
                 displayInfo.displayStatus}
              </div>
            </div>
            
            <div className="mesa-info">
              <div className="mesa-capacity">
                Capacidad: {mesa.capacity} personas
              </div>
              {mesa.waiterId && mesa.waiterId !== user._id && (
                <div className="mesa-waiter">
                  Atendida por: {mesa.waiterName || 'Otro mozo'}
                </div>
              )}
            </div>
            
            <div className="mesa-actions">
              <button 
                className={`mesa-btn ${displayInfo.isMyTable ? 'primary' : 
                           displayInfo.clickable ? 'success' : 'disabled'}`}
                disabled={!displayInfo.clickable}
                onClick={(e) => {
                  e.stopPropagation();
                  if (displayInfo.clickable && onMesaClick) {
                    onMesaClick(mesa);
                  }
                }}
              >
                {loading ? <div className="loading-spinner"></div> : displayInfo.actionText}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MesasGrid;

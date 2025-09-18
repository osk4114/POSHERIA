import React, { useState, useEffect } from 'react';
import api from '../api';
import './CajaSystem.css';

const CajaSystem = ({ user, onCajaStateChange }) => {
  const [cajaState, setCajaState] = useState({
    isOpen: false,
    confirmed: false,
    cajaId: null,
    initialAmount: 0,
    currentAmount: 0,
    movements: [],
    openedAt: null
  });
  
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [initialAmount, setInitialAmount] = useState(100);
  const [finalAmount, setFinalAmount] = useState(0);
  const [movementData, setMovementData] = useState({
    type: 'ingreso',
    amount: '',
    description: ''
  });
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    checkCajaStatus();
    fetchHistorial();
  }, [user]);

  const checkCajaStatus = async () => {
    try {
      const response = await api.get(`/api/caja/estado?assignedTo=${user._id}`);
      const caja = response.data;
      
      setCajaState({
        isOpen: true,
        confirmed: caja.confirmed,
        cajaId: caja._id,
        initialAmount: caja.initialAmount,
        currentAmount: calculateCurrentAmount(caja),
        movements: caja.movements || [],
        openedAt: caja.createdAt
      });
      
      if (onCajaStateChange) {
        onCajaStateChange(true, caja.confirmed);
      }
    } catch (err) {
      setCajaState({
        isOpen: false,
        confirmed: false,
        cajaId: null,
        initialAmount: 0,
        currentAmount: 0,
        movements: [],
        openedAt: null
      });
      
      if (onCajaStateChange) {
        onCajaStateChange(false, false);
      }
    }
  };

  const calculateCurrentAmount = (caja) => {
    let amount = caja.initialAmount;
    caja.movements?.forEach(mov => {
      if (mov.type === 'ingreso') {
        amount += mov.amount;
      } else {
        amount -= mov.amount;
      }
    });
    return amount;
  };

  const fetchHistorial = async () => {
    try {
      const response = await api.get(`/api/caja/historial?assignedTo=${user._id}`);
      setHistorial(response.data);
    } catch (err) {
      console.error('Error fetching historial:', err);
    }
  };

  const handleOpenCaja = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/api/caja/abrir', {
        assignedTo: user._id,
        initialAmount: initialAmount
      });
      
      setSuccess('Caja abierta. Confirma el monto inicial para comenzar.');
      setShowOpenModal(false);
      checkCajaStatus();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al abrir caja');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCaja = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await api.post('/api/caja/confirmar', {
        cajaId: cajaState.cajaId
      });
      
      setSuccess('Caja confirmada. Ya puedes procesar ventas.');
      checkCajaStatus();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al confirmar caja');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMovement = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await api.post('/api/caja/movimiento', {
        cajaId: cajaState.cajaId,
        type: movementData.type,
        amount: parseFloat(movementData.amount),
        description: movementData.description
      });
      
      setSuccess(`${movementData.type === 'ingreso' ? 'Ingreso' : 'Egreso'} registrado correctamente`);
      setMovementData({ type: 'ingreso', amount: '', description: '' });
      setShowMovementModal(false);
      checkCajaStatus();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al registrar movimiento');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseCaja = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await api.post('/api/caja/cerrar', {
        cajaId: cajaState.cajaId,
        finalAmount: finalAmount
      });
      
      setSuccess('Caja cerrada correctamente');
      setShowCloseModal(false);
      checkCajaStatus();
      fetchHistorial();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cerrar caja');
    } finally {
      setLoading(false);
    }
  };

  const handleCleanCaja = async () => {
    if (!window.confirm('¿Estás seguro? Esto eliminará todas las cajas abiertas (solo para testing)')) {
      return;
    }
    
    try {
      await api.delete(`/api/caja/limpiar?assignedTo=${user._id}`);
      setSuccess('Cajas limpiadas');
      checkCajaStatus();
    } catch (err) {
      setError('Error al limpiar cajas');
    }
  };

  return (
    <div className="caja-system">
      <div className="caja-header">
        <h3>Sistema de Caja</h3>
        <div className="caja-status">
          <span className={`status-badge ${cajaState.isOpen ? 'open' : 'closed'}`}>
            {cajaState.isOpen ? 
              (cajaState.confirmed ? 'Caja Confirmada' : 'Pendiente Confirmación') : 
              'Caja Cerrada'
            }
          </span>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="caja-content">
        {!cajaState.isOpen ? (
          <div className="caja-closed">
            <h4>Caja Cerrada</h4>
            <p>Debes abrir la caja para comenzar a trabajar</p>
            <button 
              className="btn btn-primary"
              onClick={() => setShowOpenModal(true)}
            >
              Abrir Caja
            </button>
            <button 
              className="btn btn-outline"
              onClick={handleCleanCaja}
              style={{ marginLeft: '10px' }}
            >
              Limpiar Cajas (Test)
            </button>
          </div>
        ) : !cajaState.confirmed ? (
          <div className="caja-pending">
            <h4>Confirma el Monto Inicial</h4>
            <p>Monto inicial asignado: <strong>S/. {cajaState.initialAmount.toFixed(2)}</strong></p>
            <p>Verifica el dinero en caja y confirma para continuar</p>
            <button 
              className="btn btn-success"
              onClick={handleConfirmCaja}
              disabled={loading}
            >
              {loading ? 'Confirmando...' : 'Confirmar Monto'}
            </button>
          </div>
        ) : (
          <div className="caja-active">
            <div className="caja-summary">
              <div className="summary-item">
                <label>Monto Inicial:</label>
                <span>S/. {cajaState.initialAmount.toFixed(2)}</span>
              </div>
              <div className="summary-item">
                <label>Monto Actual:</label>
                <span className="current-amount">S/. {cajaState.currentAmount.toFixed(2)}</span>
              </div>
              <div className="summary-item">
                <label>Movimientos:</label>
                <span>{cajaState.movements.length}</span>
              </div>
            </div>

            <div className="caja-actions">
              <button 
                className="btn btn-primary"
                onClick={() => setShowMovementModal(true)}
              >
                Registrar Movimiento
              </button>
              <button 
                className="btn btn-danger"
                onClick={() => {
                  setFinalAmount(cajaState.currentAmount);
                  setShowCloseModal(true);
                }}
              >
                Cerrar Caja
              </button>
            </div>

            {cajaState.movements.length > 0 && (
              <div className="movements-list">
                <h4>Últimos Movimientos</h4>
                <div className="movements">
                  {cajaState.movements.slice(-5).map((mov, index) => (
                    <div key={index} className={`movement ${mov.type}`}>
                      <div className="movement-info">
                        <span className="movement-type">
                          {mov.type === 'ingreso' ? '↗️' : '↙️'} 
                          {mov.type === 'ingreso' ? 'Ingreso' : 'Egreso'}
                        </span>
                        <span className="movement-description">{mov.description}</span>
                      </div>
                      <span className={`movement-amount ${mov.type}`}>
                        {mov.type === 'ingreso' ? '+' : '-'}S/. {mov.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Abrir Caja */}
      {showOpenModal && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Abrir Caja</h3>
              <button className="close-btn" onClick={() => setShowOpenModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Monto Inicial (S/.)</label>
                <input
                  type="number"
                  value={initialAmount}
                  onChange={(e) => setInitialAmount(parseFloat(e.target.value) || 0)}
                  step="0.50"
                  min="0"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowOpenModal(false)}>
                Cancelar
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleOpenCaja}
                disabled={loading}
              >
                {loading ? 'Abriendo...' : 'Abrir Caja'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Registrar Movimiento */}
      {showMovementModal && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Registrar Movimiento</h3>
              <button className="close-btn" onClick={() => setShowMovementModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Tipo de Movimiento</label>
                <select
                  value={movementData.type}
                  onChange={(e) => setMovementData({...movementData, type: e.target.value})}
                >
                  <option value="ingreso">Ingreso</option>
                  <option value="egreso">Egreso</option>
                </select>
              </div>
              <div className="form-group">
                <label>Monto (S/.)</label>
                <input
                  type="number"
                  value={movementData.amount}
                  onChange={(e) => setMovementData({...movementData, amount: e.target.value})}
                  step="0.50"
                  min="0"
                />
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <input
                  type="text"
                  value={movementData.description}
                  onChange={(e) => setMovementData({...movementData, description: e.target.value})}
                  placeholder="Describe el movimiento..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowMovementModal(false)}>
                Cancelar
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleAddMovement}
                disabled={loading || !movementData.amount || !movementData.description}
              >
                {loading ? 'Registrando...' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cerrar Caja */}
      {showCloseModal && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Cerrar Caja</h3>
              <button className="close-btn" onClick={() => setShowCloseModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="close-summary">
                <p><strong>Monto Calculado:</strong> S/. {cajaState.currentAmount.toFixed(2)}</p>
                <div className="form-group">
                  <label>Monto Final Contado (S/.)</label>
                  <input
                    type="number"
                    value={finalAmount}
                    onChange={(e) => setFinalAmount(parseFloat(e.target.value) || 0)}
                    step="0.50"
                    min="0"
                  />
                </div>
                {Math.abs(finalAmount - cajaState.currentAmount) > 0.01 && (
                  <div className="difference">
                    <strong>Diferencia: S/. {(finalAmount - cajaState.currentAmount).toFixed(2)}</strong>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCloseModal(false)}>
                Cancelar
              </button>
              <button 
                className="btn btn-danger" 
                onClick={handleCloseCaja}
                disabled={loading}
              >
                {loading ? 'Cerrando...' : 'Cerrar Caja'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CajaSystem;
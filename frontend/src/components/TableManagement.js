import React, { useState, useEffect } from 'react';
import api from '../api';

const TableManagement = () => {
  const [mesas, setMesas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusMsg, setStatusMsg] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [newTable, setNewTable] = useState({
    number: '',
    capacity: 4,
    status: 'free'
  });

  useEffect(() => {
    fetchMesas();
  }, []);

  const fetchMesas = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/tables');
      setMesas(response.data);
    } catch (err) {
      setError('Error al cargar las mesas');
      console.error('Error fetching tables:', err);
    } finally {
      setLoading(false);
    }
  };

  const createTable = async (e) => {
    e.preventDefault();
    setStatusMsg(null);
    try {
      await api.post('/api/tables', newTable);
      setStatusMsg('Mesa creada exitosamente');
      setNewTable({ number: '', capacity: 4, status: 'free' });
      setShowCreateForm(false);
      fetchMesas();
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err) {
      setError('Error al crear la mesa');
      setTimeout(() => setError(null), 3000);
    }
  };

  const updateTable = async (tableId, updates) => {
    setStatusMsg(null);
    try {
      await api.put(`/api/tables/${tableId}`, updates);
      setStatusMsg('Mesa actualizada exitosamente');
      setEditingTable(null);
      fetchMesas();
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err) {
      setError('Error al actualizar la mesa');
      setTimeout(() => setError(null), 3000);
    }
  };

  const deleteTable = async (tableId) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta mesa?')) {
      return;
    }
    
    setStatusMsg(null);
    try {
      await api.delete(`/api/tables/${tableId}`);
      setStatusMsg('Mesa eliminada exitosamente');
      fetchMesas();
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err) {
      setError('Error al eliminar la mesa');
      setTimeout(() => setError(null), 3000);
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      'free': 'Libre',
      'occupied': 'Ocupada',
      'reserved': 'Reservada',
      'cleaning': 'Limpiando'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      'free': '#10b981',
      'occupied': '#f59e0b',
      'reserved': '#3b82f6',
      'cleaning': '#6b7280'
    };
    return colors[status] || '#6b7280';
  };

  return (
    <div className="table-management">
      <div className="table-management-header">
        <h2>Gestión de Mesas</h2>
        <button 
          className="admin-btn admin-btn-primary"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Cancelar' : '+ Nueva Mesa'}
        </button>
      </div>

      {/* Mensajes de estado */}
      {error && <div className="admin-error-msg">{error}</div>}
      {statusMsg && <div className="admin-status-msg">{statusMsg}</div>}

      {/* Formulario de crear mesa */}
      {showCreateForm && (
        <div className="table-form-container">
          <h3>Crear Nueva Mesa</h3>
          <form onSubmit={createTable} className="table-form">
            <div className="form-row">
              <div className="form-group">
                <label>Número de Mesa</label>
                <input
                  type="number"
                  value={newTable.number}
                  onChange={(e) => setNewTable({...newTable, number: parseInt(e.target.value)})}
                  className="admin-input"
                  required
                  min="1"
                />
              </div>
              <div className="form-group">
                <label>Capacidad</label>
                <input
                  type="number"
                  value={newTable.capacity}
                  onChange={(e) => setNewTable({...newTable, capacity: parseInt(e.target.value)})}
                  className="admin-input"
                  required
                  min="1"
                  max="12"
                />
              </div>
              <div className="form-group">
                <label>Estado</label>
                <select
                  value={newTable.status}
                  onChange={(e) => setNewTable({...newTable, status: e.target.value})}
                  className="admin-select"
                >
                  <option value="free">Libre</option>
                  <option value="occupied">Ocupada</option>
                  <option value="reserved">Reservada</option>
                  <option value="cleaning">Limpiando</option>
                </select>
              </div>
            </div>
            <button type="submit" className="admin-btn admin-btn-success">
              Crear Mesa
            </button>
          </form>
        </div>
      )}

      {/* Grid de mesas */}
      {loading ? (
        <div className="tables-loading">Cargando mesas...</div>
      ) : (
        <div className="tables-grid">
          {mesas.map((mesa) => (
            <div key={mesa._id} className="table-card">
              <div className="table-card-header">
                <h3 className="table-number">Mesa {mesa.number}</h3>
                <div 
                  className="table-status-badge"
                  style={{ backgroundColor: getStatusColor(mesa.status) }}
                >
                  {getStatusLabel(mesa.status)}
                </div>
              </div>
              
              <div className="table-card-body">
                <div className="table-info">
                  <div className="table-capacity">
                    👥 Capacidad: {mesa.capacity || 4} personas
                  </div>
                  {mesa.waiterId && (
                    <div className="table-waiter">
                      🧑‍🍳 Mozo asignado
                    </div>
                  )}
                  {mesa.waiterStatus && (
                    <div className="table-waiter-status">
                      Estado: {mesa.waiterStatus}
                    </div>
                  )}
                </div>
                
                <div className="table-actions">
                  {editingTable === mesa._id ? (
                    <div className="edit-form">
                      <select
                        value={mesa.status}
                        onChange={(e) => updateTable(mesa._id, { status: e.target.value })}
                        className="admin-select-small"
                      >
                        <option value="free">Libre</option>
                        <option value="occupied">Ocupada</option>
                        <option value="reserved">Reservada</option>
                        <option value="cleaning">Limpiando</option>
                      </select>
                      <button 
                        onClick={() => setEditingTable(null)}
                        className="admin-btn admin-btn-sm admin-btn-secondary"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <>
                      <button 
                        onClick={() => setEditingTable(mesa._id)}
                        className="admin-btn admin-btn-sm admin-btn-warning"
                      >
                        Editar
                      </button>
                      <button 
                        onClick={() => deleteTable(mesa._id)}
                        className="admin-btn admin-btn-sm admin-btn-danger"
                      >
                        Eliminar
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Estado vacío */}
      {!loading && mesas.length === 0 && (
        <div className="tables-empty">
          <div className="empty-icon">🪑</div>
          <h3>No hay mesas registradas</h3>
          <p>Crea la primera mesa para comenzar</p>
        </div>
      )}
    </div>
  );
};

export default TableManagement;
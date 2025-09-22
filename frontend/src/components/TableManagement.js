import React, { useState, useEffect } from 'react';
import api from '../api';
import { getSocket } from '../socket';

const TableManagement = () => {
  const [mesas, setMesas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [operationLoading, setOperationLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusMsg, setStatusMsg] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [editingCapacity, setEditingCapacity] = useState(null);
  const [newTable, setNewTable] = useState({
    number: '',
    capacity: 4,
    status: 'free'
  });
  const [tempCapacity, setTempCapacity] = useState(4);

  useEffect(() => {
    fetchMesas();
    
    // Configurar listener de WebSocket para actualizaciones en tiempo real
    const socket = getSocket();
    if (socket) {
      const handleTableUpdate = (data) => {
        console.log('🪑 [ADMIN TABLES] Mesa actualizada via WebSocket:', data);
        
        if (data.action === 'created') {
          setMesas(prevMesas => [...prevMesas, data.table]);
          setStatusMsg('✅ Nueva mesa creada en tiempo real');
          setTimeout(() => setStatusMsg(null), 3000);
        } else if (data.action === 'updated') {
          setMesas(prevMesas => 
            prevMesas.map(m => m._id === data.table._id ? data.table : m)
          );
        } else if (data.action === 'deleted') {
          setMesas(prevMesas => 
            prevMesas.filter(m => m._id !== data.tableId)
          );
          setStatusMsg('ℹ️ Mesa eliminada en tiempo real');
          setTimeout(() => setStatusMsg(null), 3000);
        }
      };
      
      socket.on('tableUpdated', handleTableUpdate);
      
      // Limpiar listener al desmontar
      return () => {
        socket.off('tableUpdated', handleTableUpdate);
      };
    }
  }, []);

  const fetchMesas = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('🔄 [ADMIN TABLES] Cargando mesas...');
      const response = await api.get('/api/tables');
      const mesasValidas = Array.isArray(response.data) ? response.data : [];
      setMesas(mesasValidas);
      console.log(`✅ [ADMIN TABLES] Mesas cargadas: ${mesasValidas.length}`);
    } catch (err) {
      console.error('❌ [ADMIN TABLES] Error al cargar mesas:', err);
      setError('Error al cargar las mesas');
      setMesas([]);
    } finally {
      setLoading(false);
    }
  };

  const createTable = async (e) => {
    e.preventDefault();
    setStatusMsg(null);
    setError(null);
    setOperationLoading(true);
    
    try {
      console.log('➕ [ADMIN TABLES] Creando nueva mesa:', newTable);
      await api.post('/api/tables', newTable);
      setStatusMsg('✅ Mesa creada exitosamente');
      setNewTable({ number: '', capacity: 4, status: 'free' });
      setShowCreateForm(false);
      
      // Recarga inmediata después de crear (encapsulación)
      console.log('🔄 [ADMIN TABLES] Recarga inmediata después de crear mesa');
      await fetchMesas();
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err) {
      console.error('❌ [ADMIN TABLES] Error al crear mesa:', err);
      setError(err?.response?.data?.message || 'Error al crear la mesa');
      setTimeout(() => setError(null), 3000);
    } finally {
      setOperationLoading(false);
    }
  };

  const updateTable = async (tableId, updates) => {
    setStatusMsg(null);
    setError(null);
    setOperationLoading(true);
    
    try {
      console.log('📝 [ADMIN TABLES] Actualizando mesa:', tableId, updates);
      await api.put(`/api/tables/${tableId}`, updates);
      setStatusMsg('✅ Mesa actualizada exitosamente');
      setEditingTable(null);
      setEditingCapacity(null);
      
      // Recarga inmediata después de actualizar (encapsulación)
      console.log('🔄 [ADMIN TABLES] Recarga inmediata después de actualizar mesa');
      await fetchMesas();
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err) {
      console.error('❌ [ADMIN TABLES] Error al actualizar mesa:', err);
      setError(err?.response?.data?.message || 'Error al actualizar la mesa');
      setTimeout(() => setError(null), 3000);
    } finally {
      setOperationLoading(false);
    }
  };

  const deleteTable = async (tableId) => {
    const mesa = mesas.find(m => m._id === tableId);
    
    if (mesa && mesa.status === 'occupied') {
      setError('No se puede eliminar una mesa que está ocupada');
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta mesa?')) {
      return;
    }
    
    setStatusMsg(null);
    setError(null);
    setOperationLoading(true);
    
    try {
      console.log('🗑️ [ADMIN TABLES] Eliminando mesa:', tableId);
      await api.delete(`/api/tables/${tableId}`);
      setStatusMsg('✅ Mesa eliminada exitosamente');
      
      // Recarga inmediata después de eliminar (encapsulación)
      console.log('🔄 [ADMIN TABLES] Recarga inmediata después de eliminar mesa');
      await fetchMesas();
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err) {
      console.error('❌ [ADMIN TABLES] Error al eliminar mesa:', err);
      setError(err?.response?.data?.message || 'Error al eliminar la mesa');
      setTimeout(() => setError(null), 3000);
    } finally {
      setOperationLoading(false);
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

  // Recarga manual de datos (encapsulamiento)
  const handleManualReload = async () => {
    setOperationLoading(true);
    try {
      console.log('🔄 [ADMIN TABLES] Recarga manual iniciada...');
      await fetchMesas();
      setStatusMsg('✅ Mesas actualizadas correctamente');
      setTimeout(() => setStatusMsg(null), 3000);
      console.log('✅ [ADMIN TABLES] Recarga manual completada');
    } catch (err) {
      console.error('❌ [ADMIN TABLES] Error en recarga manual:', err);
      setError('Error al actualizar las mesas');
      setTimeout(() => setError(null), 3000);
    } finally {
      setOperationLoading(false);
    }
  };

  return (
    <div className="table-management">
      <div className="table-management-header">
        <div className="table-header-info">
          <h2>Gestión de Mesas</h2>
          <div className="table-stats">
            <span className="stat">📊 Total: {mesas.length}</span>
            <span className="stat stat-free">
              🟢 Libres: {mesas.filter(m => m.status === 'free').length}
            </span>
            <span className="stat stat-occupied">
              🟡 Ocupadas: {mesas.filter(m => m.status === 'occupied').length}
            </span>
            <span className="stat stat-reserved">
              🔵 Reservadas: {mesas.filter(m => m.status === 'reserved').length}
            </span>
          </div>
        </div>
        <div className="table-header-actions">
          <button 
            className="admin-btn admin-btn-refresh"
            onClick={handleManualReload}
            disabled={operationLoading || loading}
            title="Actualizar lista de mesas"
          >
            {operationLoading || loading ? '🔄 Actualizando...' : '🔄 Actualizar'}
          </button>
          <button 
            className="admin-btn admin-btn-primary"
            onClick={() => setShowCreateForm(!showCreateForm)}
            disabled={operationLoading}
          >
            {showCreateForm ? '❌ Cancelar' : '➕ Nueva Mesa'}
          </button>
        </div>
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
            <button type="submit" className="admin-btn admin-btn-success" disabled={operationLoading}>
              {operationLoading ? '⏳ Creando...' : 'Crear Mesa'}
            </button>
          </form>
        </div>
      )}

      {/* Grid de mesas */}
      {loading ? (
        <div className="tables-loading">
          <div>🔄 Cargando mesas...</div>
        </div>
      ) : (
        <div className="tables-grid">
          {mesas.map((mesa) => (
            <div key={mesa._id} className="table-card" data-status={mesa.status}>
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
                    {editingCapacity === mesa._id ? (
                      <div className="capacity-edit">
                        <input
                          type="number"
                          value={tempCapacity}
                          onChange={(e) => setTempCapacity(parseInt(e.target.value))}
                          min="1"
                          max="12"
                          className="admin-input-small"
                          style={{ width: '60px', marginLeft: '10px' }}
                        />
                        <button 
                          onClick={() => {
                            updateTable(mesa._id, { capacity: tempCapacity });
                            setEditingCapacity(null);
                          }}
                          className="admin-btn admin-btn-sm admin-btn-success"
                          style={{ marginLeft: '5px' }}
                        >
                          ✓
                        </button>
                        <button 
                          onClick={() => setEditingCapacity(null)}
                          className="admin-btn admin-btn-sm admin-btn-secondary"
                          style={{ marginLeft: '5px' }}
                        >
                          ✗
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => {
                          setEditingCapacity(mesa._id);
                          setTempCapacity(mesa.capacity || 4);
                        }}
                        className="edit-capacity-btn"
                        title="Editar capacidad"
                      >
                        ✏️
                      </button>
                    )}
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
                  <div className="table-created">
                    📅 Creada: {new Date(mesa.createdAt || Date.now()).toLocaleDateString('es-AR')}
                  </div>
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
                        title="Cambiar estado de la mesa"
                        disabled={operationLoading}
                      >
                        ✏️ Editar
                      </button>
                      <button 
                        onClick={() => deleteTable(mesa._id)}
                        className="admin-btn admin-btn-sm admin-btn-danger"
                        title="Eliminar mesa permanentemente"
                        disabled={mesa.status === 'occupied' || operationLoading}
                      >
                        {operationLoading ? '⏳' : '🗑️'} Eliminar
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
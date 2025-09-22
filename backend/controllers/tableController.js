// controllers/tableController.js
const { ObjectId } = require('mongodb');
const Table = require('../models/tableModel');
const { getDB } = require('../config/mongo');

// Crear mesa
async function crearMesa(req, res) {
  try {
    const db = getDB();
    const { number, status } = req.body;
    const mesa = new Table({ number, status });
    const result = await db.collection('tables').insertOne(mesa);
    
    // Emitir evento de WebSocket para sincronizar cambios
    if (global._io) {
      global._io.emit('tableUpdated', {
        action: 'created',
        table: { ...mesa, _id: result.insertedId }
      });
      console.log('🔄 [WEBSOCKET] Evento tableUpdated emitido (created):', number);
    }
    
    res.json({ message: 'Mesa creada', mesaId: result.insertedId });
  } catch (err) {
    res.status(500).json({ message: 'Error al crear mesa', error: err.message });
  }
}

// Listar mesas
async function listarMesas(req, res) {
  try {
    const db = getDB();
    const mesas = await db.collection('tables').find().toArray();
    res.json(mesas);
  } catch (err) {
    res.status(500).json({ message: 'Error al listar mesas', error: err.message });
  }
}

// Asignar mesa al mozo (mozo toma la mesa)
async function asignarMesa(req, res) {
  try {
    console.log('🔄 [DEBUG] asignarMesa iniciado');
    const db = getDB();
    const { id } = req.params;
    const waiterId = req.user && req.user._id;
    
    console.log('🔄 [DEBUG] Parámetros asignarMesa:', { id, waiterId, user: req.user });
    
    if (!waiterId) {
      console.log('❌ [DEBUG] No se encontró waiterId');
      return res.status(400).json({ message: 'No se encontró el ID del mozo autenticado.' });
    }
    
    // Verificar que el ID sea válido
    try {
      new ObjectId(id);
    } catch (objIdError) {
      console.log('❌ [DEBUG] ID de mesa inválido:', objIdError);
      return res.status(400).json({ message: 'ID de mesa inválido' });
    }
    
    console.log('🔄 [DEBUG] Ejecutando findOneAndUpdate...');
    
    // Solo puede tomar la mesa si está libre o limpiando y sin mozo asignado
    const result = await db.collection('tables').findOneAndUpdate(
      { 
        _id: new ObjectId(id), 
        waiterId: null, 
        status: { $in: ['free', 'limpiando'] } 
      },
      { $set: { waiterId: new ObjectId(waiterId), status: 'occupied', updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    
    console.log('🔄 [DEBUG] Resultado de findOneAndUpdate asignar:', result);
    
    // Manejar diferentes formatos de respuesta del driver MongoDB
    const updatedTable = result.value || result;
    
    if (!updatedTable || !updatedTable._id) {
      console.log('❌ [DEBUG] Mesa no disponible para asignar');
      return res.status(400).json({ message: 'La mesa no está disponible para asignar' });
    }
    
    // Emitir evento de WebSocket para sincronizar cambios
    if (global._io) {
      global._io.emit('tableUpdated', {
        action: 'updated',
        table: updatedTable
      });
      console.log('🔄 [WEBSOCKET] Mesa asignada, evento emitido:', updatedTable.number);
    }
    
    console.log('✅ [DEBUG] Mesa asignada exitosamente');
    res.json({ message: 'Mesa asignada al mozo', mesa: updatedTable });
  } catch (err) {
    console.error('❌ [DEBUG] Error en asignarMesa:', err);
    res.status(500).json({ message: 'Error al asignar mesa', error: err.message });
  }
}

// Liberar mesa (mozo termina la atención)
async function liberarMesa(req, res) {
  try {
    console.log('🔄 [DEBUG] liberarMesa iniciado');
    const db = getDB();
    const { id } = req.params;
    const waiterId = req.user._id;
    
    console.log('🔄 [DEBUG] Parámetros:', { id, waiterId });
    
    // Solo el mozo asignado puede liberar la mesa
    const result = await db.collection('tables').findOneAndUpdate(
      { _id: new ObjectId(id), waiterId: new ObjectId(waiterId) },
      { $set: { waiterId: null, status: 'free', updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    
    console.log('🔄 [DEBUG] Resultado de findOneAndUpdate:', result);
    
    // Manejar diferentes formatos de respuesta del driver MongoDB
    const updatedTable = result.value || result;
    
    if (!updatedTable || !updatedTable._id) {
      console.log('❌ [DEBUG] No se pudo liberar la mesa');
      return res.status(400).json({ message: 'No puedes liberar esta mesa' });
    }
    
    // Emitir evento de WebSocket para sincronizar cambios
    if (global._io) {
      global._io.emit('tableUpdated', {
        action: 'updated',
        table: updatedTable
      });
      console.log('🔄 [WEBSOCKET] Mesa liberada, evento emitido:', updatedTable.number);
    }
    
    console.log('✅ [DEBUG] Mesa liberada exitosamente');
    res.json({ message: 'Mesa liberada', mesa: updatedTable });
  } catch (err) {
    console.error('❌ [DEBUG] Error en liberarMesa:', err);
    res.status(500).json({ message: 'Error al liberar mesa', error: err.message });
  }
}

// Actualizar mesa
async function actualizarMesa(req, res) {
  try {
    const db = getDB();
    const { id } = req.params;
    const update = req.body;
    console.log('[actualizarMesa] id recibido:', id);
    let objectId;
    try {
      objectId = new ObjectId(id);
    } catch (e) {
      console.error('[actualizarMesa] Error al convertir id a ObjectId:', e);
      return res.status(400).json({ message: 'ID de mesa inválido', error: e.message });
    }
    const result = await db.collection('tables').findOneAndUpdate(
      { _id: objectId },
      { $set: update },
      { returnDocument: 'after' }
    );
    console.log('[actualizarMesa] Resultado de búsqueda:', result);
    // Compatibilidad con distintos drivers: el valor actualizado puede estar en result.value o result (si es el documento mismo)
    const mesaActualizada = result.value || result;
    if (!mesaActualizada || (typeof mesaActualizada === 'object' && Object.keys(mesaActualizada).length === 0)) {
      return res.status(404).json({ message: 'Mesa no encontrada' });
    }
    
    // Emitir evento de WebSocket para sincronizar cambios
    if (global._io) {
      global._io.emit('tableUpdated', {
        action: 'updated',
        table: mesaActualizada
      });
      console.log('🔄 [WEBSOCKET] Evento tableUpdated emitido:', mesaActualizada.number);
    }
    
    res.json({ message: 'Mesa actualizada', mesa: mesaActualizada });
  } catch (err) {
    console.error('[actualizarMesa] Error general:', err);
    res.status(500).json({ message: 'Error al actualizar mesa', error: err.message });
  }
}

// Eliminar mesa
async function eliminarMesa(req, res) {
  try {
    const db = getDB();
    const { id } = req.params;
    const result = await db.collection('tables').deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) return res.status(404).json({ message: 'Mesa no encontrada' });
    
    // Emitir evento de WebSocket para sincronizar cambios
    if (global._io) {
      global._io.emit('tableUpdated', {
        action: 'deleted',
        tableId: id
      });
      console.log('🔄 [WEBSOCKET] Evento tableUpdated emitido (deleted):', id);
    }
    
    res.json({ message: 'Mesa eliminada' });
  } catch (err) {
    res.status(500).json({ message: 'Error al eliminar mesa', error: err.message });
  }
}

// Obtener estadísticas de mesas ocupadas
async function getMesasOcupadas(req, res) {
  try {
    const db = getDB();
    const tables = db.collection('tables');
    
    // Contar mesas ocupadas
    const mesasOcupadas = await tables.countDocuments({
      status: 'occupied'
    });
    
    res.json({ ocupadas: mesasOcupadas });
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener mesas ocupadas', error: err.message });
  }
}

module.exports = {
  crearMesa,
  listarMesas,
  actualizarMesa,
  eliminarMesa,
  asignarMesa,
  liberarMesa,
  getMesasOcupadas
};

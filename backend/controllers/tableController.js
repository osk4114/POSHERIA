// Asignar mesa al mozo (mozo toma la mesa)
async function asignarMesa(req, res) {
  try {
    const db = getDB();
    const { id } = req.params;
    const waiterId = req.user && req.user._id;
    console.log('DEBUG asignarMesa - req.user:', req.user);
    if (!waiterId) {
      return res.status(400).json({ message: 'No se encontró el ID del mozo autenticado.' });
    }
    // Solo puede tomar la mesa si está libre y sin mozo asignado
    const result = await db.collection('tables').findOneAndUpdate(
      { _id: new ObjectId(id), waiterId: null, waiterStatus: 'libre', status: 'free' },
      { $set: { waiterId: new ObjectId(waiterId), waiterStatus: 'atendiendo', status: 'occupied', updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    if (!result.value) return res.status(400).json({ message: 'La mesa no está disponible para asignar' });
    res.json({ message: 'Mesa asignada al mozo', mesa: result.value });
  } catch (err) {
    console.error('ERROR asignarMesa:', err);
    res.status(500).json({ message: 'Error al asignar mesa', error: err.message });
  }
}

// Liberar mesa (mozo termina la atención)
async function liberarMesa(req, res) {
  try {
    const db = getDB();
    const { id } = req.params;
    const waiterId = req.user._id;
    // Solo el mozo asignado puede liberar la mesa
    const result = await db.collection('tables').findOneAndUpdate(
      { _id: new ObjectId(id), waiterId: new ObjectId(waiterId), waiterStatus: 'atendiendo' },
      { $set: { waiterId: null, waiterStatus: 'libre', status: 'free', updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    if (!result.value) return res.status(400).json({ message: 'No puedes liberar esta mesa' });
    res.json({ message: 'Mesa liberada', mesa: result.value });
  } catch (err) {
    res.status(500).json({ message: 'Error al liberar mesa', error: err.message });
  }
}
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
    res.json({ message: 'Mesa eliminada' });
  } catch (err) {
    res.status(500).json({ message: 'Error al eliminar mesa', error: err.message });
  }
}

module.exports = {
  crearMesa,
  listarMesas,
  actualizarMesa,
  eliminarMesa,
  asignarMesa,
  liberarMesa
};

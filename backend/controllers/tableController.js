// controllers/tableController.js
const { ObjectId } = require('mongodb');
const Table = require('../models/tableModel');
const getDb = require('../config/mongo');

// Crear mesa
async function crearMesa(req, res) {
  try {
    const db = await getDb();
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
    const db = await getDb();
    const mesas = await db.collection('tables').find().toArray();
    res.json(mesas);
  } catch (err) {
    res.status(500).json({ message: 'Error al listar mesas', error: err.message });
  }
}

// Actualizar mesa
async function actualizarMesa(req, res) {
  try {
    const db = await getDb();
    const { id } = req.params;
    const update = req.body;
    const result = await db.collection('tables').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: update },
      { returnDocument: 'after' }
    );
    if (!result.value) return res.status(404).json({ message: 'Mesa no encontrada' });
    res.json({ message: 'Mesa actualizada', mesa: result.value });
  } catch (err) {
    res.status(500).json({ message: 'Error al actualizar mesa', error: err.message });
  }
}

// Eliminar mesa
async function eliminarMesa(req, res) {
  try {
    const db = await getDb();
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
  eliminarMesa
};

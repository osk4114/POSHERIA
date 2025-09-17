// controllers/cajaController.js
const { ObjectId } = require('mongodb');
const Caja = require('../models/cajaModel');
const { getDB } = require('../config/mongo');

// Abrir caja
async function abrirCaja(req, res) {
  try {
  const db = getDB();
    const { assignedTo, initialAmount } = req.body;
    // Verificar si ya hay una caja abierta para el usuario
    const cajaAbierta = await db.collection('cajas').findOne({ assignedTo: new ObjectId(assignedTo), status: 'open' });
    if (cajaAbierta) {
      return res.status(400).json({ message: 'Ya existe una caja abierta para este usuario.' });
    }
    const caja = new Caja({ assignedTo, initialAmount, status: 'open', createdAt: new Date() });
    const result = await db.collection('cajas').insertOne(caja);
    res.json({ message: 'Caja abierta', cajaId: result.insertedId });
  } catch (err) {
    res.status(500).json({ message: 'Error al abrir caja', error: err.message });
  }
}

// Registrar movimiento (ingreso/egreso)
async function registrarMovimiento(req, res) {
  try {
  const db = getDB();
    const { cajaId, type, amount, description, orderId } = req.body;
    const movimiento = {
      type,
      amount,
      description,
      orderId: orderId ? new ObjectId(orderId) : undefined,
      createdAt: new Date()
    };
    const caja = await db.collection('cajas').findOneAndUpdate(
      { _id: new ObjectId(cajaId), status: 'open' },
      { $push: { movements: movimiento } },
      { returnDocument: 'after' }
    );
    if (!caja.value) return res.status(404).json({ message: 'Caja no encontrada o cerrada' });
    res.json({ message: 'Movimiento registrado', caja: caja.value });
  } catch (err) {
    res.status(500).json({ message: 'Error al registrar movimiento', error: err.message });
  }
}

// Cerrar caja
async function cerrarCaja(req, res) {
  try {
  const db = getDB();
    const { cajaId, finalAmount } = req.body;
    const caja = await db.collection('cajas').findOneAndUpdate(
      { _id: new ObjectId(cajaId), status: 'open' },
      { $set: { status: 'closed', finalAmount, closedAt: new Date() } },
      { returnDocument: 'after' }
    );
    if (!caja.value) return res.status(404).json({ message: 'Caja no encontrada o ya cerrada' });
    res.json({ message: 'Caja cerrada', caja: caja.value });
  } catch (err) {
    res.status(500).json({ message: 'Error al cerrar caja', error: err.message });
  }
}

// Consultar estado de caja abierta
async function estadoCaja(req, res) {
  try {
  const db = getDB();
    const { assignedTo } = req.query;
    const caja = await db.collection('cajas').findOne({ assignedTo: new ObjectId(assignedTo), status: 'open' });
    if (!caja) return res.status(404).json({ message: 'No hay caja abierta para este usuario' });
    res.json(caja);
  } catch (err) {
    res.status(500).json({ message: 'Error al consultar caja', error: err.message });
  }
}

// Historial de cajas
async function historialCajas(req, res) {
  try {
  const db = getDB();
    const { assignedTo } = req.query;
    const filtro = assignedTo ? { assignedTo: new ObjectId(assignedTo) } : {};
    const cajas = await db.collection('cajas').find(filtro).sort({ createdAt: -1 }).toArray();
    res.json(cajas);
  } catch (err) {
    res.status(500).json({ message: 'Error al consultar historial', error: err.message });
  }
}

module.exports = {
  abrirCaja,
  registrarMovimiento,
  cerrarCaja,
  estadoCaja,
  historialCajas
};

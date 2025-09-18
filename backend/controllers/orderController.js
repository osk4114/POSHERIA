// Consultar historial de añadidos (add-on) por mesa o pedido principal
async function listAddOns(req, res) {
  try {
    const db = getDB();
    const orders = db.collection('orders');
    const { table, parentOrderId } = req.query;
    const filter = { type: 'add-on' };
    if (table) filter.table = new ObjectId(table);
    if (parentOrderId) filter.parentOrderId = new ObjectId(parentOrderId);
    const result = await orders.find(filter).toArray();
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Error al consultar añadidos', error: err.message });
  }
}
// Crear ticket de añadido (add-on)
async function createAddOnOrder(req, res) {
  try {
    const db = getDB();
    const orders = db.collection('orders');
    const {
      products, // [{ productId, name, quantity, price }]
      table, // tableId
      parentOrderId // pedido principal
    } = req.body;
    const userId = req.user._id; // mozo

    // Validar mesa y pedido principal
    if (!table || !parentOrderId) {
      return res.status(400).json({ message: 'Faltan datos requeridos (table, parentOrderId)' });
    }
    const mesas = db.collection('tables');
    const mesaObjId = new ObjectId(table);
    const mesa = await mesas.findOne({ _id: mesaObjId });
    if (!mesa) {
      return res.status(400).json({ message: 'Mesa no encontrada.' });
    }
    // Validar que el mozo esté asignado a la mesa
    if (!mesa.waiterId || String(mesa.waiterId) !== String(userId)) {
      return res.status(403).json({ message: 'No tienes asignada esta mesa.' });
    }
    // Validar pedido principal
    const pedidoPrincipal = await orders.findOne({ _id: new ObjectId(parentOrderId), table: mesaObjId });
    if (!pedidoPrincipal) {
      return res.status(400).json({ message: 'Pedido principal no encontrado para esta mesa.' });
    }

    const order = {
      products,
      table: mesaObjId,
      status: 'pending',
      type: 'add-on',
      parentOrderId: new ObjectId(parentOrderId),
      createdBy: new ObjectId(userId),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await orders.insertOne(order);
    res.status(201).json({ message: 'Add-on order created', orderId: result.insertedId });
  } catch (err) {
    res.status(500).json({ message: 'Error creating add-on order', error: err.message });
  }
}
module.exports = {
  createOrder,
  updateOrder,
  listOrders,
  payOrder,
  createAddOnOrder,
  listAddOns,
};
// controllers/orderController.js
const { getDB } = require('../config/mongo');
const { ObjectId } = require('mongodb');

// Create a new order
async function createOrder(req, res) {
  try {
    const db = getDB();
    const orders = db.collection('orders');
    const cajas = db.collection('cajas');
    const {
      products, // [{ productId, name, quantity, price }]
      table, // tableId or null
      type, // 'dine-in' or 'take-away'
    } = req.body;
    const userId = req.user._id; // From auth middleware

    // Validar que el cajero tenga una caja abierta y confirmada
    const caja = await cajas.findOne({ assignedTo: new ObjectId(userId), status: 'open', confirmed: true });
    if (!caja) {
      return res.status(400).json({ message: 'No se puede crear pedido: la caja no está confirmada o no existe una caja abierta.' });
    }

    // Validar mesa si es dine-in
    if (type === 'dine-in') {
      if (!table) {
        return res.status(400).json({ message: 'Debe asignar una mesa para consumo en salón.' });
      }
      const mesas = db.collection('tables');
      const mesaObjId = new ObjectId(table);
      const mesa = await mesas.findOne({ _id: mesaObjId });
      if (!mesa) {
        return res.status(400).json({ message: 'Mesa no encontrada.' });
      }
      if (mesa.status !== 'free') {
        return res.status(400).json({ message: 'La mesa no está disponible.' });
      }
      // Marcar mesa como ocupada
      await mesas.updateOne({ _id: mesaObjId }, { $set: { status: 'occupied', updatedAt: new Date() } });
    }
    const order = {
      products,
      table: table ? new ObjectId(table) : null,
      status: 'pending',
      type,
      createdBy: new ObjectId(userId),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await orders.insertOne(order);
    res.status(201).json({ message: 'Order created', orderId: result.insertedId });
  } catch (err) {
    res.status(500).json({ message: 'Error creating order', error: err.message });
  }
}

// Update an order (add/remove products, change table, etc.)
async function updateOrder(req, res) {
  try {
    const db = getDB();
    const orders = db.collection('orders');
    const { id } = req.params;
    const update = req.body;
    update.updatedAt = new Date();
    let objectId;
    try {
      objectId = new ObjectId(id);
    } catch (e) {
      console.log('ID de pedido inválido:', id);
      return res.status(400).json({ message: 'ID de pedido inválido' });
    }
    // Log de depuración
    console.log('Buscando pedido con _id:', objectId);
    const pedido = await orders.findOne({ _id: objectId });
    console.log('Resultado de findOne:', pedido);
    if (!pedido) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }
    if (pedido.status === 'paid') {
      return res.status(400).json({ message: 'No se puede editar un pedido pagado' });
    }
    const result = await orders.updateOne({ _id: objectId }, { $set: update });
    console.log('Resultado de updateOne:', result);
    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Pedido no encontrado (updateOne)' });
    }
    res.json({ message: 'Order updated' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating order', error: err.message });
  }
}

// List orders (optionally filter by status or date)
async function listOrders(req, res) {
  try {
  const db = getDB();
    const orders = db.collection('orders');
    const { status, date } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      filter.createdAt = { $gte: start, $lte: end };
    }
    const result = await orders.find(filter).toArray();
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Error listing orders', error: err.message });
  }
}

// Pay (confirm) an order
async function payOrder(req, res) {
  try {
    const db = getDB();
    const orders = db.collection('orders');
    const cajas = db.collection('cajas');
    const { id } = req.params;
    // Log de depuración
    let objectId;
    try {
      objectId = new ObjectId(id);
    } catch (e) {
      console.log('[payOrder] RETURN: ID de pedido inválido', { id });
      return res.status(400).json({ message: 'ID de pedido inválido' });
    }
    console.log('[payOrder] Buscando pedido para pagar con _id:', objectId);
    const order = await orders.findOneAndUpdate(
      { _id: objectId },
      { $set: { status: 'paid', updatedAt: new Date() } },
      { returnDocument: 'after', returnOriginal: false }
    );
    const doc = order.value || order;
    console.log('[payOrder] Resultado de findOneAndUpdate:', doc);
    if (!doc || (doc.lastErrorObject && !doc.lastErrorObject.updatedExisting)) {
      console.log('[payOrder] RETURN: Pedido no encontrado', { id });
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }
    // Registrar movimiento en caja
    const userId = req.user._id;
    // Buscar caja abierta del cajero
    const caja = await cajas.findOne({ assignedTo: new ObjectId(userId), status: 'open' });
    if (!caja) {
      console.log('[payOrder] RETURN: No hay caja abierta para este usuario', { userId });
      return res.status(400).json({ message: 'No hay caja abierta para este usuario' });
    }
    // Calcular monto total del pedido
    const total = doc.products.reduce((sum, p) => sum + (p.price * p.quantity), 0);
    const movimiento = {
      type: 'ingreso',
      amount: total,
      description: `Pago de pedido ${id}`,
      orderId: doc._id,
      createdAt: new Date()
    };
    await cajas.updateOne(
      { _id: caja._id },
      { $push: { movements: movimiento } }
    );
    console.log('[payOrder] RETURN: Exito', { id });
    res.json({ message: 'Order paid and sent to kitchen' });
  } catch (err) {
    console.log('[payOrder] RETURN: Error inesperado', err);
    res.status(500).json({ message: 'Error paying order', error: err.message });
  }
}


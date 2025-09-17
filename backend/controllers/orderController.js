module.exports = {
  createOrder,
  updateOrder,
  listOrders,
  payOrder,
};
// controllers/orderController.js
const { getDB } = require('../config/mongo');
const { ObjectId } = require('mongodb');

// Create a new order
async function createOrder(req, res) {
  try {
  const db = getDB();
    const orders = db.collection('orders');
    const {
      products, // [{ productId, name, quantity, price }]
      table, // tableId or null
      type, // 'dine-in' or 'take-away'
    } = req.body;
    const userId = req.user._id; // From auth middleware
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


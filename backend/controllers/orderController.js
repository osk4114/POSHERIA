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
      table // tableId - solo necesitamos la mesa
    } = req.body;
    const userId = req.user._id; // mozo

    // Validar solo la mesa (NO necesitamos parentOrderId)
    if (!table || !products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: 'Faltan datos requeridos (table, products)' });
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

    // Crear el añadido como orden independiente asociada a la mesa
    const order = {
      products,
      table: mesaObjId,
      status: 'pending',
      type: 'add-on', // Marca como añadido
      isAddOn: true,   // Flag para identificar añadidos
      createdBy: new ObjectId(userId),
      total: products.reduce((sum, product) => sum + (product.price * product.quantity), 0),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const result = await orders.insertOne(order);
    
    console.log(`✅ [BACKEND] Añadido creado para mesa ${mesa.number} por mozo ${userId}`);
    
    res.status(201).json({ 
      message: 'Añadido creado exitosamente', 
      orderId: result.insertedId,
      order: order
    });
  } catch (err) {
    console.error('❌ [BACKEND] Error creando añadido:', err);
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
  getStatsToday,
  getOrderHistory,
  updateOrderStatus,
};
// controllers/orderController.js
const { getDB } = require('../config/mongo');
const { ObjectId } = require('mongodb');
const { getSocketIO } = require('../socket');

// Create a new order
async function createOrder(req, res) {
  try {
    const db = getDB();
    const orders = db.collection('orders');
    const cajas = db.collection('cajas');
    const {
      products, // [{ productId, name, quantity, price }] 
      items, // alternativa para products (frontend puede usar cualquiera)
      table, // tableId or null
      tableId, // alternativa para table
      type, // 'dine-in' or 'take-away'
    } = req.body;
    const userId = req.user._id; // From auth middleware
    const userRole = req.user.role;

    // Normalizar datos de entrada (soportar tanto products como items)
    const orderProducts = products || (items && items.map(item => ({
      productId: item.menuItemId || item.productId,
      name: item.name,
      quantity: item.quantity,
      price: item.price
    }))) || [];

    // Normalizar tableId
    const finalTableId = table || tableId;

    // Si es un mozo, puede crear pedidos directamente para mesas asignadas
    if (userRole === 'mozo') {
      if (!finalTableId) {
        return res.status(400).json({ message: 'Debe asignar una mesa para el pedido.' });
      }

      const mesas = db.collection('tables');
      const mesaObjId = new ObjectId(finalTableId);
      const mesa = await mesas.findOne({ _id: mesaObjId });
      
      if (!mesa) {
        return res.status(400).json({ message: 'Mesa no encontrada.' });
      }

      // Verificar que el mozo tenga la mesa asignada
      if (!mesa.waiterId || String(mesa.waiterId) !== String(userId)) {
        return res.status(403).json({ message: 'No tienes asignada esta mesa.' });
      }

      const order = {
        products: orderProducts,
        table: mesaObjId,
        status: 'pending',
        type: 'dine-in',
        createdBy: new ObjectId(userId),
        waiter: new ObjectId(userId),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await orders.insertOne(order);
      
      // Emitir evento WebSocket para notificar a cocina sobre nuevo pedido
      const io = getSocketIO();
      if (io) {
        const newOrder = { ...order, _id: result.insertedId };
        io.emit('newOrder', newOrder);
        console.log(`[orderController] WebSocket emitido: newOrder para pedido ${result.insertedId}`);
      }
      
      res.status(201).json({ message: 'Order created', orderId: result.insertedId });
      return;
    }

    // Lógica original para cajeros
    // Validar que el cajero tenga una caja abierta y confirmada
    const caja = await cajas.findOne({ assignedTo: new ObjectId(userId), status: 'open', confirmed: true });
    if (!caja) {
      return res.status(400).json({ message: 'No se puede crear pedido: la caja no está confirmada o no existe una caja abierta.' });
    }

    // Validar mesa si es dine-in
    if (type === 'dine-in') {
      if (!finalTableId) {
        return res.status(400).json({ message: 'Debe asignar una mesa para consumo en salón.' });
      }
      const mesas = db.collection('tables');
      const mesaObjId = new ObjectId(finalTableId);
      const mesa = await mesas.findOne({ _id: mesaObjId });
      if (!mesa) {
        return res.status(400).json({ message: 'Mesa no encontrada.' });
      }
      if (mesa.status !== 'free') {
        return res.status(400).json({ message: 'La mesa no está disponible.' });
      }
      // Marcar mesa como asignada (pendiente de atención por mozo)
      await mesas.updateOne({ _id: mesaObjId }, { $set: { status: 'assigned', updatedAt: new Date() } });
    }

    const order = {
      products: orderProducts,
      table: finalTableId ? new ObjectId(finalTableId) : null,
      status: 'pending',
      type,
      createdBy: new ObjectId(userId),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await orders.insertOne(order);
    
    // Emitir evento WebSocket para notificar a cocina sobre nuevo pedido
    const io = getSocketIO();
    if (io) {
      const newOrder = { ...order, _id: result.insertedId };
      io.emit('newOrder', newOrder);
      console.log(`[orderController] WebSocket emitido: newOrder para pedido ${result.insertedId}`);
    }
    
    res.status(201).json({ message: 'Order created', orderId: result.insertedId });
  } catch (err) {
    console.error('Error creating order:', err);
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
      { $set: { paymentStatus: 'paid', paidAt: new Date(), updatedAt: new Date() } },
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
    
    // Emitir evento WebSocket para notificar que el pedido fue pagado
    const io = getSocketIO();
    if (io) {
      io.emit('orderPaid', {
        orderId: id,
        order: doc,
        timestamp: new Date()
      });
      console.log(`[payOrder] WebSocket emitido: orderPaid para pedido ${id}`);
    }
    
    console.log('[payOrder] RETURN: Exito', { id });
    res.json({ message: 'Order paid and sent to kitchen' });
  } catch (err) {
    console.log('[payOrder] RETURN: Error inesperado', err);
    res.status(500).json({ message: 'Error paying order', error: err.message });
  }
}

// Obtener estadísticas del día para reportes admin
async function getStatsToday(req, res) {
  try {
    const db = getDB();
    const orders = db.collection('orders');
    
    // Obtener fecha de hoy (inicio y fin del día)
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    // Contar pedidos del día
    const totalPedidos = await orders.countDocuments({
      createdAt: { $gte: startOfDay, $lt: endOfDay }
    });
    
    res.json({ total: totalPedidos });
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener estadísticas', error: err.message });
  }
}

// Obtener historial completo de pedidos para admin
async function getOrderHistory(req, res) {
  try {
    const db = getDB();
    const orders = db.collection('orders');
    
    // Construir filtro para la consulta
    const filter = {};
    
    // Si se especifica waiterId, filtrar por mozo
    const { waiterId } = req.query;
    if (waiterId) {
      filter.createdBy = new ObjectId(waiterId);
    }
    
    // Obtener pedidos ordenados por fecha (más recientes primero)
    const pedidos = await orders.find(filter)
      .sort({ createdAt: -1 })
      .limit(100) // Limitar a 100 pedidos más recientes
      .toArray();
    
    // Poblar información de mozo y mesa
    const users = db.collection('users');
    const tables = db.collection('tables');
    
    for (let pedido of pedidos) {
      // Obtener información del mozo
      if (pedido.waiter) {
        const mozo = await users.findOne({ _id: pedido.waiter });
        pedido.waiter = mozo ? { name: mozo.name, username: mozo.username } : null;
      }
      
      // Obtener número de mesa
      if (pedido.table) {
        const mesa = await tables.findOne({ _id: pedido.table });
        pedido.tableNumber = mesa ? mesa.number : null;
      }
      
      // Calcular total si no existe
      if (!pedido.total && pedido.products) {
        pedido.total = pedido.products.reduce((sum, p) => sum + (p.price * p.quantity), 0);
      }
      
      // Agregar información de items
      if (pedido.products) {
        pedido.items = pedido.products.map(p => ({
          name: p.name,
          quantity: p.quantity,
          price: p.price
        }));
      }
    }
    
    res.json(pedidos);
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener historial de pedidos', error: err.message });
  }
}

// Update order status (usado desde cocina)
async function updateOrderStatus(req, res) {
  try {
    const db = getDB();
    const { id } = req.params;
    const { status } = req.body;
    
    console.log('[orderController] PATCH/PUT /api/orders/:id/status');
    console.log(`  Actualizando pedido ${id} a estado: ${status}`);

    // Validar estado
    const validStatuses = ['pending', 'preparing', 'ready', 'delivered', 'in_kitchen'];
    if (!validStatuses.includes(status)) {
      console.log('  Estado no permitido:', status);
      return res.status(400).json({ message: 'Estado no permitido' });
    }

    let objectId;
    try {
      objectId = new ObjectId(id);
    } catch (e) {
      console.log('  ID de pedido inválido:', id);
      return res.status(400).json({ message: 'ID de pedido inválido' });
    }

    // Obtener pedido actual
    const pedidoActual = await db.collection('orders').findOne({ _id: objectId });
    if (!pedidoActual) {
      console.log('  Pedido no encontrado:', id);
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }

    // Actualizar pedido con timestamp
    const datosActualizacion = {
      status,
      updatedAt: new Date(),
      [`timestamp_${status}`]: new Date() // Guardar timestamp del cambio de estado
    };

    const updateResult = await db.collection('orders').updateOne(
      { _id: objectId },
      { $set: datosActualizacion }
    );

    if (updateResult.matchedCount === 0) {
      console.log('  Pedido no encontrado para actualizar:', id);
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }

    // Obtener pedido actualizado
    const pedidoActualizado = await db.collection('orders').findOne({ _id: objectId });
    
    // Emitir evento WebSocket para actualización en tiempo real
    const io = getSocketIO();
    if (io) {
      io.emit('orderStatusUpdated', {
        orderId: id,
        previousStatus: pedidoActual.status,
        newStatus: status,
        order: pedidoActualizado,
        timestamp: new Date(),
        updatedBy: 'cocina'
      });
      
      console.log(`[orderController] WebSocket emitido: orderStatusUpdated para pedido ${id}`);
    }

    console.log(`  Pedido ${id} actualizado exitosamente a ${status}`);
    res.json({ 
      message: 'Estado actualizado exitosamente', 
      pedido: pedidoActualizado,
      previousStatus: pedidoActual.status,
      newStatus: status
    });

  } catch (err) {
    console.error('[orderController] Error en updateOrderStatus:', err);
    res.status(500).json({ message: 'Error al actualizar estado', error: err.message });
  }
}


// controllers/kitchenController.js
// Lógica para gestión de pedidos en cocina
const { getDB } = require('../config/mongo');
const { ObjectId } = require('mongodb');

// Listar pedidos pendientes/en cocina
async function listarPedidosCocina(req, res) {
  try {
    const db = getDB();
    // Mostrar pedidos pagados o en cocina, pero no entregados ni cancelados
    const pedidos = await db.collection('orders').find({
      status: { $in: ['paid', 'in_kitchen', 'ready'] }
    }).toArray();
    res.json(pedidos);
  } catch (err) {
    res.status(500).json({ message: 'Error al listar pedidos de cocina', error: err.message });
  }
}

// Cambiar estado de pedido (in_kitchen, ready, delivered)
async function actualizarEstadoPedido(req, res) {
  try {
    const db = getDB();
    const { id } = req.params;
    const { status } = req.body;
    console.log('[kitchenController] PUT /api/kitchen/orders/:id/status');
    console.log('  id recibido:', id, '| status:', status);
    if (!['in_kitchen', 'ready', 'delivered'].includes(status)) {
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
    const pedidoActual = await db.collection('orders').findOne({ _id: objectId });
    console.log('  Pedido encontrado antes de update:', pedidoActual);
    // --- Código original ---
    // const result = await db.collection('orders').findOneAndUpdate(
    //   { _id: objectId },
    //   { $set: { status, updatedAt: new Date() } },
    //   { returnOriginal: false }
    // );
    // if (!result.value) {
    //   console.log('  Pedido no encontrado para actualizar:', id);
    //   return res.status(404).json({ message: 'Pedido no encontrado' });
    // }
    // console.log('  Pedido actualizado:', result.value);
    // res.json({ message: 'Estado actualizado', pedido: result.value });

    // --- Prueba: update sin opción de retorno ---
    const updateResult = await db.collection('orders').updateOne(
      { _id: objectId },
      { $set: { status, updatedAt: new Date() } }
    );
    if (updateResult.matchedCount === 0) {
      console.log('  Pedido no encontrado para actualizar (updateOne):', id);
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }
    // Si el nuevo estado es delivered y el pedido tiene mesa, liberar la mesa
    if (status === 'delivered' && pedidoActual && pedidoActual.table) {
      await db.collection('tables').updateOne(
        { _id: pedidoActual.table },
        { $set: { status: 'free', updatedAt: new Date() } }
      );
    }
    const pedidoActualizado = await db.collection('orders').findOne({ _id: objectId });
    console.log('  Pedido actualizado (findOne):', pedidoActualizado);
    res.json({ message: 'Estado actualizado', pedido: pedidoActualizado });
  } catch (err) {
    console.log('  Error en actualizarEstadoPedido:', err);
    res.status(500).json({ message: 'Error al actualizar estado', error: err.message });
  }
}

module.exports = {
  listarPedidosCocina,
  actualizarEstadoPedido
};

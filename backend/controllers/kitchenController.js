// controllers/kitchenController.js
// Lógica para gestión de pedidos en cocina con WebSocket integrado
const { getDB } = require('../config/mongo');
const { ObjectId } = require('mongodb');
const { getSocketIO } = require('../socket');

// Listar pedidos pendientes/en cocina con información detallada
async function listarPedidosCocina(req, res) {
  try {
    console.log('[kitchenController] GET /api/kitchen/orders - Listando pedidos de cocina');
    const db = getDB();
    
    // Mostrar solo pedidos que necesitan atención en cocina
    // - 'pending': Pedidos recién creados que necesitan preparación
    // - 'preparing': Pedidos que están siendo preparados
    // - 'ready': Pedidos listos para entregar
    const pedidos = await db.collection('orders').find({
      status: { $in: ['pending', 'preparing', 'ready'] }
    }).sort({ createdAt: 1 }).toArray(); // Ordenar por tiempo de creación

    // Obtener información adicional de mesas y productos
    const mesasIds = pedidos.map(p => p.table).filter(Boolean);
    const mesas = await db.collection('tables').find({
      _id: { $in: mesasIds }
    }).toArray();

    // Enriquecer pedidos con información de mesas
    const pedidosEnriquecidos = pedidos.map(pedido => {
      const mesa = mesas.find(m => m._id.toString() === pedido.table?.toString());
      return {
        ...pedido,
        mesaInfo: mesa ? {
          numero: mesa.number,
          capacidad: mesa.capacity,
          ubicacion: mesa.location
        } : null,
        tiempoTranscurrido: Math.floor((new Date() - new Date(pedido.createdAt)) / (1000 * 60)), // minutos
        prioridad: calcularPrioridad(pedido)
      };
    });

    console.log(`[kitchenController] Devolviendo ${pedidosEnriquecidos.length} pedidos`);
    res.json(pedidosEnriquecidos);
  } catch (err) {
    console.error('[kitchenController] Error al listar pedidos de cocina:', err);
    res.status(500).json({ message: 'Error al listar pedidos de cocina', error: err.message });
  }
}

// Calcular prioridad de pedido basado en tiempo y tipo
function calcularPrioridad(pedido) {
  const tiempoTranscurrido = Math.floor((new Date() - new Date(pedido.createdAt)) / (1000 * 60));
  
  if (tiempoTranscurrido > 30) return 'alta';
  if (tiempoTranscurrido > 15) return 'media';
  return 'normal';
}

// Cambiar estado de pedido con notificaciones WebSocket
async function actualizarEstadoPedido(req, res) {
  try {
    const db = getDB();
    const { id } = req.params;
    const { status, notas } = req.body;
    
    console.log('[kitchenController] PUT /api/kitchen/orders/:id/status');
    console.log(`  Actualizando pedido ${id} a estado: ${status}`);

    // Validar estado
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

    // Obtener pedido actual
    const pedidoActual = await db.collection('orders').findOne({ _id: objectId });
    if (!pedidoActual) {
      console.log('  Pedido no encontrado:', id);
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }

    // Validar transición de estado
    const transicionValida = validarTransicionEstado(pedidoActual.status, status);
    if (!transicionValida) {
      return res.status(400).json({ 
        message: `Transición no válida de ${pedidoActual.status} a ${status}` 
      });
    }

    // Actualizar pedido con timestamp y notas
    const datosActualizacion = {
      status,
      updatedAt: new Date(),
      ...(notas && { notasCocina: notas }),
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

    // Lógica especial según el estado
    await manejarCambioEstado(db, pedidoActual, status);

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
      
      console.log(`[kitchenController] WebSocket emitido: orderStatusUpdated para pedido ${id}`);
    }

    console.log(`  Pedido ${id} actualizado exitosamente a ${status}`);
    res.json({ 
      message: 'Estado actualizado exitosamente', 
      pedido: pedidoActualizado,
      previousStatus: pedidoActual.status,
      newStatus: status
    });

  } catch (err) {
    console.error('[kitchenController] Error en actualizarEstadoPedido:', err);
    res.status(500).json({ message: 'Error al actualizar estado', error: err.message });
  }
}

// Validar si la transición de estado es válida
function validarTransicionEstado(estadoActual, nuevoEstado) {
  const transicionesValidas = {
    'pending': ['in_kitchen'],
    'paid': ['in_kitchen'],
    'in_kitchen': ['ready'],
    'ready': ['delivered']
  };

  return transicionesValidas[estadoActual]?.includes(nuevoEstado) || false;
}

// Manejar lógica específica según cambio de estado
async function manejarCambioEstado(db, pedido, nuevoEstado) {
  switch (nuevoEstado) {
    case 'delivered':
      // Si el pedido tiene mesa, liberarla
      if (pedido.table) {
        await db.collection('tables').updateOne(
          { _id: pedido.table },
          { 
            $set: { 
              status: 'free', 
              updatedAt: new Date(),
              lastOrderDelivered: new Date()
            } 
          }
        );
        console.log(`  Mesa ${pedido.table} liberada tras entrega del pedido`);
      }
      break;
    
    case 'in_kitchen':
      // Registrar inicio de preparación
      console.log(`  Pedido ${pedido._id} iniciado en cocina`);
      break;
    
    case 'ready':
      // Notificar que está listo para servir
      console.log(`  Pedido ${pedido._id} listo para servir`);
      break;
  }
}

// Obtener estadísticas de cocina
async function obtenerEstadisticasCocina(req, res) {
  try {
    console.log('[kitchenController] GET /api/kitchen/stats - Obteniendo estadísticas');
    const db = getDB();
    
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const mañana = new Date(hoy);
    mañana.setDate(mañana.getDate() + 1);

    // Estadísticas del día
    const stats = await db.collection('orders').aggregate([
      {
        $match: {
          createdAt: { $gte: hoy, $lt: mañana }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$total' }
        }
      }
    ]).toArray();

    // Tiempo promedio de preparación
    const tiemposPedidos = await db.collection('orders').find({
      status: 'delivered',
      timestamp_in_kitchen: { $exists: true },
      timestamp_ready: { $exists: true },
      createdAt: { $gte: hoy, $lt: mañana }
    }).toArray();

    const tiempoPromedioPreparacion = tiemposPedidos.length > 0 
      ? tiemposPedidos.reduce((sum, pedido) => {
          const inicio = new Date(pedido.timestamp_in_kitchen);
          const fin = new Date(pedido.timestamp_ready);
          return sum + (fin - inicio);
        }, 0) / tiemposPedidos.length / (1000 * 60) // convertir a minutos
      : 0;

    const estadisticas = {
      pedidosHoy: stats.reduce((sum, s) => sum + s.count, 0),
      porEstado: stats.reduce((acc, s) => {
        acc[s._id] = s.count;
        return acc;
      }, {}),
      ventasHoy: stats.reduce((sum, s) => sum + (s.totalValue || 0), 0),
      tiempoPromedioPreparacion: Math.round(tiempoPromedioPreparacion),
      // Contar pedidos que están activos en cocina
      pending: stats.find(s => s._id === 'pending')?.count || 0,
      preparing: stats.find(s => s._id === 'preparing')?.count || 0,
      ready: stats.find(s => s._id === 'ready')?.count || 0,
      delivered: stats.find(s => s._id === 'delivered')?.count || 0
    };

    console.log('[kitchenController] Estadísticas calculadas:', estadisticas);
    res.json(estadisticas);

  } catch (err) {
    console.error('[kitchenController] Error al obtener estadísticas:', err);
    res.status(500).json({ message: 'Error al obtener estadísticas', error: err.message });
  }
}

// Obtener historial de tiempos de preparación
async function obtenerTiemposPreparacion(req, res) {
  try {
    const db = getDB();
    const { dias = 7 } = req.query;

    const fechaInicio = new Date();
    fechaInicio.setDate(fechaInicio.getDate() - parseInt(dias));
    fechaInicio.setHours(0, 0, 0, 0);

    const pedidosConTiempos = await db.collection('orders').find({
      status: 'delivered',
      timestamp_in_kitchen: { $exists: true },
      timestamp_ready: { $exists: true },
      createdAt: { $gte: fechaInicio }
    }).sort({ createdAt: -1 }).limit(100).toArray();

    const tiempos = pedidosConTiempos.map(pedido => {
      const inicio = new Date(pedido.timestamp_in_kitchen);
      const fin = new Date(pedido.timestamp_ready);
      const tiempoMinutos = (fin - inicio) / (1000 * 60);
      
      return {
        pedidoId: pedido._id,
        fecha: pedido.createdAt,
        tiempoPreparacion: Math.round(tiempoMinutos),
        productos: pedido.products.length,
        mesa: pedido.table
      };
    });

    res.json(tiempos);

  } catch (err) {
    console.error('[kitchenController] Error al obtener tiempos:', err);
    res.status(500).json({ message: 'Error al obtener tiempos de preparación', error: err.message });
  }
}

module.exports = {
  listarPedidosCocina,
  actualizarEstadoPedido,
  obtenerEstadisticasCocina,
  obtenerTiemposPreparacion
};

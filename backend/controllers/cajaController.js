// Eliminar todas las cajas abiertas o pendientes de confirmación de un usuario (solo para pruebas)
async function limpiarCajasUsuario(req, res) {
  try {
    const db = getDB();
    const { assignedTo } = req.query;
    if (!assignedTo) return res.status(400).json({ message: 'Falta el parámetro assignedTo' });
    const result = await db.collection('cajas').deleteMany({ assignedTo: new ObjectId(assignedTo), status: 'open' });
    res.json({ message: 'Cajas abiertas/pendientes eliminadas', deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ message: 'Error al limpiar cajas', error: err.message });
  }
}
// controllers/cajaController.js
const { ObjectId } = require('mongodb');
const Caja = require('../models/cajaModel');
const { getDB } = require('../config/mongo');

// Abrir caja (admin asigna, pendiente de confirmación)
async function abrirCaja(req, res) {
  try {
    const db = getDB();
    const { assignedTo, initialAmount } = req.body;
    
    // Si es admin, puede asignar a cualquier usuario. Si es caja, solo puede abrir para sí mismo
    const targetUserId = req.user.role === 'admin' ? (assignedTo || req.user._id) : req.user._id;
    
    // Verificar si ya hay una caja abierta para el usuario
    const cajaAbierta = await db.collection('cajas').findOne({ assignedTo: new ObjectId(targetUserId), status: 'open' });
    if (cajaAbierta) {
      return res.status(400).json({ message: 'Ya existe una caja abierta para este usuario.' });
    }
    
    const caja = new Caja({ assignedTo: targetUserId, initialAmount: initialAmount || 0, status: 'open', confirmed: false, createdAt: new Date() });
    const result = await db.collection('cajas').insertOne(caja);
    
    // Emitir evento de WebSocket para sincronizar cambios
    if (global._io) {
      global._io.emit('cajaUpdated', {
        action: 'opened',
        caja: { ...caja, _id: result.insertedId },
        message: 'Nueva caja abierta'
      });
      console.log('🔄 [WEBSOCKET] Evento cajaUpdated emitido (opened):', targetUserId);
    }
    
    res.json({ message: 'Caja abierta (pendiente de confirmación)', cajaId: result.insertedId });
  } catch (err) {
    res.status(500).json({ message: 'Error al abrir caja', error: err.message });
  }
}

// Confirmar monto inicial de caja (cajero)
async function confirmarCaja(req, res) {
  try {
    const db = getDB();
    const { cajaId, confirmedAmount } = req.body;
    
    console.log('💰 [BACKEND] Confirmando caja:', {
      cajaId,
      confirmedAmount,
      userId: req.user._id,
      userRole: req.user.role
    });
    
    // Verificar que la caja pertenece al usuario actual (o es admin)
    const filter = { _id: new ObjectId(cajaId), status: 'open', confirmed: false };
    if (req.user.role !== 'admin') {
      filter.assignedTo = new ObjectId(req.user._id);
    }
    
    // Actualizar la caja con confirmación y monto confirmado
    const updateData = { 
      confirmed: true, 
      confirmedAt: new Date()
    };
    
    if (confirmedAmount !== undefined) {
      updateData.confirmedAmount = confirmedAmount;
    }
    
    const caja = await db.collection('cajas').findOneAndUpdate(
      filter,
      { $set: updateData },
      { returnDocument: 'after' }
    );
    
    if (!caja.value) {
      console.log('❌ [BACKEND] Caja no encontrada o ya confirmada:', { filter });
      return res.status(404).json({ message: 'Caja no encontrada, ya confirmada o no tienes permisos para confirmarla' });
    }
    
    console.log('✅ [BACKEND] Caja confirmada exitosamente:', caja.value);
    
    // Emitir evento de WebSocket para sincronizar cambios
    if (global._io) {
      global._io.emit('cajaUpdated', {
        action: 'confirmed',
        caja: caja.value,
        message: 'Caja confirmada exitosamente'
      });
      console.log('🔄 [WEBSOCKET] Evento cajaUpdated emitido (confirmed):', cajaId);
    }
    
    res.json({ message: 'Caja confirmada', caja: caja.value });
  } catch (err) {
    console.error('❌ [BACKEND] Error al confirmar caja:', err);
    res.status(500).json({ message: 'Error al confirmar caja', error: err.message });
  }
}

// Declinar caja asignada (cajero)
async function declinarCaja(req, res) {
  try {
    const db = getDB();
    const { cajaId, razon } = req.body;
    
    console.log('❌ [BACKEND] Declinando caja:', {
      cajaId,
      razon,
      userId: req.user._id,
      userRole: req.user.role
    });

    // Primero buscar la caja para diagnóstico
    const cajaExistente = await db.collection('cajas').findOne({ 
      _id: new ObjectId(cajaId),
      assignedTo: new ObjectId(req.user._id)
    });

    console.log('🔍 [BACKEND] Estado actual de la caja antes de declinar:', cajaExistente);

    if (!cajaExistente) {
      console.log('❌ [BACKEND] Caja no encontrada para este usuario:', { cajaId, userId: req.user._id });
      return res.status(404).json({ message: 'Caja no encontrada o no tienes permisos para declinarla' });
    }

    if (cajaExistente.status !== 'open') {
      console.log('❌ [BACKEND] Caja no está abierta:', { status: cajaExistente.status });
      return res.status(400).json({ message: `No se puede declinar una caja con estado: ${cajaExistente.status}` });
    }

    if (cajaExistente.confirmed) {
      console.log('❌ [BACKEND] Caja ya confirmada, no se puede declinar');
      return res.status(400).json({ message: 'No se puede declinar una caja que ya fue confirmada' });
    }
    
    // Verificar que la caja pertenece al usuario actual (o es admin)
    const filter = { _id: new ObjectId(cajaId), status: 'open', confirmed: false };
    if (req.user.role !== 'admin') {
      filter.assignedTo = new ObjectId(req.user._id);
    }
    
    // Marcar la caja como declinada
    const updateData = { 
      status: 'declined',
      declinedAt: new Date(),
      declineReason: razon,
      declinedBy: new ObjectId(req.user._id)
    };
    
    // Usar updateOne en lugar de findOneAndUpdate para evitar problemas con el filtro cambiante
    const updateResult = await db.collection('cajas').updateOne(
      filter,
      { $set: updateData }
    );
    
    if (updateResult.matchedCount === 0) {
      console.log('❌ [BACKEND] Error en updateOne - No se encontró caja que coincida con el filtro:', { filter });
      console.log('❌ [BACKEND] Estado actual después del intento:', await db.collection('cajas').findOne({ _id: new ObjectId(cajaId) }));
      return res.status(404).json({ message: 'Error interno: No se pudo declinar la caja' });
    }

    // Obtener la caja actualizada
    const cajaActualizada = await db.collection('cajas').findOne({ _id: new ObjectId(cajaId) });
    
    console.log('✅ [BACKEND] Caja declinada exitosamente:', cajaActualizada);
    
    // Emitir evento de WebSocket para sincronizar cambios
    if (global._io) {
      global._io.emit('cajaUpdated', {
        action: 'declined',
        caja: cajaActualizada,
        razon: razon,
        message: 'Caja declinada por el cajero'
      });
      console.log('🔄 [WEBSOCKET] Evento cajaUpdated emitido (declined):', cajaId);
    }
    
    res.json({ message: 'Caja declinada exitosamente', caja: cajaActualizada });
  } catch (err) {
    console.error('❌ [BACKEND] Error al declinar caja:', err);
    res.status(500).json({ message: 'Error al declinar caja', error: err.message });
  }
}

// Registrar movimiento (ingreso/egreso) solo si caja confirmada
async function registrarMovimiento(req, res) {
  try {
    const db = getDB();
    const { cajaId, type, amount, description, orderId } = req.body;
    
    console.log('💰 [BACKEND] Registrando movimiento:', {
      cajaId,
      type,
      amount,
      description,
      orderId,
      userId: req.user._id
    });
    
    const movimiento = {
      type,
      amount,
      description,
      orderId: orderId ? new ObjectId(orderId) : undefined,
      createdAt: new Date()
    };
    
    // Primero actualizar la caja con el movimiento
    const updateResult = await db.collection('cajas').updateOne(
      { _id: new ObjectId(cajaId), status: 'open', confirmed: true },
      { $push: { movements: movimiento } }
    );
    
    if (updateResult.matchedCount === 0) {
      console.log('❌ [BACKEND] Caja no encontrada, cerrada o no confirmada:', cajaId);
      return res.status(404).json({ message: 'Caja no encontrada, cerrada o no confirmada' });
    }
    
    // Obtener la caja actualizada
    const cajaActualizada = await db.collection('cajas').findOne({ _id: new ObjectId(cajaId) });
    
    console.log('✅ [BACKEND] Movimiento registrado exitosamente:', movimiento);
    
    // Emitir evento de WebSocket para sincronizar cambios
    if (global._io) {
      global._io.emit('cajaUpdated', {
        action: 'movementAdded',
        caja: cajaActualizada,
        movement: movimiento,
        message: `${type === 'ingreso' ? 'Ingreso' : 'Egreso'} registrado correctamente`
      });
      console.log('🔄 [WEBSOCKET] Evento cajaUpdated emitido (movementAdded):', cajaId);
    }
    
    res.json({ message: 'Movimiento registrado', caja: cajaActualizada });
  } catch (err) {
    console.error('❌ [BACKEND] Error al registrar movimiento:', err);
    res.status(500).json({ message: 'Error al registrar movimiento', error: err.message });
  }
}

// Cerrar caja
async function cerrarCaja(req, res) {
  try {
    const db = getDB();
    const { cajaId, finalAmount } = req.body;
    
    if (!cajaId) {
      return res.status(400).json({ message: 'ID de caja requerido' });
    }
    
    const caja = await db.collection('cajas').findOneAndUpdate(
      { _id: new ObjectId(cajaId), status: 'open' },
      { $set: { status: 'closed', finalAmount, closedAt: new Date() } },
      { returnDocument: 'after' }
    );
    
    if (!caja.value) {
      return res.status(404).json({ message: 'Caja no encontrada o ya cerrada' });
    }
    
    // Emitir evento de WebSocket para sincronizar cambios
    if (global._io) {
      global._io.emit('cajaUpdated', {
        action: 'closed',
        caja: caja.value,
        message: 'Caja cerrada exitosamente'
      });
      console.log('🔄 [WEBSOCKET] Evento cajaUpdated emitido (closed):', cajaId);
    }
    
    res.json({ message: 'Caja cerrada exitosamente', caja: caja.value });
  } catch (err) {
    console.error('Error al cerrar caja:', err);
    res.status(500).json({ message: 'Error al cerrar caja', error: err.message });
  }
}

// Consultar estado de caja abierta
async function estadoCaja(req, res) {
  try {
    const db = getDB();
    const { assignedTo } = req.query;
    
    // Si es admin, puede consultar cualquier caja. Si es caja, solo la suya
    const targetUserId = req.user.role === 'admin' ? (assignedTo || req.user._id) : req.user._id;
    
    console.log('🔍 [BACKEND] estadoCaja: Consultando para usuario:', targetUserId);
    console.log('🔍 [BACKEND] estadoCaja: Rol del usuario:', req.user.role);
    console.log('🔍 [BACKEND] estadoCaja: Query assignedTo:', assignedTo);
    
    const caja = await db.collection('cajas').findOne({ assignedTo: new ObjectId(targetUserId), status: 'open' });
    
    console.log('🔍 [BACKEND] estadoCaja: Resultado de búsqueda:', caja);
    
    if (!caja) {
      console.log('❌ [BACKEND] estadoCaja: No hay caja abierta para este usuario');
      return res.status(404).json({ message: 'No hay caja abierta para este usuario' });
    }
    
    console.log('✅ [BACKEND] estadoCaja: Caja encontrada, enviando respuesta');
    res.json(caja);
  } catch (err) {
    console.error('❌ [BACKEND] estadoCaja: Error:', err);
    res.status(500).json({ message: 'Error al consultar caja', error: err.message });
  }
}

// Obtener todas las cajas abiertas (para admin)
async function todasLasCajasAbiertas(req, res) {
  try {
    const db = getDB();
    const cajas = await db.collection('cajas')
      .find({ status: 'open' })
      .sort({ openedAt: -1 })
      .toArray();
    
    // Populate manualmente los datos del usuario y calcular totales
    const cajasConUsuarios = await Promise.all(cajas.map(async (caja) => {
      let cajaCompleta = { ...caja };
      
      // Obtener información del usuario asignado
      if (caja.assignedTo) {
        const usuario = await db.collection('users').findOne({ _id: caja.assignedTo });
        cajaCompleta.assignedTo = usuario ? { 
          _id: usuario._id, 
          name: usuario.name, 
          username: usuario.username 
        } : null;
      }
      
      // Calcular total actual basado en movimientos
      if (caja.movements && caja.movements.length > 0) {
        const totalMovimientos = caja.movements.reduce((sum, mov) => {
          return sum + (mov.type === 'ingreso' ? mov.amount : -mov.amount);
        }, 0);
        cajaCompleta.totalAmount = caja.initialAmount + totalMovimientos;
      } else {
        cajaCompleta.totalAmount = caja.initialAmount;
      }
      
      return cajaCompleta;
    }));
    
    res.json(cajasConUsuarios);
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener cajas abiertas', error: err.message });
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

// Obtener ventas del día para reportes
async function getVentasHoy(req, res) {
  try {
    const db = getDB();
    const cajas = db.collection('cajas');
    
    // Obtener fecha de hoy (inicio y fin del día)
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    // Buscar todas las cajas del día
    const cajasHoy = await cajas.find({
      createdAt: { $gte: startOfDay, $lt: endOfDay }
    }).toArray();
    
    // Calcular total de ventas sumando movimientos de ingreso
    let totalVentas = 0;
    for (let caja of cajasHoy) {
      if (caja.movements) {
        for (let movimiento of caja.movements) {
          if (movimiento.type === 'ingreso') {
            totalVentas += movimiento.amount || 0;
          }
        }
      }
    }
    
    res.json({ total: totalVentas });
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener ventas del día', error: err.message });
  }
}

module.exports = {
  abrirCaja,
  registrarMovimiento,
  cerrarCaja,
  estadoCaja,
  todasLasCajasAbiertas,
  historialCajas,
  confirmarCaja,
  declinarCaja,
  limpiarCajasUsuario,
  getVentasHoy
};

// models/orderModel.js
// Order model for POSHERIA con campos específicos de cocina

const { ObjectId } = require('mongodb');

class Order {
  constructor({
    _id,
    products = [], // [{ productId, name, quantity, price, category, instructions }]
    table = null, // ObjectId or null if take away
    status = 'pending', // pending | paid | in_kitchen | ready | delivered | cancelled
    type = 'dine-in', // dine-in | take-away | add-on
    parentOrderId = null, // Si es un añadido, referencia al pedido principal
    createdBy, // userId (mozo que crea el añadido)
    customerName = null, // Nombre del cliente (opcional)
    total = 0, // Total del pedido
    paymentMethod = null, // Método de pago
    
    // Campos específicos de cocina
    notasCocina = null, // Notas especiales de preparación
    prioridad = 'normal', // normal | media | alta
    tiempoEstimado = null, // Tiempo estimado de preparación en minutos
    
    // Timestamps de estados para seguimiento
    timestamp_pending = null,
    timestamp_paid = null,
    timestamp_in_kitchen = null,
    timestamp_ready = null,
    timestamp_delivered = null,
    
    // Metadatos
    createdAt = new Date(),
    updatedAt = new Date(),
    
    // Información adicional de mesa (desnormalizada para facilitar consultas)
    mesaInfo = null // { numero, capacidad, ubicacion }
  }) {
    this._id = _id ? new ObjectId(_id) : undefined;
    this.products = products;
    this.table = table ? new ObjectId(table) : null;
    this.status = status;
    this.type = type;
    this.parentOrderId = parentOrderId ? new ObjectId(parentOrderId) : null;
    this.createdBy = createdBy ? new ObjectId(createdBy) : undefined;
    this.customerName = customerName;
    this.total = total;
    this.paymentMethod = paymentMethod;
    
    // Campos de cocina
    this.notasCocina = notasCocina;
    this.prioridad = prioridad;
    this.tiempoEstimado = tiempoEstimado;
    
    // Timestamps
    this.timestamp_pending = timestamp_pending || (status === 'pending' ? new Date() : null);
    this.timestamp_paid = timestamp_paid || (status === 'paid' ? new Date() : null);
    this.timestamp_in_kitchen = timestamp_in_kitchen || (status === 'in_kitchen' ? new Date() : null);
    this.timestamp_ready = timestamp_ready || (status === 'ready' ? new Date() : null);
    this.timestamp_delivered = timestamp_delivered || (status === 'delivered' ? new Date() : null);
    
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.mesaInfo = mesaInfo;
  }

  // Método para calcular tiempo transcurrido desde creación
  getTiempoTranscurrido() {
    const ahora = new Date();
    const creacion = new Date(this.createdAt);
    return Math.floor((ahora - creacion) / (1000 * 60)); // retorna minutos
  }

  // Método para obtener tiempo de preparación (de in_kitchen a ready)
  getTiempoPreparacion() {
    if (!this.timestamp_in_kitchen || !this.timestamp_ready) {
      return null;
    }
    const inicio = new Date(this.timestamp_in_kitchen);
    const fin = new Date(this.timestamp_ready);
    return Math.floor((fin - inicio) / (1000 * 60)); // retorna minutos
  }

  // Método para calcular prioridad automática
  calcularPrioridad() {
    const tiempoTranscurrido = this.getTiempoTranscurrido();
    
    if (tiempoTranscurrido > 30) {
      this.prioridad = 'alta';
    } else if (tiempoTranscurrido > 15) {
      this.prioridad = 'media';
    } else {
      this.prioridad = 'normal';
    }
    
    return this.prioridad;
  }

  // Validar si el cambio de estado es permitido
  puedeTransicionarA(nuevoEstado) {
    const transicionesValidas = {
      'pending': ['paid', 'cancelled'],
      'paid': ['in_kitchen', 'cancelled'],
      'in_kitchen': ['ready', 'cancelled'],
      'ready': ['delivered'],
      'delivered': [], // Estado final
      'cancelled': [] // Estado final
    };

    return transicionesValidas[this.status]?.includes(nuevoEstado) || false;
  }

  // Obtener label humanizado del estado
  getEstadoLabel() {
    const labels = {
      'pending': 'Pendiente',
      'paid': 'Pagado',
      'in_kitchen': 'En Cocina',
      'ready': 'Listo',
      'delivered': 'Entregado',
      'cancelled': 'Cancelado'
    };
    return labels[this.status] || this.status;
  }

  // Método para obtener productos agrupados por categoría (útil para cocina)
  getProductosPorCategoria() {
    const grupos = {};
    this.products.forEach(producto => {
      const categoria = producto.category || 'Sin categoría';
      if (!grupos[categoria]) {
        grupos[categoria] = [];
      }
      grupos[categoria].push(producto);
    });
    return grupos;
  }

  // Estimar tiempo de preparación basado en productos
  estimarTiempoPreparacion() {
    // Tiempos base por categoría (en minutos)
    const tiemposPorCategoria = {
      'Pollos': 25,
      'Bebidas': 2,
      'Acompañamientos': 10,
      'Postres': 8,
      'Ensaladas': 5
    };

    let tiempoTotal = 0;
    this.products.forEach(producto => {
      const tiempoBase = tiemposPorCategoria[producto.category] || 10;
      tiempoTotal += tiempoBase * producto.quantity;
    });

    // Aplicar factor de concurrencia (si hay muchos productos del mismo tipo, hay economías de escala)
    if (this.products.length > 3) {
      tiempoTotal *= 0.8; // 20% de reducción por paralelización
    }

    this.tiempoEstimado = Math.ceil(tiempoTotal);
    return this.tiempoEstimado;
  }
}

module.exports = Order;

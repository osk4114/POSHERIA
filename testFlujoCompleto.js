// --- Funciones para flujo de cocina ---
async function crearUsuarioCocina(adminToken) {
  // Crea usuario cocina si no existe
  const username = 'cocina_test';
  const password = 'cocina123';
  try {
    // Eliminar si existe
    const usuariosRes = await axios.get(`${API_BASE}/users`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const cocinaExistente = usuariosRes.data.find(u => u.username === username);
    if (cocinaExistente) {
      await axios.delete(`${API_BASE}/users/${cocinaExistente._id}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
    }
  } catch {}
  // Crear
  await axios.post(`${API_BASE}/users`, {
    username,
    password,
    name: 'Cocina de Prueba',
    role: 'cocina',
    active: true
  }, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  return { username, password };
}

async function loginCocina() {
  const res = await axios.post(`${API_BASE}/users/login`, { username: 'cocina_test', password: 'cocina123' });
  return res.data.token;
}

async function listarPedidosCocina(token) {
  const res = await axios.get(`${API_BASE}/kitchen/orders`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

async function actualizarEstadoPedidoCocina(token, orderId, status) {
  const res = await axios.put(`${API_BASE}/kitchen/orders/${orderId}/status`, { status }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}
async function listarPedidosPendientes(token) {
  const res = await axios.get(`${API_BASE}/orders?status=pending`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}
async function cerrarCaja(token, cajaId, finalAmount) {
  const res = await axios.post(`${API_BASE}/caja/cerrar`, {
    cajaId,
    finalAmount
  }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

// Cambia estos datos según el usuario a testear
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';
const CAJERO_USERNAME = 'cajero_test';
const CAJERO_PASSWORD = 'cajero123';
const PRODUCT_ID = '68cadb9ecc27b97a93be0349';
const TABLE_ID = '68cadb9ecc27b97a93be034a';

async function obtenerToken(username, password) {
  const res = await axios.post(`${API_BASE}/users/login`, { username, password });
  return res.data.token;
}

async function obtenerUsuario(token) {
  const res = await axios.get(`${API_BASE}/users/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

async function abrirCaja(token, userId) {
  const res = await axios.post(`${API_BASE}/caja/abrir`, {
    assignedTo: userId,
    initialAmount: 200
  }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

async function crearPedido(token) {
  const res = await axios.post(`${API_BASE}/orders`, {
    products: [
      { productId: PRODUCT_ID, name: 'Pollo a la brasa', quantity: 2, price: 30 }
    ],
    table: TABLE_ID,
    type: 'dine-in'
  }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data.orderId;
}

async function editarPedido(token, orderId) {
  await axios.put(`${API_BASE}/orders/${orderId}`, {
    products: [
      { productId: PRODUCT_ID, name: 'Pollo a la brasa', quantity: 3, price: 30 }
    ]
  }, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function cobrarPedido(token, orderId) {
  try {
    const res = await axios.post(`${API_BASE}/orders/${orderId}/pay`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data;
  } catch (err) {
    if (err.response) {
      console.error('Error en cobrarPedido - status:', err.response.status);
      console.error('Error en cobrarPedido - data:', err.response.data);
    } else {
      console.error('Error en cobrarPedido:', err.message);
    }
    throw err;
  }
}

async function consultarCaja(token, userId) {
  const res = await axios.get(`${API_BASE}/caja/estado?assignedTo=${userId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

// --- Funciones para flujo de mozo y add-ons ---
async function crearUsuarioMozo(adminToken) {
  // Crea usuario mozo si no existe
  const username = 'mozo_test';
  const password = 'mozo123';
  try {
    // Eliminar si existe
    const usuariosRes = await axios.get(`${API_BASE}/users`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const mozoExistente = usuariosRes.data.find(u => u.username === username);
    if (mozoExistente) {
      await axios.delete(`${API_BASE}/users/${mozoExistente._id}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
    }
  } catch {}
  // Crear
  await axios.post(`${API_BASE}/users`, {
    username,
    password,
    name: 'Mozo de Prueba',
    role: 'mozo',
    active: true
  }, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  return { username, password };
}

async function loginMozo() {
  const res = await axios.post(`${API_BASE}/users/login`, { username: 'mozo_test', password: 'mozo123' });
  return res.data.token;
}

async function asignarMesa(token, tableId) {
  const res = await axios.post(`${API_BASE}/tables/${tableId}/asignar`, {}, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

async function liberarMesa(token, tableId) {
  const res = await axios.post(`${API_BASE}/tables/${tableId}/liberar`, {}, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

async function crearAddOn(token, parentOrderId) {
  const res = await axios.post(`${API_BASE}/orders/addon`, {
    parentOrderId,
    products: [
      { productId: PRODUCT_ID, name: 'Papas fritas', quantity: 1, price: 10 }
    ]
  }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

async function listarAddOns(token, parentOrderId) {
  const res = await axios.get(`${API_BASE}/orders/addon/history/${parentOrderId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

async function main() {

  // Paso 0: Login como admin y eliminar usuario cajero si existe, luego crearlo
  console.log('Paso 0: Login admin para crear cajero');
  let adminToken;
  try {
    adminToken = await obtenerToken(ADMIN_USERNAME, ADMIN_PASSWORD);
    console.log('Token admin:', adminToken);
  } catch (err) {
    console.log('No se pudo obtener token de admin:', err?.message || err);
    throw err;
  }

  // Eliminar usuario cajero y mozo si existen (debe ir después de obtener el token)
  try {
    const usuariosRes = await axios.get(`${API_BASE}/users`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const cajeroExistente = usuariosRes.data.find(u => u.username === CAJERO_USERNAME);
    if (cajeroExistente) {
      await axios.delete(`${API_BASE}/users/${cajeroExistente._id}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
    }
    const mozoExistente = usuariosRes.data.find(u => u.username === 'mozo_test');
    if (mozoExistente) {
      await axios.delete(`${API_BASE}/users/${mozoExistente._id}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
    }
  } catch (err) {
    console.log('No se pudo eliminar usuario cajero anterior (puede que no exista):', err?.message || err);
  }

  // Crear usuario cajero y mozo para obtener sus tokens
  // (esto se repite después, pero aquí es necesario para obtener los tokens antes del PUT)
  try {
    // Eliminar si existen
    const usuariosRes = await axios.get(`${API_BASE}/users`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const cajeroExistente = usuariosRes.data.find(u => u.username === CAJERO_USERNAME);
    if (cajeroExistente) {
      await axios.delete(`${API_BASE}/users/${cajeroExistente._id}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
    }
    const mozoExistente = usuariosRes.data.find(u => u.username === 'mozo_test');
    if (mozoExistente) {
      await axios.delete(`${API_BASE}/users/${mozoExistente._id}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
    }
  } catch {}
  // Crear cajero
  await axios.post(`${API_BASE}/users`, {
    username: CAJERO_USERNAME,
    password: CAJERO_PASSWORD,
    name: 'Cajero de Prueba',
    role: 'caja',
    active: true
  }, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  // Crear mozo
  await axios.post(`${API_BASE}/users`, {
    username: 'mozo_test',
    password: 'mozo123',
    name: 'Mozo de Prueba',
    role: 'mozo',
    active: true
  }, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  // Obtener tokens
  const cajaToken = await obtenerToken(CAJERO_USERNAME, CAJERO_PASSWORD);
  const mozoToken = await obtenerToken('mozo_test', 'mozo123');

  // --- Forzar la mesa de test a estado libre antes de iniciar ---
  let mesaLibreOk = false;
  let lastError = null;
  for (const tokenIntento of [cajaToken, mozoToken]) {
    try {
      const resp = await axios.put(`${API_BASE}/tables/${TABLE_ID}`,
        {
          status: 'free',
          waiterId: null,
          waiterStatus: 'libre',
          orders: []
        },
        {
          headers: { Authorization: `Bearer ${tokenIntento}` }
        }
      );
      console.log('Respuesta PUT:', resp.data);
      mesaLibreOk = true;
      break;
    } catch (err) {
      console.log('Error PUT:', err?.response?.data || err.message);
      lastError = err;
    }
  }
  if (!mesaLibreOk) {
    throw new Error('No se pudo forzar la mesa a libre con token de caja ni mozo. Último error: ' + (lastError?.response?.data?.message || lastError?.message));
  }
  // --- Validar estado de la mesa antes de crear pedido ---
  const mesasAntes = await axios.get(`${API_BASE}/tables`);
  // Soporta distintos formatos de _id
  function getIdString(m) {
    if (!m._id) return '';
    if (typeof m._id === 'string') return m._id;
    if (m._id.$oid) return m._id.$oid;
    if (m._id.toString) return m._id.toString();
    return String(m._id);
  }
  const mesaTest = mesasAntes.data.find(m => getIdString(m) === TABLE_ID);
  console.log('Mesas recibidas:', mesasAntes.data);
  if (!mesaTest) throw new Error('La mesa de test no existe');
  if (mesaTest.status !== 'free') throw new Error('La mesa de test no está libre antes de crear el pedido');


  try {

    // Buscar usuario cajero existente y eliminarlo si existe
    try {
      const usuariosRes = await axios.get(`${API_BASE}/users`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const cajeroExistente = usuariosRes.data.find(u => u.username === CAJERO_USERNAME);
      if (cajeroExistente) {
        await axios.delete(`${API_BASE}/users/${cajeroExistente._id}`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log('Usuario cajero anterior eliminado.');
      }
    } catch (err) {
      console.warn('No se pudo eliminar usuario cajero anterior (puede que no exista):', err.message);
    }


    // Crear usuario cajero
    const res = await axios.post(`${API_BASE}/users`, {
      username: CAJERO_USERNAME,
      password: CAJERO_PASSWORD,
      name: 'Cajero de Prueba',
      role: 'caja',
      active: true
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('Usuario cajero creado:', res.data);

    // Crear usuario cocina
    await crearUsuarioCocina(adminToken);
    console.log('Usuario cocina creado o actualizado');

    // Crear usuario mozo
    await crearUsuarioMozo(adminToken);
    console.log('Usuario mozo creado o actualizado');


  // Paso 1: Login y obtener token del cajero (ya obtenido)
  console.log('Paso 1: Login cajero y obtener token');
  const token = cajaToken;
  console.log('Token cajero:', token);

    // Paso 2: Obtener datos del usuario cajero
    const usuario = await obtenerUsuario(token);
    console.log('Usuario cajero:', usuario);

    // Paso 2.1: Limpiar cajas abiertas/pendientes del cajero antes de iniciar
    try {
      await axios.delete(`${API_BASE}/caja/limpiar?assignedTo=${usuario._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Cajas abiertas/pendientes del cajero eliminadas.');
    } catch (err) {
      console.warn('No se pudo limpiar cajas previas (puede que no existan):', err.response?.data?.message || err.message);
    }

    // Paso 3: Abrir caja
    let caja;
    let cajaId;
    try {
      caja = await abrirCaja(token, usuario._id);
      cajaId = caja.cajaId;
      console.log('Caja abierta:', caja);
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message === 'Ya existe una caja abierta para este usuario.') {
        // Obtener la caja abierta
        const estado = await consultarCaja(token, usuario._id);
        cajaId = estado._id;
        console.log('Caja ya estaba abierta:', estado);
      } else {
        throw err;
      }
    }

    // Paso 3.1: Intentar crear pedido antes de confirmar caja (debe fallar)
    let orderId;
    let errorAntesConfirmar = false;
    try {
      await crearPedido(token);
      console.error('ERROR: Se pudo crear un pedido antes de confirmar la caja (esto NO debería pasar)');
    } catch (err) {
      errorAntesConfirmar = true;
      console.log('Correcto: No se puede crear pedido antes de confirmar la caja:', err.response?.data?.message || err.message);
    }
    if (!errorAntesConfirmar) throw new Error('La API permitió crear pedido antes de confirmar la caja');


    // Paso 3.2: Confirmar caja
    console.log('Paso 3.2: Confirmar caja');
    try {
      const confirmarRes = await axios.post(`${API_BASE}/caja/confirmar`, {
        cajaId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Caja confirmada:', confirmarRes.data);
    } catch (err) {
      if (err.response && err.response.status === 404) {
        console.error('No se pudo confirmar la caja: ya estaba confirmada o no existe. Mensaje:', err.response.data.message);
        // Si ya estaba confirmada, continuar el flujo
      } else {
        throw err;
      }
    }


  // Paso 4: Crear pedido (ahora sí debe funcionar)
  orderId = await crearPedido(token);
  console.log('Pedido creado:', orderId);

  // --- Validar que la mesa quedó ocupada ---
  const mesasDespuesPedido = await axios.get(`${API_BASE}/tables`);
  const mesaOcupada = mesasDespuesPedido.data.find(m => String(m._id) === TABLE_ID);
  if (!mesaOcupada) throw new Error('La mesa de test no existe después de crear el pedido');
  if (mesaOcupada.status !== 'occupied') throw new Error('La mesa no quedó ocupada tras crear el pedido');

  // --- FLUJO DE MOZO ---
  console.log('--- Iniciando flujo de mozo ---');
  
  // Token mozo ya obtenido
  console.log('Token mozo:', mozoToken);

  // Asignar mesa al mozo
  console.log('Asignando mesa al mozo...');
  const asignacion = await asignarMesa(mozoToken, TABLE_ID);
  console.log('Mesa asignada al mozo:', asignacion);

  // Validar que la mesa tiene waiterId asignado
  const mesasDespuesAsignacion = await axios.get(`${API_BASE}/tables`);
  const mesaAsignada = mesasDespuesAsignacion.data.find(m => String(m._id) === TABLE_ID);
  if (!mesaAsignada.waiterId) throw new Error('La mesa no tiene waiterId asignado tras asignación');

  // Paso 0: Login admin para gestión de datos base
  console.log('Paso 0: Login admin para gestión de datos base');
  const adminToken = await obtenerToken(ADMIN_USERNAME, ADMIN_PASSWORD);
  console.log('Token admin:', adminToken);

  // --- Verificar/crear producto y mesa de test ---
  // Producto
  try {
    const productos = await axios.get(`${API_BASE}/menu`, { headers: { Authorization: `Bearer ${adminToken}` } });
    const prod = productos.data.find(p => String(p._id) === PRODUCT_ID);
    if (!prod) {
      await axios.post(`${API_BASE}/menu`, {
        _id: PRODUCT_ID,
        name: 'Pollo a la brasa',
        price: 30,
        category: 'Pollo',
        available: true,
        description: 'Delicioso pollo a la brasa tradicional'
      }, { headers: { Authorization: `Bearer ${adminToken}` } });
      console.log('Producto de test creado');
    }
  } catch (err) {
    console.warn('No se pudo verificar/crear producto de test:', err.message);
  }
  // Mesa
  try {
    const mesas = await axios.get(`${API_BASE}/tables`);
    const mesa = mesas.data.find(m => String(m._id) === TABLE_ID);
    if (!mesa) {
      await axios.post(`${API_BASE}/tables`, {
        _id: TABLE_ID,
        number: 1,
        status: 'free',
        orders: [],
        waiterId: null,
        waiterStatus: 'libre'
      }, { headers: { Authorization: `Bearer ${adminToken}` } });
      console.log('Mesa de test creada');
    }
  } catch (err) {
    console.warn('No se pudo verificar/crear mesa de test:', err.message);
  }

  // --- Crear usuarios de prueba y obtener tokens ---
  try {
    // Eliminar si existen
    const usuariosRes = await axios.get(`${API_BASE}/users`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const cajeroExistente = usuariosRes.data.find(u => u.username === CAJERO_USERNAME);
    if (cajeroExistente) {
      await axios.delete(`${API_BASE}/users/${cajeroExistente._id}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
    }
    const mozoExistente = usuariosRes.data.find(u => u.username === 'mozo_test');
    if (mozoExistente) {
      await axios.delete(`${API_BASE}/users/${mozoExistente._id}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
    }
  } catch {}
  // Crear cajero
  await axios.post(`${API_BASE}/users`, {
    username: CAJERO_USERNAME,
    password: CAJERO_PASSWORD,
    name: 'Cajero de Prueba',
    role: 'caja',
    active: true
  }, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  // Crear mozo
  await axios.post(`${API_BASE}/users`, {
    username: 'mozo_test',
    password: 'mozo123',
    name: 'Mozo de Prueba',
    role: 'mozo',
    active: true
  }, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  // Obtener tokens
  const cajaToken = await obtenerToken(CAJERO_USERNAME, CAJERO_PASSWORD);
  const mozoToken = await obtenerToken('mozo_test', 'mozo123');

  // --- Forzar la mesa de test a estado libre antes de iniciar ---
  let mesaLibreOk = false;
  let lastError = null;
  for (const tokenIntento of [cajaToken, mozoToken]) {
    try {
      await axios.put(`${API_BASE}/tables/${TABLE_ID}`,
        {
          status: 'free',
          waiterId: null,
          waiterStatus: 'libre',
          orders: []
        },
        {
          headers: { Authorization: `Bearer ${tokenIntento}` }
        }
      );
      mesaLibreOk = true;
      break;
    } catch (err) {
      lastError = err;
    }
  }
  if (!mesaLibreOk) {
    throw new Error('No se pudo forzar la mesa a libre con token de caja ni mozo. Último error: ' + (lastError?.response?.data?.message || lastError?.message));
  }
  const mesaLibre = mesasDespuesEntrega.data.find(m => String(m._id) === TABLE_ID);
  if (!mesaLibre) throw new Error('La mesa de test no existe después de entregar el pedido');
  if (mesaLibre.status !== 'free') throw new Error('La mesa no quedó libre tras entregar el pedido');

    console.log('Paso 8: Consultar caja y movimientos');
    const cajaEstado = await consultarCaja(token, usuario._id);
    console.log('Estado de caja:', cajaEstado);

    console.log('Paso 9: Cerrar caja');
    const totalFinal = cajaEstado.movements ? cajaEstado.movements.reduce((sum, m) => sum + m.amount, cajaEstado.initialAmount || 0) : cajaEstado.initialAmount || 0;
    const cierre = await cerrarCaja(token, cajaId, totalFinal);
    console.log('Caja cerrada:', cierre);

  } catch (err) {
    if (err.response) {
      console.error('Error status:', err.response.status);
      console.error('Error data:', err.response.data);
    } else {
      console.error('Error:', err.message);
    }
  }
}
main();

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
const USERNAME = 'admin';
const USER_PASSWORD = 'admin123';
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

async function main() {
  try {
    console.log('Paso 1: Login y obtener token');
    const token = await obtenerToken(USERNAME, USER_PASSWORD);
    console.log('Token:', token);

    console.log('Paso 2: Obtener datos del usuario');
    const usuario = await obtenerUsuario(token);
    console.log('Usuario:', usuario);

    console.log('Paso 3: Consultar estado de caja');
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

    console.log('Paso 4: Crear pedido');
    const orderId = await crearPedido(token);
    console.log('Pedido creado:', orderId);

    console.log('Paso 5: Comprobar pedidos pendientes antes de editar');
    const pendientes = await listarPedidosPendientes(token);
    console.log('Pedidos pendientes antes de editar:', pendientes.map(p => p._id));

    console.log('Paso 6: Editar pedido');
    await editarPedido(token, orderId);
    console.log('Pedido actualizado');

    console.log('Paso 7: Cobrar pedido');
    await cobrarPedido(token, orderId);
    console.log('Pedido cobrado');

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

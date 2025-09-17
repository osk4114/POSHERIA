const axios = require('axios');

const API_URL = 'http://localhost:3000/api/orders';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2OGNhZDE0NTBlYjZjN2Y4NWMwNTE5YzIiLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzU4MTI1MzI4LCJleHAiOjE3NTgxNTQxMjh9.WAdx5nNyCIMfyKesc1xNGUjE6UXPBC2mCb5tTe7MQuM';

// IDs reales de la base de datos
const PRODUCT_ID = '68cadb9ecc27b97a93be0349';
const TABLE_ID = '68cadb9ecc27b97a93be034a';

async function main() {
  try {

    // 1. Crear pedido
    const createRes = await axios.post(API_URL, {
      products: [
        { productId: PRODUCT_ID, name: 'Pollo a la brasa', quantity: 2, price: 30 }
      ],
      table: TABLE_ID,
      type: 'dine-in'
    }, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    console.log('Pedido creado:', createRes.data);
    const orderId = createRes.data.orderId;

    // 2. Editar pedido
    const updateRes = await axios.put(`${API_URL}/${orderId}`, {
      products: [
        { productId: PRODUCT_ID, name: 'Pollo a la brasa', quantity: 3, price: 30 }
      ]
    }, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    console.log('Pedido actualizado:', updateRes.data);

    // 3. Listar pedidos pendientes
    const listRes = await axios.get(`${API_URL}?status=pending`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    console.log('Pedidos pendientes:', listRes.data);

    // 4. Cobrar pedido
    const payRes = await axios.post(`${API_URL}/${orderId}/pay`, {}, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    console.log('Pedido cobrado:', payRes.data);

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
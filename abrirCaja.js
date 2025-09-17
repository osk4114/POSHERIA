const axios = require('axios');

const API_URL = 'http://localhost:3000/api/caja/abrir';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2OGNhZDE0NTBlYjZjN2Y4NWMwNTE5YzIiLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzU4MTI1MzI4LCJleHAiOjE3NTgxNTQxMjh9.WAdx5nNyCIMfyKesc1xNGUjE6UXPBC2mCb5tTe7MQuM';
const USER_ID = '68cad1450eb6c7f85c0519c2'; // ID del usuario cajero

async function abrirCaja() {
  try {
    const res = await axios.post(API_URL, {
      assignedTo: USER_ID,
      initialAmount: 200
    }, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    console.log('Caja abierta:', res.data);
  } catch (err) {
    if (err.response) {
      console.error('Error status:', err.response.status);
      console.error('Error data:', err.response.data);
    } else {
      console.error('Error:', err.message);
    }
  }
}

abrirCaja();

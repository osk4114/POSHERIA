// scripts/insertSampleData.js
// Inserta un producto de menú y una mesa de ejemplo

const { connectDB } = require('../config/mongo');

async function insertSampleData() {
  const db = await connectDB();

  // Insertar producto de menú
  const menu = db.collection('menu');
  const menuResult = await menu.insertOne({
    name: 'Pollo a la brasa',
    price: 30,
    category: 'Pollo',
    available: true,
    description: 'Delicioso pollo a la brasa tradicional',
    createdAt: new Date(),
    updatedAt: new Date()
  });
  console.log('Producto de menú insertado:', menuResult.insertedId);

  // Insertar mesa
  const tables = db.collection('tables');
  const tableResult = await tables.insertOne({
    number: 1,
    status: 'free',
    orders: [],
    createdAt: new Date(),
    updatedAt: new Date()
  });
  console.log('Mesa insertada:', tableResult.insertedId);

  process.exit(0);
}

insertSampleData().catch(err => {
  console.error('Error al insertar datos de ejemplo:', err);
  process.exit(1);
});

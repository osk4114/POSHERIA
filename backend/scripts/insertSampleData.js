
// scripts/insertSampleData.js
// Inserta un producto de menú y una mesa de ejemplo con IDs fijos

const { connectDB } = require('../config/mongo');
const { ObjectId } = require('mongodb');

async function insertSampleData() {
  try {
    const db = await connectDB();


  // Elimina todos los documentos de las colecciones menu y tables
  await db.collection('menu').deleteMany({});
  await db.collection('tables').deleteMany({});

    // Insertar producto de menú con _id fijo
    const menuDoc = {
      _id: new ObjectId('650c1f2e2e8f4b2b8c8b4567'),
      name: 'Pollo a la brasa',
      price: 50,
      category: 'Main',
      available: true,
      description: 'Delicious Peruvian rotisserie chicken',
      createdAt: new Date(),
      updatedAt: new Date(),
      stock: 10
    };
    await db.collection('menu').insertOne(menuDoc);
    console.log('Producto de menú insertado con ID fijo:', menuDoc._id);

    // Insertar mesa con _id fijo
    const tableDoc = {
      _id: new ObjectId('68cadb9ecc27b97a93be034a'),
      number: 1,
      status: 'free',
      orders: [],
      waiterId: null,
      waiterStatus: 'libre',
      capacity: 4,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    await db.collection('tables').insertOne(tableDoc);
    console.log('Mesa insertada con ID fijo:', tableDoc._id);

    process.exit(0);
  } catch (err) {
    console.error('Error al insertar datos de ejemplo:', err);
    process.exit(1);
  }
}

insertSampleData();

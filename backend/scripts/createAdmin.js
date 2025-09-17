// scripts/createAdmin.js
// Script para crear el usuario admin inicial

const { connectDB } = require('../config/mongo');
const bcrypt = require('bcryptjs');

async function createAdmin() {
  const db = await connectDB();
  const users = db.collection('users');

  const username = 'admin';
  const password = 'admin123'; // Cambia esto después del primer login
  const name = 'Administrador';
  const role = 'admin';

  // Verifica si ya existe un admin
  const exists = await users.findOne({ username });
  if (exists) {
    console.log('El usuario admin ya existe.');
    process.exit(0);
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const adminUser = {
    username,
    password: hashedPassword,
    name,
    role,
    active: true,
    createdAt: new Date()
  };

  await users.insertOne(adminUser);
  console.log('Usuario admin creado con éxito.');
  process.exit(0);
}

createAdmin().catch(err => {
  console.error('Error al crear admin:', err);
  process.exit(1);
});

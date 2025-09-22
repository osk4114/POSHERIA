// scripts/createKitchenUser.js
// Crea un usuario de cocina para pruebas

const bcrypt = require('bcryptjs');
const { connectDB } = require('../config/mongo');

async function createKitchenUser() {
  try {
    const db = await connectDB();
    console.log('📡 Conectado a MongoDB');

    // Datos del usuario de cocina
    const username = 'cocina';
    const password = 'cocina123';
    const name = 'Chef Principal';
    const role = 'cocina';

    // Verificar si ya existe
    const existingUser = await db.collection('users').findOne({ username });
    if (existingUser) {
      console.log('⚠️ El usuario de cocina ya existe');
      console.log('👤 Usuario existente:', {
        username: existingUser.username,
        name: existingUser.name,
        role: existingUser.role
      });
      process.exit(0);
    }

    // Hashear la contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Crear el usuario
    const kitchenUser = {
      username,
      password: hashedPassword,
      name,
      role,
      active: true,
      createdAt: new Date()
    };

    const result = await db.collection('users').insertOne(kitchenUser);
    
    console.log('✅ Usuario de cocina creado exitosamente:');
    console.log('👤 Username:', username);
    console.log('🔑 Password:', password);
    console.log('👨‍🍳 Nombre:', name);
    console.log('🏷️ Rol:', role);
    console.log('🆔 ID:', result.insertedId);

    process.exit(0);
  } catch (err) {
    console.error('❌ Error al crear usuario de cocina:', err);
    process.exit(1);
  }
}

createKitchenUser();
const mongoose = require('mongoose');
const { connectDB, getDB } = require('../config/mongo');

const menuItems = [
  {
    name: 'Pollo Entero',
    price: 45.00,
    category: 'Pollos',
    description: 'Pollo a la brasa entero, jugoso y dorado. Acompañado con papas fritas y ensalada.',
    image: '/public/images/menu/1pollo.webp',
    available: true
  },
  {
    name: 'Medio Pollo',
    price: 25.00,
    category: 'Pollos',
    description: 'Medio pollo a la brasa, perfecto para 2 personas. Incluye papas fritas.',
    image: '/public/images/menu/mediopollo.webp',
    available: true
  },
  {
    name: 'Cuarto de Pollo',
    price: 15.00,
    category: 'Pollos',
    description: 'Cuarto de pollo a la brasa con papas fritas y ensalada criolla.',
    image: '/public/images/menu/cuartopollo.webp',
    available: true
  },
  {
    name: 'Octavo de Pollo',
    price: 8.00,
    category: 'Pollos',
    description: 'Octavo de pollo a la brasa, ideal para niños. Incluye papas.',
    image: '/public/images/menu/octavopollo.webp',
    available: true
  },
  {
    name: 'Chicha Morada',
    price: 8.00,
    category: 'Bebidas',
    description: 'Refrescante chicha morada casera, preparada con maíz morado.',
    image: '/public/images/menu/chicha.webp',
    available: true
  },
  {
    name: 'Chicha Morada Familiar',
    price: 12.00,
    category: 'Bebidas',
    description: 'Chicha morada en presentación familiar, rinde para 4 personas.',
    image: '/public/images/menu/chicha (1).webp',
    available: true
  },
  {
    name: 'Gaseosa Personal',
    price: 5.00,
    category: 'Bebidas',
    description: 'Gaseosa personal de 500ml, varias opciones disponibles.',
    image: '/public/images/menu/gaseosas-personales.webp',
    available: true
  },
  {
    name: 'Gaseosa Familiar',
    price: 12.00,
    category: 'Bebidas',
    description: 'Gaseosa familiar de 1.5L, perfecta para compartir.',
    image: '/public/images/menu/gaseosa.webp',
    available: true
  }
];

async function insertMenuData() {
  try {
    console.log('Conectando a la base de datos...');
    await connectDB();
    const db = await getDB();
    const collection = db.collection('menu');

    // Limpiar la colección existente
    console.log('Limpiando menú existente...');
    await collection.deleteMany({});

    // Insertar nuevos elementos del menú
    console.log('Insertando nuevos elementos del menú...');
    const result = await collection.insertMany(menuItems);

    console.log(`✅ Se insertaron ${result.insertedCount} elementos del menú correctamente`);
    
    // Mostrar los elementos insertados
    console.log('\n📋 Elementos del menú insertados:');
    menuItems.forEach((item, index) => {
      console.log(`${index + 1}. ${item.name} - S/. ${item.price.toFixed(2)} (${item.category})`);
    });

    console.log('\n🎉 ¡Menú poblado exitosamente!');
    
  } catch (error) {
    console.error('❌ Error al poblar el menú:', error);
  } finally {
    process.exit(0);
  }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  insertMenuData();
}

module.exports = { insertMenuData, menuItems };
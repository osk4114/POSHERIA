// Archivo principal del backend
const express = require('express');
const path = require('path');
const config = require('./config/config');
const logger = require('./middlewares/logger');



const homeRoutes = require('./routes/homeRoutes');
const orderRoutes = require('./routes/orderRoutes');
const userRoutes = require('./routes/userRoutes');
const cajaRoutes = require('./routes/cajaRoutes');
const kitchenRoutes = require('./routes/kitchenRoutes');


const { connectDB } = require('./config/mongo');
const app = express();

app.use(logger);
app.use(express.json());
// Servir archivos estáticos del build de React desde backend/views
app.use(express.static(path.join(__dirname, 'views')));

// Rutas backend (API)




const tableRoutes = require('./routes/tableRoutes');
app.use('/api', homeRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/caja', cajaRoutes);
app.use('/api/kitchen', kitchenRoutes);
app.use('/api/tables', tableRoutes);

// Para cualquier otra ruta, servir index.html de React
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});


// Probar conexión a MongoDB antes de iniciar el servidor

const { setupSocket } = require('./socket');

connectDB()
  .then(() => {
    const server = app.listen(config.port, () => {
      console.log(`Servidor backend escuchando en http://localhost:${config.port}`);
    });
    // Inicializar socket.io y exponer globalmente para forceLogoutUser
    const io = setupSocket(server);
    global._io = io;
  })
  .catch((err) => {
    console.error('Error al conectar a MongoDB:', err);
    process.exit(1);
  });

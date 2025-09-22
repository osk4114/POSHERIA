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
const menuRoutes = require('./routes/menuRoutes');
const healthRoutes = require('./routes/healthRoutes');


const { connectDB } = require('./config/mongo');
const app = express();

app.use(logger);
app.use(express.json());
// Servir archivos estáticos del build de React desde backend/views
app.use(express.static(path.join(__dirname, 'views')));
// Servir archivos públicos (imágenes, etc.)
app.use('/public', express.static(path.join(__dirname, 'public')));

// Rutas backend (API)




const tableRoutes = require('./routes/tableRoutes');
const debugRoutes = require('./routes/debugRoutes');
app.use('/api', homeRoutes);
app.use('/api', healthRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/caja', cajaRoutes);
app.use('/api/kitchen', kitchenRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/debug', debugRoutes);

// Para cualquier otra ruta, servir index.html de React
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});


// Probar conexión a MongoDB antes de iniciar el servidor

const { setupSocket } = require('./socket');
const { clearTokens } = require('./services/tokenStore');

connectDB()
  .then(() => {
    const server = app.listen(config.port, () => {
      console.log(`Servidor backend escuchando en http://localhost:${config.port}`);
    });
    // Inicializar socket.io y exponer globalmente para forceLogoutUser
    const io = setupSocket(server);
    global._io = io;

    // Manejo graceful de cierre del servidor
    const gracefulShutdown = (signal) => {
      console.log(`\n[${new Date().toISOString()}] Recibida señal ${signal}, cerrando servidor...`);
      
      // Limpiar todos los tokens
      clearTokens();
      console.log('[CLEANUP] Tokens limpiados');
      
      // Cerrar servidor HTTP
      server.close(() => {
        console.log('[CLEANUP] Servidor HTTP cerrado');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  })
  .catch((err) => {
    console.error('Error al conectar a MongoDB:', err);
    process.exit(1);
  });

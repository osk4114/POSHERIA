// Archivo principal del backend
const express = require('express');
const path = require('path');
const config = require('./config/config');
const logger = require('./middlewares/logger');


const homeRoutes = require('./routes/homeRoutes');
const orderRoutes = require('./routes/orderRoutes');
const userRoutes = require('./routes/userRoutes');
const cajaRoutes = require('./routes/cajaRoutes');


const { connectDB } = require('./config/mongo');
const app = express();

app.use(logger);
app.use(express.json());
// Servir archivos estáticos del build de React desde backend/views
app.use(express.static(path.join(__dirname, 'views')));

// Rutas backend (API)


app.use('/api', homeRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/caja', cajaRoutes);

// Para cualquier otra ruta, servir index.html de React
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});


// Probar conexión a MongoDB antes de iniciar el servidor
connectDB()
  .then(() => {
    app.listen(config.port, () => {
      console.log(`Servidor backend escuchando en http://localhost:${config.port}`);
    });
  })
  .catch((err) => {
    console.error('Error al conectar a MongoDB:', err);
    process.exit(1);
  });

// Archivo principal del backend
const express = require('express');
const path = require('path');
const config = require('./config/config');
const logger = require('./middlewares/logger');
const homeRoutes = require('./routes/homeRoutes');

const app = express();

app.use(logger);
// Servir archivos estáticos del build de React desde backend/views
app.use(express.static(path.join(__dirname, 'views')));

// Rutas backend (API)
app.use('/api', homeRoutes);

// Para cualquier otra ruta, servir index.html de React
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.listen(config.port, () => {
  console.log(`Servidor backend escuchando en http://localhost:${config.port}`);
});

// Archivo principal del backend
const express = require('express');
const path = require('path');
const config = require('./config/config');
const logger = require('./middlewares/logger');
const homeRoutes = require('./routes/homeRoutes');

const app = express();

app.use(logger);
app.use(express.static(path.join(__dirname, '../frontend/public')));
app.use('/', homeRoutes);
app.use(express.static(path.join(__dirname, 'views')));

app.listen(config.port, () => {
  console.log(`Servidor backend escuchando en http://localhost:${config.port}`);
});

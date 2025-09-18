// routes/healthRoutes.js
const express = require('express');
const router = express.Router();

// Health check endpoint para verificar conectividad
router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'POSHERIA-API'
  });
});

router.head('/health', (req, res) => {
  res.status(200).end();
});

module.exports = router;
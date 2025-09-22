// routes/debugRoutes.js
const express = require('express');
const router = express.Router();

// Endpoint para recibir logs del frontend
router.post('/log', (req, res) => {
  const { message, data } = req.body;
  console.log(`🔍 DEBUG FRONTEND: ${message}`, data ? JSON.stringify(data) : '');
  res.status(200).json({ status: 'logged' });
});

module.exports = router;
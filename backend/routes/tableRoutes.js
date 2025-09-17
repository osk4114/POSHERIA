const express = require('express');
const router = express.Router();
const tableController = require('../controllers/tableController');

// GET /api/tables - List all tables
router.get('/', tableController.listarMesas);

module.exports = router;

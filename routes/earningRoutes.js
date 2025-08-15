// routes/earningRoutes.js
const express = require('express');
const router = express.Router();
const earningController = require('../controllers/earningController');
const authenticate = require('../middleware/authMiddleware');

// Récupérer les gains disponibles
router.post('/claim', authenticate, earningController.claimEarnings);

module.exports = router;
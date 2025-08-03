const express = require('express');
const router = express.Router();
const investmentPackController = require('../controllers/investmentPackController');
const authMiddleware = require('../middleware/authMiddleware'); // Si besoin d'authentification

// Routes publiques
router.get('/', investmentPackController.getAllPacks);
router.get('/:id', investmentPackController.getPackById);

// Routes protégées (si besoin d'authentification)
router.post('/', authMiddleware, investmentPackController.createPack);
router.put('/:id', authMiddleware, investmentPackController.updatePack);
router.post('/:id/invest', authMiddleware, investmentPackController.createInvestment);

module.exports = router;
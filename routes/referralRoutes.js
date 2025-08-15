// routes/referralRoutes.js
const express = require('express');
const router = express.Router();
const referralController = require('../controllers/referralController');

router.get('/', referralController.getReferralData);

module.exports = router;
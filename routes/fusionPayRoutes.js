const express = require("express");
const router = express.Router();
const {
  initiatePayment,
  checkPaymentStatus,
  handleWebhook,
} = require("../controllers/fusionPayController");
const authenticate = require("../middleware/authMiddleware");

// Route pour initier un paiement (protégée)
router.post("/initiate-payment", authenticate, initiatePayment);

// Route pour vérifier le statut d'un paiement
router.get("/payment-status", checkPaymentStatus);

// Route pour gérer les webhooks FusionPay (non protégée)
router.post("/webhook", handleWebhook);

module.exports = router;

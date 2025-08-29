const { FusionPay } = require("fusionpay");

// Initialisation de FusionPay
const fusionPay = new FusionPay(
  process.env.FUSIONPAY_API_URL || "https://api.fusionpay.com"
);

/**
 * Controller pour initier un paiement
 */
const initiatePayment = async (req, res) => {
  try {
    const { amount, currency, articles, customerInfo, returnUrl, webhookUrl } =
      req.body;
    const userId = req.user.id; // Récupéré du middleware d'authentification

    // Configuration du paiement
    fusionPay
      .totalPrice(amount)
      .returnUrl(returnUrl || `${process.env.FRONTEND_URL}/payment-success`)
      .webhookUrl(
        webhookUrl || `${process.env.API_URL}/api/webhooks/fusionpay`
      );

    // Ajouter les articles
    if (articles && Array.isArray(articles)) {
      articles.forEach((article) => {
        fusionPay.addArticle(
          article.name,
          article.price,
          article.quantity || 1
        );
      });
    }

    // Ajouter les informations personnalisées
    fusionPay.addInfo({
      userId: userId,
      ...customerInfo,
    });

    // Effectuer le paiement
    const response = await fusionPay.makePayment();

    res.status(200).json({
      success: true,
      message: "Paiement initié avec succès",
      data: response,
    });
  } catch (error) {
    console.error("Erreur lors de l'initiation du paiement:", error);
    res.status(500).json({
      success: false,
      message: "Échec de l'initiation du paiement",
      error: error.message,
    });
  }
};

/**
 * Controller pour vérifier le statut d'un paiement
 */
const checkPaymentStatus = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Token de paiement manquant",
      });
    }

    // Vérifier le statut du paiement
    const status = await fusionPay.checkPaymentStatus(token);

    res.status(200).json({
      success: true,
      message: "Statut de paiement récupéré avec succès",
      data: status,
    });
  } catch (error) {
    console.error("Erreur lors de la vérification du statut:", error);
    res.status(500).json({
      success: false,
      message: "Échec de la vérification du statut",
      error: error.message,
    });
  }
};

/**
 * Controller pour gérer les webhooks FusionPay
 */
const handleWebhook = async (req, res) => {
  try {
    const event = req.body;

    // Traiter différents types d'événements
    switch (event.type) {
      case "payment.succeeded":
        await handleSuccessfulPayment(event.data);
        break;

      case "payment.failed":
        await handleFailedPayment(event.data);
        break;

      case "payout.succeeded":
        await handleSuccessfulPayout(event.data);
        break;

      case "payout.failed":
        await handleFailedPayout(event.data);
        break;

      default:
        console.log(`Événement non géré: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Erreur de traitement du webhook:", error);
    res.status(500).json({
      success: false,
      error: "Erreur de traitement du webhook",
    });
  }
};

/**
 * Gestionnaire pour les paiements réussis
 */
const handleSuccessfulPayment = async (paymentData) => {
  try {
    const { metadata, Montant, numeroTransaction } = paymentData;
    const userId = metadata.userId;

    // Mettre à jour le solde de l'utilisateur dans la base de données
    // Implémentez cette logique selon votre modèle utilisateur
    console.log(
      `Paiement réussi pour l'utilisateur ${userId}: ${Montant} XOF, Référence: ${numeroTransaction}`
    );

    // Vous pouvez également envoyer un email de confirmation ici
  } catch (error) {
    console.error("Erreur lors du traitement du paiement réussi:", error);
  }
};

/**
 * Gestionnaire pour les paiements échoués
 */
const handleFailedPayment = async (paymentData) => {
  try {
    const { metadata, Montant, numeroTransaction } = paymentData;
    const userId = metadata.userId;

    console.log(
      `Paiement échoué pour l'utilisateur ${userId}: ${Montant} XOF, Référence: ${numeroTransaction}`
    );

    // Vous pouvez envoyer un email d'échec ou une notification ici
  } catch (error) {
    console.error("Erreur lors du traitement du paiement échoué:", error);
  }
};

/**
 * Gestionnaire pour les retraits réussis
 */
const handleSuccessfulPayout = async (payoutData) => {
  try {
    const { metadata, Montant, numeroTransaction } = payoutData;
    const userId = metadata.userId;

    console.log(
      `Retrait réussi pour l'utilisateur ${userId}: ${Montant} XOF, Référence: ${numeroTransaction}`
    );

    // Mettre à jour le statut du retrait dans la base de données
  } catch (error) {
    console.error("Erreur lors du traitement du retrait réussi:", error);
  }
};

/**
 * Gestionnaire pour les retraits échoués
 */
const handleFailedPayout = async (payoutData) => {
  try {
    const { metadata, Montant, numeroTransaction } = payoutData;
    const userId = metadata.userId;

    console.log(
      `Retrait échoué pour l'utilisateur ${userId}: ${Montant} XOF, Référence: ${numeroTransaction}`
    );

    // Restaurer le solde de l'utilisateur et notifier l'échec
  } catch (error) {
    console.error("Erreur lors du traitement du retrait échoué:", error);
  }
};

module.exports = {
  initiatePayment,
  checkPaymentStatus,
  handleWebhook,
};

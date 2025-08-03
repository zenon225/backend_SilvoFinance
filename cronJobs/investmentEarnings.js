const cron = require('node-cron');

// Tâche programmée toutes les heures
cron.schedule('0 * * * *', async () => {
  try {
    const now = new Date();
    const investments = await Investment.find({
      isActive: true,
      nextPayout: { $lte: now },
      remainingHours: { $gt: 0 }
    });

    for (const investment of investments) {
      // Distribuer le paiement
      await User.updateOne(
        { _id: investment.userId },
        { $inc: { balance: investment.hourlyPayout } }
      );

      // Mettre à jour l'investissement
      investment.remainingHours -= 1;
      investment.nextPayout = new Date(now.getTime() + 3600000);
      
      if (investment.remainingHours <= 0) {
        investment.isActive = false;
      }

      await investment.save();
    }
  } catch (error) {
    console.error('Payout error:', error);
  }
});
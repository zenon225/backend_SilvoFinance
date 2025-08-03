// services/hourlyPayoutService.js
const pool = require('../db');
const cron = require('node-cron');

const processHourlyPayouts = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Récupérer les investissements éligibles
    const investments = await client.query(
      `SELECT * FROM investments 
       WHERE status = 'active' 
       AND NOW() BETWEEN start_date AND end_date
       FOR UPDATE`
    );
    
    // 2. Traiter chaque investissement
    for (const investment of investments.rows) {
      // Vérifier si c'est le premier paiement
      const isFirstPayout = investment.total_hours === investment.remaining_hours;
      
      // Vérifier si c'est le dernier paiement
      const isLastPayout = investment.remaining_hours === 1;
      
      // Créer ou mettre à jour l'earning
      if (isFirstPayout) {
        // Insertion initiale dans earnings
        await client.query(
          `INSERT INTO earnings (
            user_id,
            id_invest,
            montant_total,
            retour_gain,
            gain_disponible,
            gain_recolte
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            investment.user_id,
            investment.id,
            investment.amount,
            investment.hourly_payout,
            investment.hourly_payout,
            0.00
          ]
        );
        
        // Notification de début d'investissement
        await client.query(
          `INSERT INTO notifications (
            user_id,
            title,
            message,
            is_read,
            sent_at
          ) VALUES ($1, $2, $3, $4, NOW())`,
          [
            investment.user_id, 
            'Investissement démarré',
            `Votre investissement #${investment.id} a commencé. Montant investi: ${investment.amount} XOF`,
            false
          ]
        );
      } else {
        // Mise à jour de l'earning existant - CORRECTION ICI
        await client.query(
          `UPDATE earnings 
           SET 
             retour_gain = retour_gain + $1,
             gain_disponible = gain_disponible + $2
           WHERE id_invest = $3 AND user_id = $4`,
          [
            investment.hourly_payout,
            investment.hourly_payout,
            investment.id,
            investment.user_id
          ]
        );
      }
      
      // Mise à jour des heures restantes
      await client.query(
        `UPDATE investments
         SET remaining_hours = remaining_hours - 1
         WHERE id = $1`,
        [investment.id]
      );
      
      // Notification si c'est le dernier paiement
      if (isLastPayout) {
        await client.query(
          `UPDATE investments SET status = 'completed' WHERE id = $1`,
          [investment.id]
        );
        
        await client.query(
          `INSERT INTO notifications (
            user_id,
            title,
            message,
            is_read,
            sent_at
          ) VALUES ($1, $2, $3, $4, NOW())`,
          [
            investment.user_id, 
            'Investissement terminé',
            `Votre investissement #${investment.id} est maintenant complet. Montant total reçu: ${investment.expected_return} XOF`,
            false
          ]
        );
      }
    }
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur de paiement horaire:', error);
  } finally {
    client.release();
  }
};

// Lancer toutes les heures
cron.schedule('0 * * * *', processHourlyPayouts);

module.exports = { processHourlyPayouts };
// services/hourlyPayoutService.js
const pool = require('../db');
const cron = require('node-cron');

const processIndividualHourlyPayouts = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Récupérer les investissements éligibles
    const investments = await client.query(
      `SELECT * FROM investments 
       WHERE status = 'active'
       AND remaining_hours > 0
       AND NOW() >= start_date + 
           (total_hours - remaining_hours + 1) * INTERVAL '1 hour'
       FOR UPDATE SKIP LOCKED`
    );
    
    console.log(`🔍 ${investments.rows.length} investissements à traiter`);
    
    // 2. Traiter chaque investissement
    for (const investment of investments.rows) {
      const isFirstPayout = investment.total_hours === investment.remaining_hours;
      const isLastPayout = investment.remaining_hours === 1;
      
      // Créer ou mettre à jour l'earning
      if (isFirstPayout) {
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
      
      console.log(`✅ Paiement de ${investment.hourly_payout} XOF effectué pour l'investissement #${investment.id}`);
    }
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur de paiement horaire:', error);
  } finally {
    client.release();
  }
};

// Vérifier toutes les minutes pour une précision horaire
cron.schedule('* * * * *', () => {
  console.log(`⏳ Vérification des paiements à ${new Date()}`);
  processIndividualHourlyPayouts().catch(console.error);
});

module.exports = { processIndividualHourlyPayouts };
// controllers/earningController.js
const pool = require('../db');

const claimEarnings = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { investmentId } = req.body;
    const userId = req.user.id;

    // 1. Vérifier et récupérer les gains disponibles
    const earningsQuery = await client.query(
      `SELECT gain_disponible FROM earnings 
       WHERE id_invest = $1 AND user_id = $2
       FOR UPDATE`, // Verrouillage pour éviter les doubles réclamations
      [investmentId, userId]
    );

    if (earningsQuery.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Aucun gain disponible pour cet investissement' 
      });
    }

    const availableEarnings = earningsQuery.rows[0].gain_disponible;

    if (availableEarnings <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Aucun gain disponible à réclamer'
      });
    }

    // 2. Mettre à jour le solde utilisateur
    await client.query(
      `UPDATE users 
       SET balance = balance + $1,
           total_earnings = total_earnings + $1
       WHERE id = $2`,
      [availableEarnings, userId]
    );

    // 3. Mettre à jour les earnings
    await client.query(
      `UPDATE earnings
       SET gain_disponible = 0,
           gain_recolte = gain_recolte + $1,
           updated_at = NOW()
       WHERE id_invest = $2 AND user_id = $3`,
      [availableEarnings, investmentId, userId]
    );

    // 4. Enregistrer la transaction
    console.log(`Tentative de réclamation gains - User: ${userId}, Invest: ${investmentId}`);
    

    // 5. Notification
    await client.query(
      `INSERT INTO notifications (
        user_id,
        title,
        message,
        is_read,
        sent_at
      ) VALUES ($1, $2, $3, $4, NOW())`,
      [
        userId,
        'Gains récupérés',
        `Vous avez récupéré ${availableEarnings} FCFA de vos gains`,
        false
      ]
    );

    await client.query('COMMIT');
    
    res.json({ 
      success: true,
      amount: availableEarnings,
      message: 'Gains transférés avec succès'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erreur lors de la récupération des gains:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur serveur lors du traitement'
    });
  } finally {
    client.release();
  }
};

module.exports = {
  claimEarnings
};
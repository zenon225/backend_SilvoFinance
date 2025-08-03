const pool = require('../db');

/**
 * Récupère tous les packs d'investissement avec les détails des créateurs
 */
const getAllPacks = async (req, res) => {
  try {
    const query = `
      SELECT 
        id,
        name,
        description,
        min_amount,
        max_amount,
        interest_rate,
        duration_days,
        is_active,
        created_at,
        return_percentage_40_days
      FROM investment_packs
      WHERE is_active = true
      ORDER BY min_amount ASC
    `;
    
    const result = await pool.query(query);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('❌ Erreur PostgreSQL:', err.message);
    res.status(500).json({ error: "Erreur lors de la récupération des packs" });
  }
};

/**
 * Récupère un pack spécifique avec les transactions associées
 */
const getPackById = async (req, res) => {
  const pack_id = req.params.id;
  try {
    const query = `
      SELECT * FROM investment_packs 
      WHERE id = $1 AND is_active = true
    `;
    
    const result = await pool.query(query, [pack_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pack non trouvé ou inactif' });
    }
    
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('❌ Erreur PostgreSQL:', err.message);
    res.status(500).json({ error: "Erreur lors de la récupération du pack" });
  }
};

/**
 * Crée un nouveau pack d'investissement
 */
const createPack = async (req, res) => {
  const { name, description, min_amount, max_amount, interest_rate, duration_days } = req.body;
  
  try {
    const query = `
      INSERT INTO investment_packs (
        name, 
        description, 
        min_amount, 
        max_amount,
        interest_rate,
        duration_days,
        is_active,
        created_at,
        return_percentage_40_days
      )
      VALUES ($1, $2, $3, $4, $5, $6, true, NOW())
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      name, 
      description, 
      min_amount, 
      max_amount,
      interest_rate,
      duration_days
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('❌ Erreur PostgreSQL:', err.message);
    res.status(500).json({ error: "Erreur lors de la création du pack" });
  }
};

/**
 * Met à jour un pack d'investissement
 */
const updatePack = async (req, res) => {
  const { id } = req.params;
  const { title, description, min_amount, expected_return, duration } = req.body;
  
  try {
    const query = `
      UPDATE investment_packs
      SET 
        title = $1,
        description = $2,
        min_amount = $3,
        expected_return = $4,
        duration = $5,
        updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      title, 
      description, 
      min_amount, 
      expected_return, 
      duration, 
      id
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pack non trouvé' });
    }
    
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('❌ Erreur PostgreSQL:', err.message);
    res.status(500).json({ error: "Erreur lors de la mise à jour du pack" });
  }
};

/**
 * Crée un nouvel investissement
 */
const createInvestment = async (req, res) => {
  const pack_id = req.params.id;
  const amount = req.body.amount;
  const user_id = req.user.id;

  try {
    // 1. Vérifier que le pack existe et est actif
    const packQuery = `
      SELECT 
        name,
        interest_rate,
        duration_days,
        min_amount,
        max_amount
      FROM investment_packs
      WHERE id = $1 AND is_active = true
    `;
    const packResult = await pool.query(packQuery, [pack_id]);
    
    if (packResult.rows.length === 0) {
      return res.status(400).json({ error: 'Pack non trouvé ou inactif' });
    }
    
    const pack = packResult.rows[0];
    
    // 2. Vérifier le montant
    if (amount < pack.min_amount || amount > pack.max_amount) {
      return res.status(400).json({ 
        error: `Le montant doit être entre ${pack.min_amount} et ${pack.max_amount}` 
      });
    }
    
    // 3. Vérifier le solde utilisateur
    const userQuery = `SELECT balance, full_name, email FROM users WHERE id = $1`;
    const userResult = await pool.query(userQuery, [user_id]);
    
    if (userResult.rows[0].balance < amount) {
      return res.status(400).json({ error: 'Solde insuffisant' });
    }
    
    // 4. Calculs financiers
    const dailyReturn = (amount * pack.interest_rate / 100);
    const expectedReturn = amount + (dailyReturn * pack.duration_days);
    const hourlyPayout = dailyReturn / 24; // Pour distribution horaire
    
    // 5. Commencer la transaction
    await pool.query('BEGIN');
    
    try {
      // 6. Débiter le solde utilisateur
      await pool.query(
        'UPDATE users SET balance = balance - $1 WHERE id = $2',
        [amount, user_id]
      );
      
      // 7. Créer l'investissement
      const investmentQuery = `
        INSERT INTO investments (
          user_id,
          pack_id,
          amount,
          start_date,
          end_date,
          expected_return,
          hourly_payout,
          remaining_hours,
          total_hours,
          next_payout,
          status
        )
        VALUES ($1, $2, $3, NOW(), NOW() + INTERVAL '${pack.duration_days} days', $4, $5, $6, $6, NOW() + INTERVAL '1 hour', 'active')
        RETURNING id
      `;
      
      const totalHours = pack.duration_days * 24;
      const investmentResult = await pool.query(investmentQuery, [
        user_id,
        pack_id,
        amount,
        expectedReturn,
        hourlyPayout,
        totalHours
      ]);
      const investmentId = investmentResult.rows[0].id;
      
      
      // 9. Créer une notification
      const notificationMessage = `Vous avez investi ${amount} XOF dans le pack ${pack.name}. 
        Vous recevrez ${hourlyPayout.toFixed(2)} XOF toutes les heures pendant ${pack.duration_days} jours.`;
      
      await pool.query(
        `INSERT INTO notifications (
          user_id,
          title,
          message,
          is_read,
          sent_at
        ) VALUES ($1, $2, $3, $4, NOW())`,
        [user_id, 'Nouvel investissement', notificationMessage, false]
      );
      
      // 10. Valider la transaction
      await pool.query('COMMIT');
      
      res.status(201).json({
        investmentId,
        hourlyPayout,
        expectedReturn,
        message: notificationMessage
      });
      
    } catch (err) {
      await pool.query('ROLLBACK');
      throw err;
    }
    
  } catch (err) {
    console.error('❌ Erreur PostgreSQL:', err.message);
    res.status(500).json({ error: "Erreur lors de la création de l'investissement" });
  }
};

module.exports = {
  getAllPacks,
  getPackById,
  createPack,
  updatePack,
  createInvestment
};
const pool = require('../db');

const getUserData = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 1. Récupération des données utilisateur
    const userQuery = `
      SELECT id, full_name, email, phone, balance, created_at 
      FROM users 
      WHERE id = $1`;
    const userResult = await pool.query(userQuery, [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const user = userResult.rows[0];

    // 2. Récupération des investissements actifs
    const investmentsQuery = `
  SELECT 
    i.id, 
    p.name AS pack_name,
    i.amount::numeric(10,2) AS amount,
    i.expected_return::numeric(10,2) AS expected_return,
    i.start_date, 
    i.end_date,
    (i.expected_return - i.amount)::numeric(10,2) AS total_earnings,
    GREATEST(EXTRACT(DAY FROM (i.end_date - NOW()))::integer, 0) AS days_remaining,
    CASE
      WHEN i.end_date <= NOW() THEN 100.00
      WHEN DATE_PART('day', i.end_date - i.start_date) = 0 THEN 0.00
      ELSE LEAST(
        (DATE_PART('day', NOW() - i.start_date)::numeric / 
        DATE_PART('day', i.end_date - i.start_date)::numeric * 100),
        100.00
      )::numeric(5,2)
    END AS progress,
    (
      SELECT COALESCE(SUM(e.gain_disponible), 0)::numeric(10,2)
      FROM earnings e
      WHERE e.id_invest = i.id
    ) AS available_earnings,
    (
      SELECT COALESCE(SUM(e.retour_gain), 0)::numeric(10,2)
      FROM earnings e
      WHERE e.id_invest = i.id
    ) AS total_returned
  FROM investments i
  JOIN investment_packs p ON i.pack_id = p.id
  WHERE i.user_id = $1 AND i.status = 'active' AND i.end_date > NOW()`;
    
    const investmentsResult = await pool.query(investmentsQuery, [userId]);

    // 3. Requêtes pour les statistiques
    const referralQuery = `
      SELECT COALESCE(SUM(bonus)::float, 0) AS total_referral_earnings
      FROM referrals 
      WHERE referrer_id = $1`;
    
    const earningsQuery = `
      SELECT COALESCE(SUM(retour_gain)::float, 0) AS total_earnings
      FROM earnings 
      WHERE user_id = $1`;

    const availableEarningsQuery = `
      SELECT
  id_invest,
  gain_disponible
FROM earnings
WHERE user_id = $1 AND gain_disponible > 0;
`;
    
    const [referralResult, earningsResult, availableEarningsResult] = await Promise.all([
      pool.query(referralQuery, [userId]),
      pool.query(earningsQuery, [userId]),
      pool.query(availableEarningsQuery, [userId])
    ]);

    // 4. Historique des transactions (version simplifiée sans hasCreatedAtColumn)
    const investmentsHistory = await pool.query(
      `SELECT 
        id,
        'investment' AS type,
        'Investissement' AS description,
        (amount * -1)::float AS amount,
        created_at AS date
       FROM investments
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 4`,
      [userId]
    );

    const earningsHistory = await pool.query(
      `SELECT 
        id,
        'earning' AS type,
        'Gains quotidiens' AS description,
        retour_gain::float AS amount
       FROM earnings
       WHERE user_id = $1
       ORDER BY id DESC
       LIMIT 3`,
      [userId]
    );

    const referralsHistory = await pool.query(
      `SELECT 
        id,
        'referral' AS type,
        'Commission parrainage' AS description,
        bonus::float AS amount,
        created_at AS date
       FROM referrals
       WHERE referrer_id = $1
       ORDER BY created_at DESC
       LIMIT 3`,
      [userId]
    );

    // 5. Fusion des historiques (simplifiée)
    const transactions = [
      ...investmentsHistory.rows,
      ...earningsHistory.rows,
      ...referralsHistory.rows
    ].sort((a, b) => (b.date || b.id) - (a.date || a.id)).slice(0, 10);

    // 6. Fonction de niveau
    const getLevel = (balance) => {
      const balanceNum = parseFloat(balance) || 0;
      if (balanceNum >= 1000000) return 'Diamant';
      if (balanceNum >= 500000) return 'Platine';
      if (balanceNum >= 250000) return 'Or';
      if (balanceNum >= 100000) return 'Argent';
      return 'Bronze';
    };

    // 7. Construction de la réponse
    const response = {
      user: {
        full_name: user.full_name,
        email: user.email,
        balance: parseFloat(user.balance) || 0,
        totalInvested: investmentsResult.rows.reduce((sum, inv) => sum + parseFloat(inv.amount || 0), 0),
        totalEarnings: parseFloat(earningsResult.rows[0]?.total_earnings) || 0,
        activeInvestments: investmentsResult.rowCount || 0,
        referralEarnings: parseFloat(referralResult.rows[0]?.total_referral_earnings) || 0,
        availableEarnings: parseFloat(availableEarningsResult.rows[0]?.available_earnings) || 0,
        level: getLevel(user.balance)
      },
      activeInvestments: investmentsResult.rows,
      transactions
    };

    res.json(response);

  } catch (err) {
    console.error('Erreur dashboard:', {
      message: err.message,
      stack: err.stack,
      query: err.query || 'Non disponible'
    });
    res.status(500).json({ 
      error: 'Erreur serveur',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

module.exports = { getUserData };
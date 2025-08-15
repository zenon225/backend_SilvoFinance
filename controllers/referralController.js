// controllers/referralController.js
const pool = require('../db');

const getReferralData = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 1. Récupération des données de base de l'utilisateur
    const userQuery = `
      SELECT id, full_name, email, phone, balance, created_at 
      FROM users 
      WHERE id = $1`;
    const userResult = await pool.query(userQuery, [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const user = userResult.rows[0];

    // 2. Génération du code de parrainage basé sur le nom et l'ID
    const referralCode = generateReferralCode(user.full_name, user.id);

    // 3. Statistiques de parrainage
    const referralStatsQuery = `
      SELECT 
        COUNT(*) AS total_referrals,
        SUM(bonus) AS total_commissions,
        SUM(CASE WHEN created_at >= date_trunc('month', CURRENT_DATE) THEN bonus ELSE 0 END) AS this_month_commissions
      FROM referrals 
      WHERE referrer_id = $1`;
    
    const referralStatsResult = await pool.query(referralStatsQuery, [userId]);

    // 4. Récupération des filleuls actifs (qui ont investi)
    const activeReferralsQuery = `
      SELECT COUNT(DISTINCT r.referred_id) AS active_referrals
      FROM referrals r
      JOIN investments i ON r.referred_id = i.user_id
      WHERE r.referrer_id = $1 AND i.status = 'active'`;
    
    const activeReferralsResult = await pool.query(activeReferralsQuery, [userId]);

    // 5. Historique des parrainages avec détails des investissements
    const referralHistoryQuery = `
      SELECT 
        u.id,
        u.full_name AS name,
        r.created_at AS join_date,
        COALESCE(p.name, 'Aucun investissement') AS pack,
        COALESCE(i.amount, 0) AS investment,
        r.bonus AS commission,
        CASE 
          WHEN i.id IS NULL THEN 'pending'
          WHEN i.end_date > NOW() THEN 'active'
          ELSE 'completed'
        END AS status
      FROM referrals r
      JOIN users u ON r.referred_id = u.id
      LEFT JOIN investments i ON i.user_id = u.id AND i.status = 'active'
      LEFT JOIN investment_packs p ON i.pack_id = p.id
      WHERE r.referrer_id = $1
      ORDER BY r.created_at DESC
      LIMIT 10`;
    
    const referralHistoryResult = await pool.query(referralHistoryQuery, [userId]);

    // 6. Récupération des niveaux de parrainage depuis la base de données
    const referralLevelsQuery = `
      SELECT 
        id,
        name AS level,
        min_referrals AS minReferrals,
        commission_rate AS commission,
        description AS benefits
      FROM referral_levels
      ORDER BY min_referrals ASC`;
    
    const referralLevelsResult = await pool.query(referralLevelsQuery);
    
    // Transformer les résultats pour correspondre à la structure attendue
    const referralLevels = referralLevelsResult.rows.map(level => ({
      level: level.level,
      minReferrals: level.minreferrals,
      commission: level.commission,
      benefits: [level.description], // Vous pouvez adapter selon votre structure
      // Ajoutez des valeurs par défaut pour les champs manquants
      maxReferrals: level.minreferrals * 2 - 1, // Exemple de calcul
      bonus: level.minreferrals * 10000, // Exemple de calcul
      color: getLevelColor(level.level) // Fonction helper pour les couleurs
      //icon: getLevelIcon(level.name)
    }));

    // Déterminer le niveau actuel
    const totalReferrals = parseInt(referralStatsResult.rows[0]?.total_referrals) || 0;
    const currentLevel = referralLevels.find(level => 
      totalReferrals >= level.minReferrals && 
      (level.maxReferrals === Infinity || totalReferrals <= level.maxReferrals)
    ) || referralLevels[0];

    // Construction de la réponse
    const response = {
      user: {
        name: user.full_name,
        referralCode: referralCode,
        totalReferrals: totalReferrals,
        activeReferrals: parseInt(activeReferralsResult.rows[0]?.active_referrals) || 0,
        totalCommissions: parseFloat(referralStatsResult.rows[0]?.total_commissions) || 0,
        thisMonthCommissions: parseFloat(referralStatsResult.rows[0]?.this_month_commissions) || 0,
        pendingCommissions: 0
      },
      referralHistory: referralHistoryResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        joinDate: new Date(row.join_date).toISOString().split('T')[0],
        pack: row.pack,
        investment: parseFloat(row.investment) || 0,
        commission: parseFloat(row.commission) || 0,
        status: row.status
      })),
      referralLevels,
      currentLevel
    };

    res.json(response);

  } catch (err) {
    console.error('Erreur récupération données parrainage:', err);
    res.status(500).json({ 
      error: 'Erreur serveur',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Fonction helper pour les couleurs des niveaux
function getLevelColor(levelName) {
  const colors = {
    'Bronze': 'from-orange-500 to-orange-600',
    'Argent': 'from-gray-400 to-gray-600',
    'Or': 'from-yellow-500 to-yellow-600',
    'Platine': 'from-purple-500 to-purple-600'
  };
  return colors[levelName] || 'from-gray-500 to-gray-600';
}

// Fonction pour générer un code de parrainage unique
function generateReferralCode(fullName, userId) {
  const namePart = fullName.substring(0, 3).toUpperCase().replace(/\s/g, '');
  const idPart = userId.toString().slice(-4);
  const year = new Date().getFullYear().toString().slice(-2);
  return `${namePart}${year}${idPart}`;
}

module.exports = { getReferralData };
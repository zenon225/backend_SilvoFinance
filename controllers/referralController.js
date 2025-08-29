// controllers/referralController.js
const pool = require("../db");

const getReferralData = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Récupération des données de base de l'utilisateur
    const userQuery = `
      SELECT id, full_name, email, phone, balance, created_at, referral_code
      FROM users 
      WHERE id = $1`;
    const userResult = await pool.query(userQuery, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    const user = userResult.rows[0];

    // 2. Utiliser le code de parrainage existant ou en générer un nouveau
    let referralCode = user.referral_code;
    if (!referralCode) {
      referralCode = generateReferralCode(user.full_name, user.id);
      // Mettre à jour l'utilisateur avec le nouveau code
      await pool.query("UPDATE users SET referral_code = $1 WHERE id = $2", [
        referralCode,
        userId,
      ]);
    }

    // 3. Statistiques de parrainage - version adaptée à votre structure de table
    const referralStatsQuery = `
      SELECT 
        COUNT(*) AS total_referrals
      FROM referrals 
      WHERE referrer_id = $1`;

    const referralStatsResult = await pool.query(referralStatsQuery, [userId]);

    // 4. Récupération des filleuls actifs (simplifié)
    const activeReferralsQuery = `
      SELECT COUNT(DISTINCT referred_id) AS active_referrals
      FROM referrals 
      WHERE referrer_id = $1`;

    const activeReferralsResult = await pool.query(activeReferralsQuery, [
      userId,
    ]);

    // 5. Historique des parrainages (adapté à votre structure)
    const referralHistoryQuery = `
      SELECT 
        r.id,
        u.full_name AS name,
        r.created_at AS join_date,
        r.referral_code,
        'pending' AS status
      FROM referrals r
      JOIN users u ON r.referred_id = u.id
      WHERE r.referrer_id = $1
      ORDER BY r.created_at DESC
      LIMIT 10`;

    const referralHistoryResult = await pool.query(referralHistoryQuery, [
      userId,
    ]);

    // 6. Niveaux de parrainage prédéfinis
    const referralLevels = [
      {
        level: "Bronze",
        minReferrals: 1,
        maxReferrals: 4,
        commission: 10,
        bonus: 0,
        color: "from-orange-500 to-orange-600",
        benefits: ["10% de commission sur le premier investissement"],
      },
      {
        level: "Argent",
        minReferrals: 5,
        maxReferrals: 9,
        commission: 12,
        bonus: 50000,
        color: "from-gray-400 to-gray-600",
        benefits: ["12% de commission sur le premier investissement"],
      },
      {
        level: "Or",
        minReferrals: 10,
        maxReferrals: 19,
        commission: 15,
        bonus: 150000,
        color: "from-yellow-500 to-yellow-600",
        benefits: ["15% de commission sur le premier investissement"],
      },
      {
        level: "Platine",
        minReferrals: 20,
        maxReferrals: Infinity,
        commission: 20,
        bonus: 500000,
        color: "from-purple-500 to-purple-600",
        benefits: ["20% de commission sur le premier investissement"],
      },
    ];

    // Déterminer le niveau actuel
    const totalReferrals =
      parseInt(referralStatsResult.rows[0]?.total_referrals) || 0;
    const currentLevel =
      referralLevels.find(
        (level) =>
          totalReferrals >= level.minReferrals &&
          (level.maxReferrals === Infinity ||
            totalReferrals <= level.maxReferrals)
      ) || referralLevels[0];

    // Déterminer le niveau suivant
    const currentLevelIndex = referralLevels.findIndex(
      (l) => l.level === currentLevel.level
    );
    const nextLevel =
      currentLevelIndex < referralLevels.length - 1
        ? referralLevels[currentLevelIndex + 1]
        : null;

    // Calcul des commissions (à adapter selon votre logique métier)
    // Pour l'instant, on utilise une valeur fixe de 5000 XOF par parrainage
    const commissionPerReferral = 5000;
    const totalCommissions = totalReferrals * commissionPerReferral;

    // Construction de la réponse
    const response = {
      user: {
        name: user.full_name,
        referralCode: referralCode,
        totalReferrals: totalReferrals,
        activeReferrals:
          parseInt(activeReferralsResult.rows[0]?.active_referrals) || 0,
        totalCommissions: totalCommissions,
        thisMonthCommissions: 0, // À implémenter avec une logique de filtre par mois
        pendingCommissions: 0,
      },
      referralHistory: referralHistoryResult.rows.map((row, index) => ({
        id: row.id,
        name: row.name,
        joinDate: new Date(row.join_date).toISOString().split("T")[0],
        pack: "Pack Standard", // Valeur par défaut
        investment: 100000 + index * 25000, // Valeur simulée
        commission: commissionPerReferral,
        status: row.status || "pending",
      })),
      referralLevels,
      currentLevel,
      nextLevel,
    };

    res.json(response);
  } catch (err) {
    console.error("Erreur récupération données parrainage:", err);
    res.status(500).json({
      error: "Erreur serveur lors de la récupération des données de parrainage",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Fonction pour générer un code de parrainage unique
function generateReferralCode(fullName, userId) {
  const namePart = fullName.substring(0, 3).toUpperCase().replace(/\s/g, "");
  const idPart = userId.toString().slice(-4);
  const year = new Date().getFullYear().toString().slice(-2);
  return `${namePart}${year}${idPart}`;
}

module.exports = { getReferralData };

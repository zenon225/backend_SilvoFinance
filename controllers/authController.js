const pool = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const register = async (req, res) => {
  const { full_name, email, phone, password, referral_code } = req.body;
  try {
    const normalizedEmail = email.toLowerCase();
    const hashedPassword = await bcrypt.hash(password, 10);

    // Démarrer une transaction
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Insérer l'utilisateur
      const userResult = await client.query(
        `INSERT INTO users (full_name, email, phone, password_hash, balance, created_at, is_verified)
         VALUES ($1, $2, $3, $4, 0, NOW(), false)
         RETURNING id, full_name, email, phone`,
        [full_name, normalizedEmail, phone, hashedPassword]
      );

      // Gérer le parrainage si un code est fourni
      if (referral_code) {
        // Vérifier si le code de parrainage existe
        const referrerResult = await client.query(
          `SELECT id FROM users WHERE referral_code = $1 OR id = (SELECT user_id FROM referral_codes WHERE code = $1)`,
          [referral_code]
        );

        if (referrerResult.rows.length > 0) {
          const referrerId = referrerResult.rows[0].id;
          const newUserId = userResult.rows[0].id;

          // Enregistrer la relation de parrainage
          await client.query(
            `INSERT INTO referrals (referrer_id, referred_id, referral_code, created_at)
             VALUES ($1, $2, $3, NOW())`,
            [referrerId, newUserId, referral_code]
          );

          // Créditer le parrain (bonus de 10% du premier investissement futur)
          await client.query(
            `UPDATE users SET pending_referral_bonus = COALESCE(pending_referral_bonus, 0) + 5000 WHERE id = $1`,
            [referrerId]
          );

          console.log(
            `🎁 Parrainage enregistré: ${referrerId} -> ${newUserId}`
          );
        }
      }

      await client.query("COMMIT");
      res.status(201).json(userResult.rows[0]);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("❌ Erreur PostgreSQL:", err.message);

    if (err.code === "23505" && err.constraint === "users_email_key") {
      return res.status(400).json({ error: "Cet email est déjà utilisé" });
    }

    res.status(500).json({ error: "Erreur lors de l'inscription" });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const normalizedEmail = email.toLowerCase();
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      normalizedEmail,
    ]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: "Utilisateur non trouvé" });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match)
      return res.status(401).json({ error: "Mot de passe incorrect" });

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      token,
      user: { id: user.id, full_name: user.full_name, email: user.email },
    });
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de la connexion" });
  }
};

module.exports = { register, login };

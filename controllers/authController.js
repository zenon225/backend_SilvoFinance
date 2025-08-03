const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const register = async (req, res) => {
  const { full_name, email, phone, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (full_name, email, phone, password_hash, balance, created_at, is_verified)
       VALUES ($1, $2, $3, $4, 0, NOW(), false)
       RETURNING id, full_name, email, phone`,
      [full_name, email, phone, hashedPassword]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('❌ Erreur PostgreSQL:', err.message); // 👈 Ajoute ceci
    res.status(500).json({ error: "Erreur lors de l'inscription" });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Utilisateur non trouvé' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Mot de passe incorrect' });

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({ token, user: { id: user.id, full_name: user.full_name, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
};


module.exports = { register, login };

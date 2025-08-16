const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false, // Nécessaire pour les certificats auto-signés
    // Pour une sécurité renforcée en production :
    // ca: process.env.DB_SSL_CA // Si vous avez un certificat CA spécifique
  },
});

module.exports = pool;

// controllers/notificationController.js
const pool = require('../db');

/**
 * Récupère toutes les notifications de l'utilisateur
 */
const getUserNotifications = async (req, res) => {
  const user_id = req.user.id;

  try {
    const query = `
      SELECT 
        id,
        title,
        message,
        is_read as "isRead",
        sent_at as "sentAt",
        CASE 
          WHEN sent_at > NOW() - INTERVAL '1 hour' THEN 
            EXTRACT(MINUTE FROM (NOW() - sent_at))::text || ' min'
          WHEN sent_at > NOW() - INTERVAL '24 hours' THEN 
            EXTRACT(HOUR FROM (NOW() - sent_at))::text || ' h'
          ELSE 
            EXTRACT(DAY FROM (NOW() - sent_at))::text || ' j'
        END as "time"
      FROM notifications
      WHERE user_id = $1
      ORDER BY is_read ASC, sent_at DESC
      LIMIT 50
    `;

    const result = await pool.query(query, [user_id]);

    // ✅ ENVOIE CORRECT
    res.status(200).json({ notifications: result.rows });

  } catch (err) {
    console.error('❌ Erreur PostgreSQL:', err.message);
    res.status(500).json({ error: "Erreur lors de la récupération des notifications" });
  }
};

/**
 * Marque toutes les notifications comme lues
 */
const markAllAsRead = async (req, res) => {
  const user_id = req.user.id;

  try {
    await pool.query(
      `UPDATE notifications 
       SET is_read = true 
       WHERE user_id = $1 AND is_read = false`,
      [user_id]
    );
    
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ Erreur PostgreSQL:', err.message);
    res.status(500).json({ error: "Erreur lors du marquage des notifications" });
  }
};

/**
 * Crée une nouvelle notification
 */
const createNotification = async (req, res) => {
  const { user_id, title, message, type = 'info' } = req.body;

  try {
    const query = `
      INSERT INTO notifications (
        user_id,
        title,
        message,
        is_read,
        sent_at
      )
      VALUES ($1, $2, $3, $4, false, NOW())
      RETURNING *
    `;
    
    const result = await pool.query(query, [user_id, title, message, type]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('❌ Erreur PostgreSQL:', err.message);
    res.status(500).json({ error: "Erreur lors de la création de la notification" });
  }
};

module.exports = {
  getUserNotifications,
  markAllAsRead,
  createNotification
};
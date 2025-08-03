const express = require('express');
const cors = require('cors');
require('dotenv').config();
require('./services/hourlyPayoutService');

const app = express();
app.use(cors({ origin: 'http://localhost:4000' }));
app.use(express.json());

const authRoutes = require('./routes/auth');
const authenticate = require('./middleware/authMiddleware');
const dashboardRoutes = require('./routes/dashboard');
const investmentPackRoutes = require('./routes/investmentPackRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// Routes publiques
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', authenticate, dashboardRoutes);
app.use('/api/investment-packs', investmentPackRoutes);
app.use('/api/notifications', authenticate, notificationRoutes);




// Route protégée exemple
app.get('/api/protected', authenticate, (req, res) => {
  res.json({ message: `Bienvenue utilisateur ID ${req.user.id}` });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ API Auth en ligne sur http://localhost:${PORT}`);
});

const express = require('express');
const cors = require('cors');
require('dotenv').config();
require('./services/hourlyPayoutService');

const app = express();
app.use(cors({ origin: 'https://silvofinance.onrender.com' }));
app.use(express.json());

const authRoutes = require('./routes/auth');
const authenticate = require('./middleware/authMiddleware');
const dashboardRoutes = require('./routes/dashboard');
const investmentPackRoutes = require('./routes/investmentPackRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const earningRoutes = require('./routes/earningRoutes');
const referralRoutes = require('./routes/referralRoutes');

// Routes publiques
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', authenticate, dashboardRoutes);
app.use('/api/investment-packs', investmentPackRoutes);
app.use('/api/notifications', authenticate, notificationRoutes);
app.use('/api/earnings', authenticate, earningRoutes);
app.use('/api/referral', authenticate, referralRoutes);





// Route protégée exemple
app.get('/api/protected', authenticate, (req, res) => {
  res.json({ message: `Bienvenue utilisateur ID ${req.user.id}` });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ API Auth en ligne sur http://localhost:${PORT}`);
});

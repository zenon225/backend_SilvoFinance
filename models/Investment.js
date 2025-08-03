const mongoose = require('mongoose');

const InvestmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  amount: Number,
  hourlyPayout: Number,
  remainingHours: Number,
  totalHours: Number,
  nextPayout: Date,
  isActive: Boolean
}, { timestamps: true });

// Route pour créer l'investissement
router.post('/api/investments', auth, async (req, res) => {
  try {
    const investment = new Investment({
      userId: req.user.id,
      amount: req.body.amount,
      hourlyPayout: req.body.hourlyPayout,
      remainingHours: req.body.durationHours,
      totalHours: req.body.durationHours,
      nextPayout: new Date(Date.now() + 3600000), // 1 heure plus tard
      isActive: true
    });

    await investment.save();
    res.status(201).json(investment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
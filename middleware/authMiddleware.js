const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]; // format: Bearer TOKEN

  if (!token) return res.status(401).json({ error: 'Token manquant' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // ajoute l'ID et email dans la requête
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token invalide' });
  }
};

module.exports = authenticate;

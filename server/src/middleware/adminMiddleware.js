const jwt = require('../utils/jwt');
const { Admin } = require('../db');

module.exports = async function authenticateAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: 'Administrator authentication is required.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }

    const admin = await Admin.findByPk(decoded.id, {
      attributes: { exclude: ['password'] },
    });
    if (!admin) {
      return res.status(401).json({ message: 'Administrator account not found.' });
    }

    req.admin = admin;
    next();
  } catch (error) {
    console.error('Administrator authentication error:', error);
    res.status(401).json({ message: 'Invalid or expired administrator token.' });
  }
};

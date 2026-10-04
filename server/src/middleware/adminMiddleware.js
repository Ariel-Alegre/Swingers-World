const jwt = require('../utils/jwt');
const { ENV_ADMIN_ID, getEnvAdmin, verifyEnvAdminToken } = require('../utils/envAdminAuth');
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

    if (decoded.id === ENV_ADMIN_ID) {
      const envAdmin = getEnvAdmin();
      if (!verifyEnvAdminToken(decoded, envAdmin)) {
        return res.status(401).json({ message: 'Invalid administrator session.' });
      }
      req.admin = {
        id: envAdmin.id,
        name: envAdmin.name,
        lastName: envAdmin.lastName,
        email: envAdmin.email,
        role: envAdmin.role,
      };
      return next();
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

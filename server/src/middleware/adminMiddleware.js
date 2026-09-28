module.exports = function isAdmin(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated.' });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }

    next();
  } catch (error) {
    console.error('isAdmin middleware error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

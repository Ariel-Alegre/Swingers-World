
const jwt = require('../utils/jwt');
const { User } = require('../db');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(403).json({ message: 'Authentication is required' });
    }

    const token = authHeader.split(' ')[1]; 
    if (!token) {
      return res.status(403).json({ message: 'Token was not provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.userId = decoded.id;
    next();
  } catch (err) {
    console.error('Authentication error:', err);
    return res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = authenticateToken;

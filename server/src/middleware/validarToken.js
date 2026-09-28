// middleware/validarToken.js
const jwt = require('../utils/jwt');
const { Usuario } = require('../db');

const validarToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(403).json({ message: 'Se requiere autenticación' });
    }

    const token = authHeader.split(' ')[1]; // Acepta formato "Bearer TOKEN"
    if (!token) {
      return res.status(403).json({ message: 'Token no proporcionado' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verificamos que el usuario existe (opcional pero recomendable)
    const usuario = await Usuario.findByPk(decoded.id);
    if (!usuario) {
      return res.status(401).json({ message: 'Usuario no encontrado' });
    }

    req.usuarioId = decoded.id;
    next();
  } catch (err) {
    console.error('Error de autenticación:', err);
    return res.status(401).json({ message: 'Token no válido' });
  }
};

module.exports = validarToken;

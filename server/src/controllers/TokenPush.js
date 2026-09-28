require('dotenv').config();
const { Usuario } = require('../db');

module.exports = {
  TokenPush: async (req, res) => {
    const userId = req.usuarioId || req.body.userId;
    const { token } = req.body;

    if (!userId || !token) {
      return res.status(400).json({ error: "Faltan datos" });
    }

    try {
      const usuario = await Usuario.findByPk(userId);
      if (!usuario) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }

      // 👇 guardamos en el campo pushtoken
      usuario.pushtoken = token.trim();
      await usuario.save();

      res.json({ 
        ok: true, 
        message: "Token guardado correctamente", 
        pushtoken: usuario.pushtoken 
      });
    } catch (error) {
      console.error("❌ Error guardando token:", error);
      res.status(500).json({ error: "Error interno" });
    }
  },
};


/* 
const { Usuario, PushToken } = require('../db');

module.exports = {
  TokenPush: async (req, res) => {
    const { userId, token } = req.body;

    if (!userId || !token) {
      return res.status(400).json({ error: "Faltan datos" });
    }

    try {
      const usuario = await Usuario.findByPk(userId);
      if (!usuario) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }

      // evitar duplicados
      const [pushToken, created] = await PushToken.findOrCreate({
        where: { userId, token: token.trim() },
      });

      res.json({
        ok: true,
        message: created ? "Token guardado" : "Token ya existente",
        token: pushToken.token
      });
    } catch (error) {
      console.error("❌ Error guardando token:", error);
      res.status(500).json({ error: "Error interno" });
    }
  },
};

*/

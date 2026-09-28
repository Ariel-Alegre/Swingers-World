require('dotenv').config();
const { User } = require('../db');

module.exports = {
  SavePushToken: async (req, res) => {
    const userId = req.userId || req.body.userId;
    const { token } = req.body;

    if (!userId || !token) {
      return res.status(400).json({ error: "Required data is missing" });
    }

    try {
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      
      user.pushToken = token.trim();
      await user.save();

      res.json({ 
        ok: true, 
        message: "Token saved successfully", 
        pushToken: user.pushToken
      });
    } catch (error) {
      console.error("❌ Failed to save token:", error);
      res.status(500).json({ error: "Internal error" });
    }
  },
};






































const express = require('express');
const { streamMediaToken } = require('../utils/objectStorage');

const router = express.Router();

router.get('/media/:token', async (req, res, next) => {
  try {
    await streamMediaToken(req.params.token, res);
  } catch (error) {
    if (error?.name === 'TokenExpiredError' || error?.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'El enlace del archivo expiró o no es válido.' });
    }
    return next(error);
  }
});

module.exports = router;

const express = require('express');
const { streamMediaToken } = require('../utils/objectStorage');

const router = express.Router();

router.get('/media/:token', async (req, res, next) => {
  try {
    await streamMediaToken(req.params.token, req, res);
  } catch (error) {
    if (error?.name === 'TokenExpiredError' || error?.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'The file link has expired or is invalid.' });
    }
    return next(error);
  }
});

module.exports = router;

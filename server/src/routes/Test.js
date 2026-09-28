// routes/solicitudes.js
const express = require('express');
const router = express.Router();
const {
Test
} = require('../controllers/Test');

router.post('/test', Test);

// En routes/solicitudes.js

module.exports = router;

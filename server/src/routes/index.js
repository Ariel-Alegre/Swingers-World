const { Router } = require('express');
const userRouter = require('./User');
const messageRouter = require('./Message');
const photoRequestRouter = require('./PhotoRequest');
const adminRouter = require('./Admin');
const mediaRouter = require('./Media');
const notificationRouter = require('./Notification');

const router = Router();

router.use('/api', mediaRouter, userRouter, messageRouter, photoRequestRouter, notificationRouter, adminRouter);

module.exports = router;

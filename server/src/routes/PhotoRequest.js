const express = require('express');
const {
  RequestPhotoAccess,
  GetPhotoRequests,
  RespondToPhotoRequest,
  VerifyPhotoAccess,
  GetAcceptedPhotoRequests,
} = require('../controllers/PhotoRequest');
const authenticateToken = require('../middleware/authenticateToken');

const router = express.Router();

router.post('/photo-requests', authenticateToken, RequestPhotoAccess);
router.get('/photo-requests', authenticateToken, GetPhotoRequests);
router.put('/photo-requests/:requestId', authenticateToken, RespondToPhotoRequest);
router.get('/photo-access', authenticateToken, VerifyPhotoAccess);
router.get('/users/:userId/photo-access', authenticateToken, GetAcceptedPhotoRequests);

module.exports = router;

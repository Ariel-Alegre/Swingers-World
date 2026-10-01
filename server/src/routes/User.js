const { Router } = require('express');
const {
  Register,
  Login,
  GetCurrentUser,
  createPaymentSession,
  UpdateProfile,
  GetProfile,
  DeleteProfilePhoto,
  DeleteAccount,
  GetProfiles,
  GetIOSCommunityProfiles,
  LikeUser,
  GetMyLikes,
  GetReceivedLikes,
  DeleteLike,
  ReportUser,
  BlockUser,
  GetBlockedUsers,
  UnblockUser,
} = require('../controllers/User');
const { SavePushToken, DeletePushToken, UpdateNotificationPreferences } = require('../controllers/PushToken');
const authenticateToken = require('../middleware/authenticateToken');
const upload = require('../middleware/uploadImage');

const router = Router();

router.post('/register', Register);
router.post('/login', Login);
router.post('/payments/session', createPaymentSession);

router.get('/me', authenticateToken, GetCurrentUser);
router.patch('/profile', authenticateToken, upload.fields([{ name: 'photos', maxCount: 10 }]), UpdateProfile);
router.delete('/profile/photo', authenticateToken, DeleteProfilePhoto);
router.delete('/account', authenticateToken, DeleteAccount);
router.get('/profiles', authenticateToken, GetProfiles);
router.get('/ios/community-members', authenticateToken, GetIOSCommunityProfiles);
router.get('/profiles/:id', authenticateToken, GetProfile);
router.post('/likes', authenticateToken, LikeUser);
router.get('/likes', authenticateToken, GetMyLikes);
router.get('/likes/received', authenticateToken, GetReceivedLikes);
router.delete('/likes/:id', authenticateToken, DeleteLike);
router.post('/reports', authenticateToken, ReportUser);
router.get('/blocks', authenticateToken, GetBlockedUsers);
router.post('/blocks', authenticateToken, BlockUser);
router.delete('/blocks/:id', authenticateToken, UnblockUser);
router.post('/push-tokens', authenticateToken, SavePushToken);
router.delete('/push-tokens', authenticateToken, DeletePushToken);
router.patch('/notification-preferences', authenticateToken, UpdateNotificationPreferences);

module.exports = router;

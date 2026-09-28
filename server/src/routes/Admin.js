
const express = require('express');
const router = express.Router();
const {
  RegisterAdmin,
  LoginAdmin,
  RegisterFreeUser,
  UpdateAdminCreatedUserProfile,
  GetAllUsers,
  GetUserById,
  UpdateUserStatus,
  GetAdminProfile
} = require('../controllers/Admin');
const adminMiddleware = require("../middleware/adminMiddleware")
const upload = require('../middleware/uploadImage');

router.get('/admin/me', adminMiddleware, GetAdminProfile);
router.post('/admins/register', RegisterAdmin);
router.post('/admins/login', LoginAdmin);
router.post('/admin/users/free', adminMiddleware, RegisterFreeUser);
router.patch(
  '/admin/users/:userId/profile',
  adminMiddleware,
  upload.fields([{ name: 'photos', maxCount: 9 }]),
  UpdateAdminCreatedUserProfile
);
router.get('/admin/users', adminMiddleware, GetAllUsers);
router.get('/admin/users/:userId', adminMiddleware, GetUserById);
router.put('/admin/users/:userId/status', adminMiddleware, UpdateUserStatus);


module.exports = router;

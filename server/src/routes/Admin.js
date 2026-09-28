// routes/solicitudes.js
const express = require('express');
const router = express.Router();
const {
  RegisterAdmin,
  LoginAdmin,
  RegisterFreeUser,
  UpdateAdminCreatedUserProfile,
  AllUsers,
  OneUser,
  ActualizarEstadoUsuario,
  Auth
} = require('../controllers/Admin');
const adminMiddleware = require("../middleware/adminMiddleware")
const upload = require('../middleware/uploadImage');

router.get('/admin/me', adminMiddleware, Auth);
router.post('/register-admin', RegisterAdmin);
router.post('/admin/users/free', RegisterFreeUser);
router.patch(
  '/admin/users/:userId/profile',
  upload.fields([{ name: 'fotos', maxCount: 9 }]),
  UpdateAdminCreatedUserProfile
);

router.post('/login-admin', LoginAdmin);
router.get('/users', AllUsers);
router.get('/user/:userId', OneUser);


router.put('/users/:userId/estado', ActualizarEstadoUsuario);


module.exports = router;

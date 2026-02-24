const express = require('express');
const router = express.Router();
const { changePassword, getAllUsers, registerUser, updateUserName, deleteUser, getMe, changePasswordByAdmin, updatePhoneNumber, getSettings, updateSettings } = require('../controller/user.ctr');
const authMiddleware = require('../middleware/auth.middleware');
const adminMiddleware = require('../middleware/admin.middleware');

router.put('/change-password', authMiddleware, changePassword);
router.get('/users', authMiddleware, adminMiddleware, getAllUsers)
router.post('/register', authMiddleware, adminMiddleware, registerUser)
router.put('/update-username/:id', authMiddleware, updateUserName)
router.delete('/delete-user/:id', authMiddleware, adminMiddleware, deleteUser)
router.get('/me', authMiddleware, getMe)
router.put('/change-username', authMiddleware, updateUserName)
router.put('/change-password-by-admin/:id', authMiddleware, adminMiddleware, changePasswordByAdmin)
router.put('/update-phone/:id', authMiddleware, updatePhoneNumber)
router.get('/settings', authMiddleware, getSettings)
router.put('/update-settings', authMiddleware, updateSettings)

module.exports = router;


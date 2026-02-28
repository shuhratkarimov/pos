const express = require('express');
const router = express.Router();
const { changePassword, getAllUsers, registerUser, updateUserName, deleteUser, getMe, changePasswordByAdmin, updatePhoneNumber, getSettings, updateSettings } = require('../controller/user.ctr');
const authMiddleware = require('../middleware/auth.middleware');
const adminMiddleware = require('../middleware/admin.middleware');
const catchAsync = require('../utils/catchAsync');
const { cache } = require("../middleware/cacheMiddleware");

router.put('/change-password', authMiddleware, catchAsync(changePassword));
router.get('/users', authMiddleware, adminMiddleware, cache("users", 120), catchAsync(getAllUsers))
router.post('/register', authMiddleware, adminMiddleware, catchAsync(registerUser))
router.put('/update-username/:id', authMiddleware, catchAsync(updateUserName))
router.delete('/delete-user/:id', authMiddleware, adminMiddleware, catchAsync(deleteUser))
router.get('/me', authMiddleware, cache("me", 120), catchAsync(getMe))
router.put('/change-username', authMiddleware, catchAsync(updateUserName))
router.put('/change-password-by-admin/:id', authMiddleware, adminMiddleware, catchAsync(changePasswordByAdmin))
router.put('/update-phone/:id', authMiddleware, catchAsync(updatePhoneNumber))
router.get('/settings', authMiddleware, cache("settings", 120), catchAsync(getSettings))
router.put('/update-settings', authMiddleware, catchAsync(updateSettings))

module.exports = router;


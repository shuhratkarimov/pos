const express = require('express');
const router = express.Router();
const { login, refreshToken, checkAuth, checkInitKey, initAdmin, logout } = require('../controller/auth.ctr');
const authMiddleware = require('../middleware/auth.middleware');
const adminMiddleware = require('../middleware/admin.middleware');
const { getAllUsers } = require('../controller/user.ctr');

router.post('/login', login);
router.post('/refresh-token', refreshToken);
router.get('/check-auth', authMiddleware, checkAuth);
router.post('/check-init-key', checkInitKey);
router.post('/init-admin', initAdmin);
router.post('/logout', logout);

module.exports = router;
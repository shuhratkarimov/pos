const express = require('express');
const router = express.Router();
const { login, refreshToken, checkAuth, checkInitKey, initAdmin, logout } = require('../controller/auth.ctr');
const authMiddleware = require('../middleware/auth.middleware');
const adminMiddleware = require('../middleware/admin.middleware');
const { getAllUsers } = require('../controller/user.ctr');
const catchAsync = require('../utils/catchAsync');

router.post('/login', catchAsync(login));
router.post('/refresh-token', catchAsync(refreshToken));
router.get('/check-auth', authMiddleware, catchAsync(checkAuth));
router.post('/check-init-key', catchAsync(checkInitKey));
router.post('/init-admin', catchAsync(initAdmin));
router.post('/logout', catchAsync(logout));

module.exports = router;
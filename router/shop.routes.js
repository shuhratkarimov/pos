const express = require('express');
const router = express.Router();
const { getAllShops, createShop, updateShop, deleteShop, getOneShop, updateShopName, topUpBalance, getBalance, getBalancesByAdmin, getBalanceInProvider, deductBalance } = require('../controller/shop.ctr');
const authMiddleware = require('../middleware/auth.middleware');
const adminMiddleware = require('../middleware/admin.middleware');
const catchAsync = require('../utils/catchAsync');
const { cache } = require("../middleware/cacheMiddleware");

router.get('/all-shops', authMiddleware, adminMiddleware, cache("shops", 120), catchAsync(getAllShops));
router.get('/in-provider-balance', authMiddleware, adminMiddleware, cache("in-provider-balance", 120), catchAsync(getBalanceInProvider))
router.post('/create-shop', authMiddleware, adminMiddleware, catchAsync(createShop));
router.put('/update-shop/:id', authMiddleware, adminMiddleware, catchAsync(updateShop));
router.delete('/delete-shop/:id', authMiddleware, adminMiddleware, catchAsync(deleteShop));
router.get('/get-one-shop/:id', authMiddleware, catchAsync(getOneShop))
router.put('/update-shop-name', authMiddleware, catchAsync(updateShopName))
router.put('/top-up-balance', authMiddleware, adminMiddleware, catchAsync(topUpBalance))
router.get('/get-sms-balance', authMiddleware, cache("sms-balance", 120), catchAsync(getBalance))
router.get('/get-sms-balances-admin', authMiddleware, adminMiddleware, cache("sms-balances-admin", 120), catchAsync(getBalancesByAdmin))
router.put('/deduct-balance', authMiddleware, catchAsync(deductBalance))

module.exports = router;

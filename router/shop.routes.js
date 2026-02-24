const express = require('express');
const router = express.Router();
const { getAllShops, createShop, updateShop, deleteShop, getOneShop, updateShopName, topUpBalance, getBalance, getBalancesByAdmin, getBalanceInProvider } = require('../controller/shop.ctr');
const authMiddleware = require('../middleware/auth.middleware');
const adminMiddleware = require('../middleware/admin.middleware');

router.get('/all-shops', authMiddleware, adminMiddleware, getAllShops);
router.get('/in-provider-balance', authMiddleware, adminMiddleware, getBalanceInProvider)
router.post('/create-shop', authMiddleware, adminMiddleware, createShop);
router.put('/update-shop/:id', authMiddleware, adminMiddleware, updateShop);
router.delete('/delete-shop/:id', authMiddleware, adminMiddleware, deleteShop);
router.get('/get-one-shop/:id', authMiddleware, getOneShop)
router.put('/update-shop-name', authMiddleware, updateShopName)
router.put('/top-up-balance', authMiddleware, adminMiddleware, topUpBalance)
router.get('/get-sms-balance', authMiddleware, getBalance)
router.get('/get-sms-balances-admin', authMiddleware, adminMiddleware, getBalancesByAdmin)

module.exports = router;

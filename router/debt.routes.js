const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");
const { getAllDebts, createDebt, updateDebt, deleteDebt, sendDebtSms, getSmsHistory } = require("../controller/debt.ctr");
const catchAsync = require('../utils/catchAsync');
const { cache } = require("../middleware/cacheMiddleware");

router.get("/", authMiddleware, cache("debts", 120), catchAsync(getAllDebts));
router.post("/", authMiddleware, catchAsync(createDebt));
router.put("/:id", authMiddleware, catchAsync(updateDebt));
router.delete("/:id", authMiddleware, catchAsync(deleteDebt));
router.post("/send-sms", authMiddleware, catchAsync(sendDebtSms));
router.post('/get-sms-history', authMiddleware, cache("sms-history", 120), catchAsync(getSmsHistory));

module.exports = router;
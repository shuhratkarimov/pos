const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");
const { getAllDebts, createDebt, updateDebt, deleteDebt, sendDebtSms, getSmsHistory } = require("../controller/debt.ctr");

router.get("/", authMiddleware, getAllDebts);
router.post("/", authMiddleware, createDebt);
router.put("/:id", authMiddleware, updateDebt);
router.delete("/:id", authMiddleware, deleteDebt);
router.post("/send-sms", authMiddleware, sendDebtSms)
router.post('/get-sms-history', authMiddleware, getSmsHistory)

module.exports = router;
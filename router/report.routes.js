const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");
const {
    getReports,
    getDailyReports,
    getProductReports,
    getPaymentMethodReports,
    getStatistics,
    getTopSellingProducts
} = require("../controller/report.ctr");    

router.get("/", authMiddleware, getReports);
router.get("/daily", authMiddleware, getDailyReports);
router.get("/products", authMiddleware, getProductReports);
router.get("/payments", authMiddleware, getPaymentMethodReports);
router.get("/statistics", authMiddleware, getStatistics);
router.get("/top-selling", authMiddleware, getTopSellingProducts);

module.exports = router;
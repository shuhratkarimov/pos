const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");
const {
    getReports,
    getDailyReports,
    getProductReports,
    getPaymentMethodReports,
    getStatistics,
    getTopSellingProducts,
    getReportSummary,
    getReportInvoices
} = require("../controller/report.ctr");
const catchAsync = require('../utils/catchAsync');
const { cache } = require("../middleware/cacheMiddleware");

router.get("/", authMiddleware, cache("reports", 120), catchAsync(getReports));
router.get("/daily", authMiddleware, cache("daily-reports", 120), catchAsync(getDailyReports));
router.get("/products", authMiddleware, cache("products-reports", 120), catchAsync(getProductReports));
router.get("/payments", authMiddleware, cache("payments-reports", 120), catchAsync(getPaymentMethodReports));
router.get("/statistics", authMiddleware, cache("statistics-reports", 120), catchAsync(getStatistics));
router.get("/top-selling", authMiddleware, cache("top-selling-reports", 120), catchAsync(getTopSellingProducts));
router.get("/summary", authMiddleware, cache("summary-reports", 120), catchAsync(getReportSummary));
router.get("/invoices", authMiddleware, cache("invoices-reports", 120), catchAsync(getReportInvoices));
module.exports = router;
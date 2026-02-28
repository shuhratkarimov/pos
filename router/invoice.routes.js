const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");
const { getAllInvoices, createInvoice, updateInvoice, deleteInvoice, getInvoiceStats, getPaginatedInvoices } = require("../controller/invoice.ctr");
const catchAsync = require('../utils/catchAsync');
const { cache } = require("../middleware/cacheMiddleware");

router.get("/", authMiddleware, cache("invoices", 120), catchAsync(getAllInvoices));
router.post("/", authMiddleware, catchAsync(createInvoice));
router.put("/:id", authMiddleware, catchAsync(updateInvoice));
router.delete("/:id", authMiddleware, catchAsync(deleteInvoice));
router.get("/stats", authMiddleware, cache("stats", 120), catchAsync(getInvoiceStats));
router.get("/paginated", authMiddleware, cache("paginated-invoices", 120), catchAsync(getPaginatedInvoices));
module.exports = router;

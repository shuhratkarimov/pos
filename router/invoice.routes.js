const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");
const { getAllInvoices, createInvoice, updateInvoice, deleteInvoice } = require("../controller/invoice.ctr");

router.get("/", authMiddleware, getAllInvoices);
router.post("/", authMiddleware, createInvoice);
router.put("/:id", authMiddleware, updateInvoice);
router.delete("/:id", authMiddleware, deleteInvoice);

module.exports = router;

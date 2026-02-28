const express = require("express");
const router = express.Router();
const { cache } = require("../middleware/cacheMiddleware");

const { getAllProducts, createProduct, updateProduct, deleteProduct, getProductStats, importProductsFromCSV } = require("../controller/product.ctr");
const authMiddleware = require("../middleware/auth.middleware");
const catchAsync = require('../utils/catchAsync');

router.get("/", authMiddleware, cache("products", 120), catchAsync(getAllProducts));
router.post("/", authMiddleware, catchAsync(createProduct));
router.put("/:id", authMiddleware, catchAsync(updateProduct));
router.delete("/:id", authMiddleware, catchAsync(deleteProduct));
router.get("/stats", authMiddleware, cache("stats", 120), catchAsync(getProductStats));
router.post("/import-csv", authMiddleware, catchAsync(importProductsFromCSV));
module.exports = router;

const express = require("express");
const router = express.Router();

const { getAllProducts, createProduct, updateProduct, deleteProduct, getPotentialProfit } = require("../controller/product.ctr");
const authMiddleware = require("../middleware/auth.middleware");

router.get("/", authMiddleware, getAllProducts);
router.post("/", authMiddleware, createProduct);
router.put("/:id", authMiddleware, updateProduct);
router.delete("/:id", authMiddleware, deleteProduct);
router.get("/potential-profit", authMiddleware, getPotentialProfit);

module.exports = router;

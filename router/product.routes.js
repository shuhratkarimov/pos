const express = require("express");
const router = express.Router();

const { getAllProducts, createProduct, updateProduct, deleteProduct } = require("../controller/product.ctr");
const authMiddleware  = require("../middleware/auth.middleware");

router.get("/", authMiddleware, getAllProducts);
router.post("/", authMiddleware, createProduct);
router.put("/:id", authMiddleware, updateProduct);
router.delete("/:id", authMiddleware, deleteProduct);

module.exports = router;

const Product = require("../schema/product.schema");

async function getAllProducts(req, res) {
    try {
        const shop = req.user.shop;
        const products = await Product.find({ shop });
        res.status(200).json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

async function createProduct(req, res) {
    try {
        const shop = req.user.shop;
        const { code } = req.body;
        if (code && code.trim() !== '') {
            const exists = await Product.findOne({ code })
            if (exists) {
                return res.status(400).json({ message: 'Bu barcode allaqachon mavjud' })
            }
        }
        const product = await Product.create({ ...req.body, code: code || null, shop });
        res.status(201).json(product);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

async function updateProduct(req, res) {
    try {
        const product = await Product.findOneAndUpdate({ shop: req.user.shop, _id: req.params.id }, req.body, { new: true });
        res.status(200).json(product);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

async function deleteProduct(req, res) {
    try {
        const product = await Product.findOneAndDelete({ shop: req.user.shop, _id: req.params.id });
        res.status(200).json(product);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

async function getPotentialProfit(req, res) {
    try {
        const shop = req.user.shop;

        const products = await Product.find({ shop }).select('price boughtPrice stock');

        const potentialProfit = products.reduce((sum, p) => {
            const profitPerUnit = (p.price || 0) - (p.boughtPrice || 0);
            return sum + (profitPerUnit * (p.stock || 0));
        }, 0);

        res.status(200).json({
            potentialProfit,
            totalProducts: products.length,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

module.exports = {
    getAllProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    getPotentialProfit
}

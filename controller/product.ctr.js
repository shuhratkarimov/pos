const Product = require("../schema/product.schema");
const BaseError = require("../utils/BaseError");
const { clearCacheByPrefix } = require("../middleware/cacheMiddleware");

async function getAllProducts(req, res, next) {
    try {
        const shop = req.user.shop;

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 30;
        const skip = (page - 1) * limit;

        const search = req.query.search?.trim() || '';
        const stockFilter = req.query.stockFilter || 'all';
        const sortField = req.query.sortField || 'name';
        const sortDirection = req.query.sortDirection === 'desc' ? -1 : 1;

        const filter = { shop };

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { code: { $regex: search, $options: 'i' } }
            ];
        }

        if (stockFilter !== 'all') {
            if (stockFilter === 'out') {
                filter.stock = 0;
            } else if (stockFilter === 'low') {
                filter.stock = { $gt: 0, $lt: 10 };
            } else if (stockFilter === 'medium') {
                filter.stock = { $gte: 10, $lt: 50 };
            } else if (stockFilter === 'high') {
                filter.stock = { $gte: 50 };
            }
        }

        const sort = {};
        sort[sortField] = sortDirection;

        const products = await Product.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await Product.countDocuments(filter);



        res.status(200).json({
            products,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            hasMore: skip + products.length < total
        });
    } catch (error) {
        return next(BaseError.BadRequest(500, error.message));
    }
}

async function createProduct(req, res, next) {
    try {
        await clearCacheByPrefix("products", req.user);
        await clearCacheByPrefix("stats", req.user);
        const shop = req.user.shop;
        const { code } = req.body;
        if (code && code.trim() !== '') {
            const exists = await Product.findOne({ code, shop })
            if (exists) {
                return next(BaseError.BadRequest(400, `Bu barcode allaqachon mavjud: ${code}`));
            }
        }
        const product = await Product.create({ ...req.body, code: code || null, shop });
        res.status(201).json(product);
    } catch (error) {
        return next(BaseError.BadRequest(500, error.message));
    }
}

async function updateProduct(req, res, next) {
    try {
        const product = await Product.findOneAndUpdate({ shop: req.user.shop, _id: req.params.id }, req.body, { new: true });
        await clearCacheByPrefix("products", req.user);
        await clearCacheByPrefix("stats", req.user);
        res.status(200).json(product);
    } catch (error) {
        return next(BaseError.BadRequest(500, error.message));
    }
}

async function deleteProduct(req, res, next) {
    try {
        const product = await Product.findOneAndDelete({ shop: req.user.shop, _id: req.params.id });
        await clearCacheByPrefix("products", req.user);
        await clearCacheByPrefix("stats", req.user);
        res.status(200).json(product);
    } catch (error) {
        return next(BaseError.BadRequest(500, error.message));
    }
}

async function getProductStats(req, res, next) {
    try {
        const shop = req.user.shop;

        const stats = await Product.aggregate([
            { $match: { shop } },

            {
                $facet: {
                    summary: [
                        {
                            $group: {
                                _id: null,
                                totalProducts: { $sum: 1 },
                                totalStock: { $sum: "$stock" },
                                totalValue: {
                                    $sum: { $multiply: ["$price", "$stock"] }
                                },
                                potentialProfit: {
                                    $sum: {
                                        $multiply: [
                                            { $subtract: ["$price", "$boughtPrice"] },
                                            "$stock"
                                        ]
                                    }
                                }
                            }
                        }
                    ],

                    lowStock: [
                        { $match: { stock: { $gt: 0, $lt: 10 } } },
                        { $count: "count" }
                    ],

                    outOfStock: [
                        { $match: { stock: 0 } },
                        { $count: "count" }
                    ]
                }
            }
        ]);

        const summary = stats[0]?.summary[0] || {};
        const lowStockCount = stats[0]?.lowStock[0]?.count || 0;
        const outOfStockCount = stats[0]?.outOfStock[0]?.count || 0;

        res.status(200).json({
            totalProducts: summary.totalProducts || 0,
            totalStock: summary.totalStock || 0,
            totalValue: summary.totalValue || 0,
            potentialProfit: summary.potentialProfit || 0,
            lowStockCount,
            outOfStockCount
        });

    } catch (error) {
        return next(BaseError.BadRequest(500, error.message));
    }
}

async function importProductsFromCSV(req, res) {
    if (!req.user?.shop) {
        return res.status(401).json({ message: "Shop not found" });
    }

    const shop = req.user.shop;
    const { products } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
        return res.status(400).json({ message: "Mahsulotlar ro'yxati bo'sh" });
    }

    const total = products.length;
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const sendProgress = () => {
        const progress = Math.round((successCount + errorCount) / total * 100);
        res.write(
            `data: ${JSON.stringify({
                progress,
                success: successCount,
                errors: errorCount,
                total,
                message: `${successCount} ta qo'shildi, ${errorCount} ta xato`
            })}\n\n`
        );
    };

    for (const [index, item] of products.entries()) {
        try {
            const { name, code, price, stock, measure, boughtPrice } = item;

            if (!name || !price) {
                throw new Error("Nomi va narxi majburiy");
            }

            if (code && code.trim() !== "") {
                const exists = await Product.findOne({ code: code.trim(), shop });
                if (exists) {
                    throw new Error(`Bu barcode allaqachon mavjud: ${code}`);
                }
            }

            await Product.create({
                name: name.trim(),
                code: code?.trim() || null,
                price: Number(price) || 0,
                stock: Number(stock) || 0,
                measure: measure?.trim() || "dona",
                boughtPrice: Number(boughtPrice) || 0,
                shop
            });

            successCount++;
        } catch (err) {
            errorCount++;
            errors.push({
                row: index + 2,
                error: err.message
            });
        }

        sendProgress();
    }

    await clearCacheByPrefix("products", req.user);
    await clearCacheByPrefix("stats", req.user);

    res.write(
        `data: ${JSON.stringify({
            progress: 100,
            success: successCount,
            errors: errorCount,
            total,
            finished: true,
            errorsList: errors.length > 0 ? errors : undefined
        })}\n\n`
    );

    res.end();
}

module.exports = {
    getAllProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    getProductStats,
    importProductsFromCSV
}

const Invoice = require("../schema/invoice.schema");
const Product = require("../schema/product.schema");

async function getTopSellingProducts(req, res) {
    try {
        const limit = parseInt(req.query.limit) || 15;
        const days = parseInt(req.query.days) || 7;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const shopId = req.user.shop; // login qilgan do'kon IDsi

        const result = await Invoice.aggregate([
            // 1. So‘nggi N kun va shop bo‘yicha filter
            {
                $match: {
                    createdAt: { $gte: startDate },
                    shop: shopId
                }
            },

            // 2. items ni yoyamiz
            { $unwind: "$items" },

            // 3. REAL ObjectId mahsulotlarni qoldiramiz
            {
                $match: {
                    "items.id": { $regex: /^[a-fA-F0-9]{24}$/ }
                }
            },

            // 4. ObjectId ga o‘tkazamiz
            {
                $addFields: {
                    productObjectId: { $toObjectId: "$items.id" }
                }
            },

            // 5. Hisoblash
            {
                $group: {
                    _id: "$productObjectId",
                    soldQuantity: { $sum: "$items.quantity" },
                    totalRevenue: { $sum: "$items.subtotal" }
                }
            },

            // 6. Eng ko‘p sotilganlar
            { $sort: { soldQuantity: -1 } },
            { $limit: limit },

            // 7. Product bilan join
            {
                $lookup: {
                    from: "products",
                    localField: "_id",
                    foreignField: "_id",
                    as: "product"
                }
            },
            { $unwind: "$product" },

            // 8. Final response
            {
                $project: {
                    _id: 0,
                    productId: "$product._id",
                    name: "$product.name",
                    code: "$product.code",
                    price: "$product.price",
                    measure: "$product.measure",
                    stock: "$product.stock",
                    soldQuantity: 1,
                    totalRevenue: 1
                }
            }
        ]);

        res.json({
            success: true,
            data: result,
            period: {
                days,
                startDate,
                endDate: new Date()
            }
        });
    } catch (error) {
        console.error("Top selling products error:", error);
        res.status(500).json({
            success: false,
            message: "Top selling mahsulotlarni olishda xatolik"
        });
    }
}

// Asosiy hisobot olish funksiyasi
async function getReports(req, res) {
    try {
        const { startDate, endDate } = req.query;
        const shopId = req.user.shop;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: "Iltimos, startDate va endDate parametrlarini kiriting"
            });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({
                success: false,
                message: "Noto'g'ri sana formati. YYYY-MM-DD formatida kiriting"
            });
        }
        end.setHours(23, 59, 59, 999);

        const invoices = await Invoice.find({
            shop: shopId,
            date: { $gte: start, $lte: end }
        }).sort({ date: 1 });

        const totalSales = invoices.reduce((sum, invoice) => sum + (invoice.total || 0), 0);
        const totalInvoices = invoices.length;
        const totalItems = invoices.reduce((sum, invoice) => {
            return sum + invoice.items.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0);
        }, 0);

        const reportData = {
            success: true,
            totalSales,
            totalInvoices,
            totalItems,
            invoices: invoices.map(invoice => ({
                _id: invoice._id,
                date: invoice.date,
                items: invoice.items.map(item => ({
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    subtotal: item.subtotal
                })),
                subtotal: invoice.subtotal,
                total: invoice.total,
                profit: invoice.profit,
                paymentMethod: invoice.paymentMethod,
                customerName: invoice.customerName,
                description: invoice.description,
                createdAt: invoice.createdAt,
                updatedAt: invoice.updatedAt
            }))
        };

        res.status(200).json(reportData);
    } catch (error) {
        console.error('Hisobot xatosi:', error);
        res.status(500).json({
            success: false,
            message: "Hisobotni olishda xatolik",
            error: error.message
        });
    }
}

// Kunlik hisobot
async function getDailyReports(req, res) {
    try {
        const { startDate, endDate } = req.query;
        const shopId = req.user.shop;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: "Iltimos, startDate va endDate parametrlarini kiriting"
            });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const dailyReports = await Invoice.aggregate([
            {
                $match: {
                    shop: shopId,
                    date: { $gte: start, $lte: end }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                    totalSales: { $sum: "$total" },
                    invoiceCount: { $sum: 1 },
                    itemsSold: { $sum: { $sum: "$items.quantity" } },
                    averageTicket: { $avg: "$total" },
                    invoices: { $push: "$$ROOT" }
                }
            },
            {
                $project: {
                    date: "$_id",
                    totalSales: 1,
                    invoiceCount: 1,
                    itemsSold: 1,
                    averageTicket: { $round: ["$averageTicket", 2] },
                    invoices: {
                        $map: {
                            input: "$invoices",
                            as: "invoice",
                            in: {
                                _id: "$$invoice._id",
                                total: "$$invoice.total",
                                paymentMethod: "$$invoice.paymentMethod"
                            }
                        }
                    }
                }
            },
            { $sort: { date: 1 } }
        ]);

        res.status(200).json({
            success: true,
            dailyReports,
            period: { startDate, endDate }
        });
    } catch (error) {
        console.error('Kunlik hisobot xatosi:', error);
        res.status(500).json({
            success: false,
            message: "Kunlik hisobotni olishda xatolik",
            error: error.message
        });
    }
}

// Mahsulotlar bo'yicha hisobot
async function getProductReports(req, res) {
    try {
        const { startDate, endDate } = req.query;
        const shopId = req.user.shop;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: "Iltimos, startDate va endDate parametrlarini kiriting"
            });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const productReports = await Invoice.aggregate([
            {
                $match: {
                    shop: shopId,
                    date: { $gte: start, $lte: end }
                }
            },
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items.name",
                    totalQuantity: { $sum: "$items.quantity" },
                    totalRevenue: { $sum: "$items.subtotal" },
                    averagePrice: { $avg: "$items.price" },
                    invoiceCount: { $addToSet: "$_id" }
                }
            },
            {
                $project: {
                    productName: "$_id",
                    totalQuantity: 1,
                    totalRevenue: 1,
                    averagePrice: { $round: ["$averagePrice", 2] },
                    saleFrequency: { $size: "$invoiceCount" }
                }
            },
            { $sort: { totalRevenue: -1 } }
        ]);

        res.status(200).json({
            success: true,
            productReports,
            period: { startDate, endDate }
        });
    } catch (error) {
        console.error('Mahsulot hisobot xatosi:', error);
        res.status(500).json({
            success: false,
            message: "Mahsulot hisobotini olishda xatolik",
            error: error.message
        });
    }
}

// To'lov usullari bo'yicha hisobot
async function getPaymentMethodReports(req, res) {
    try {
        const { startDate, endDate } = req.query;
        const shopId = req.user.shop;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: "Iltimos, startDate va endDate parametrlarini kiriting"
            });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const paymentReports = await Invoice.aggregate([
            {
                $match: {
                    shop: shopId,
                    date: { $gte: start, $lte: end }
                }
            },
            {
                $group: {
                    _id: "$paymentMethod",
                    totalAmount: { $sum: "$total" },
                    count: { $sum: 1 },
                    averageAmount: { $avg: "$total" }
                }
            },
            {
                $project: {
                    paymentMethod: "$_id",
                    totalAmount: 1,
                    count: 1,
                    averageAmount: { $round: ["$averageAmount", 2] },
                    _id: 0
                }
            },
            { $sort: { totalAmount: -1 } }
        ]);

        // Foiz hisoblash uchun umumiy summani olamiz
        const totalAll = paymentReports.reduce((sum, p) => sum + p.totalAmount, 0);
        paymentReports.forEach(p => {
            p.percentage = totalAll > 0 ? Math.round((p.totalAmount / totalAll) * 100) : 0;
        });

        res.status(200).json({
            success: true,
            paymentReports,
            period: { startDate, endDate }
        });
    } catch (error) {
        console.error('To\'lov hisobot xatosi:', error);
        res.status(500).json({
            success: false,
            message: "To'lov hisobotini olishda xatolik",
            error: error.message
        });
    }
}

// Statistik ma'lumotlar
async function getStatistics(req, res) {
    try {
        const { startDate, endDate } = req.query;
        const shopId = req.user.shop;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: "Iltimos, startDate va endDate parametrlarini kiriting"
            });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const invoices = await Invoice.find({
            shop: shopId,
            date: { $gte: start, $lte: end }
        });

        if (invoices.length === 0) {
            return res.status(200).json({
                success: true,
                message: "Tanlangan davrda ma'lumot topilmadi",
                statistics: {
                    totalSales: 0,
                    totalInvoices: 0,
                    totalItems: 0,
                    averageTicket: 0,
                    maxTicket: 0,
                    minTicket: 0,
                    busiestDay: null,
                    topProducts: [],
                    paymentMethodDistribution: []
                }
            });
        }

        const totalSales = invoices.reduce((sum, inv) => sum + inv.total, 0);
        const totalInvoices = invoices.length;
        const totalItems = invoices.reduce((sum, inv) =>
            sum + inv.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);
        const averageTicket = totalSales / totalInvoices;
        const maxTicket = Math.max(...invoices.map(i => i.total));
        const minTicket = Math.min(...invoices.map(i => i.total));

        const dailyStats = {};
        invoices.forEach(invoice => {
            const date = invoice.date.toISOString().split('T')[0];
            if (!dailyStats[date]) dailyStats[date] = { sales: 0, count: 0 };
            dailyStats[date].sales += invoice.total;
            dailyStats[date].count += 1;
        });

        let busiestDay = null;
        let maxDailySales = 0;
        Object.entries(dailyStats).forEach(([date, stats]) => {
            if (stats.sales > maxDailySales) {
                maxDailySales = stats.sales;
                busiestDay = { date, ...stats };
            }
        });

        const productStats = {};
        invoices.forEach(invoice => {
            invoice.items.forEach(item => {
                if (!productStats[item.name]) {
                    productStats[item.name] = { quantity: 0, revenue: 0 };
                }
                productStats[item.name].quantity += item.quantity;
                productStats[item.name].revenue += item.subtotal;
            });
        });

        const topProducts = Object.entries(productStats)
            .map(([name, stats]) => ({
                name,
                ...stats,
                percentage: totalSales > 0 ? ((stats.revenue / totalSales) * 100).toFixed(2) : "0"
            }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);

        const paymentStats = {};
        invoices.forEach(invoice => {
            const method = invoice.paymentMethod || "Noma'lum";
            if (!paymentStats[method]) paymentStats[method] = { amount: 0, count: 0 };
            paymentStats[method].amount += invoice.total;
            paymentStats[method].count += 1;
        });

        const paymentMethodDistribution = Object.entries(paymentStats)
            .map(([method, stats]) => ({
                method,
                ...stats,
                percentage: totalSales > 0 ? ((stats.amount / totalSales) * 100).toFixed(2) : "0"
            }));

        res.status(200).json({
            success: true,
            statistics: {
                totalSales,
                totalInvoices,
                totalItems,
                averageTicket: Math.round(averageTicket),
                maxTicket,
                minTicket,
                busiestDay,
                topProducts,
                paymentMethodDistribution,
                dailyStats: Object.entries(dailyStats)
                    .map(([date, stats]) => ({ date, ...stats }))
                    .sort((a, b) => new Date(a.date) - new Date(b.date))
            }
        });
    } catch (error) {
        console.error('Statistika xatosi:', error);
        res.status(500).json({
            success: false,
            message: "Statistikani olishda xatolik",
            error: error.message
        });
    }
}

module.exports = {
    getReports,
    getDailyReports,
    getProductReports,
    getPaymentMethodReports,
    getStatistics,
    getTopSellingProducts
};
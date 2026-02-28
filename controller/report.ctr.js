const Invoice = require("../schema/invoice.schema");
const Product = require("../schema/product.schema");
const redis = require("../redis");

async function getTopSellingProducts(req, res) {
    try {
        const limit = parseInt(req.query.limit) || 15;

        // Frontenddan keladigan startDate va endDate ni olish
        const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
        const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

        const shopId = req.user.shop; // login qilgan do'kon IDsi

        // Filter obyektini tayyorlash
        const matchFilter = { shop: shopId };

        // Agar startDate va endDate berilgan bo'lsa, ularni filterga qo'shish
        if (startDate && endDate) {
            // endDate ni kunning oxirigacha sozlash (23:59:59)
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999);

            matchFilter.createdAt = {
                $gte: startDate,
                $lte: endOfDay
            };
        } else {
            // Agar sana berilmagan bo'lsa, default: so'nggi 30 kun
            const defaultStartDate = new Date();
            defaultStartDate.setDate(defaultStartDate.getDate() - 30);
            matchFilter.createdAt = { $gte: defaultStartDate };
        }

        const result = await Invoice.aggregate([
            // 1. Filter qo'llash (shop va sana bo'yicha)
            {
                $match: matchFilter
            },

            // 2. items ni yoyamiz
            { $unwind: "$items" },

            // 3. Mahsulot ID'sini tekshirish (ObjectId formatida)
            {
                $match: {
                    "items.id": {
                        $regex: /^[0-9a-fA-F]{24}$/,
                        $exists: true,
                        $ne: null
                    }
                }
            },

            // 4. ObjectId ga o'tkazamiz
            {
                $addFields: {
                    productObjectId: { $toObjectId: "$items.id" }
                }
            },

            // 5. Mahsulotlar bo'yicha guruhlash
            {
                $group: {
                    _id: "$productObjectId",
                    soldQuantity: { $sum: "$items.quantity" },
                    totalRevenue: { $sum: "$items.subtotal" }
                }
            },

            // 6. Eng ko'p sotilganlar bo'yicha sort
            { $sort: { soldQuantity: -1 } },
            { $limit: limit },

            // 7. Product bilan join (lookup)
            {
                $lookup: {
                    from: "products",
                    localField: "_id",
                    foreignField: "_id",
                    as: "product"
                }
            },

            // 8. product array ni ochish (agar mavjud bo'lsa)
            {
                $unwind: {
                    path: "$product",
                    preserveNullAndEmptyArrays: false
                }
            },

            // 9. Final response format
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

        // Jami savdo summasini ham qaytarish (foiz hisoblash uchun)
        const totalSalesResult = await Invoice.aggregate([
            { $match: matchFilter },
            { $group: { _id: null, total: { $sum: "$total" } } }
        ]);

        const totalSales = totalSalesResult.length > 0 ? totalSalesResult[0].total : 0;

        res.status(200).json({
            success: true,
            data: result,
            totalSales,
            period: {
                startDate: startDate || matchFilter.createdAt.$gte,
                endDate: endDate || new Date()
            }
        });

    } catch (error) {
        console.error("Top selling products error:", error);
        res.status(500).json({
            success: false,
            message: "Top selling mahsulotlarni olishda xatolik",
            error: error.message
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

function hourlyPipeline(startDate, endDate) {
    return [
        {
            $match: {
                $expr: {
                    $and: [
                        { $gte: ["$date", new Date(startDate)] },
                        { $lte: ["$date", new Date(endDate + 'T23:59:59.999Z')] }
                    ]
                }
            }
        },
        {
            $group: {
                _id: { $hour: "$date" },
                sales: { $sum: "$total" }
            }
        },
        {
            $project: {
                hour: "$_id",
                sales: 1,
                _id: 0
            }
        },
        {
            $group: {
                _id: null,
                hours: {
                    $push: {
                        hour: "$hour",
                        sales: "$sales"
                    }
                }
            }
        },
        {
            $project: {
                hourly: {
                    $map: {
                        input: { $range: [0, 24] },
                        as: "h",
                        in: {
                            hour: "$$h",
                            sales: {
                                $let: {
                                    vars: {
                                        match: { $arrayElemAt: [{ $filter: { input: "$hours", as: "item", cond: { $eq: ["$$item.hour", "$$h"] } } }, 0] }
                                    },
                                    in: { $ifNull: ["$$match.sales", 0] }
                                }
                            }
                        }
                    }
                }
            }
        },
        { $unwind: "$hourly" },
        { $replaceRoot: { newRoot: "$hourly" } },
        { $sort: { hour: 1 } }
    ];
}

function topProductsPipeline() {
    return [
        { $unwind: "$items" },
        {
            $group: {
                _id: "$items.name",           // yoki agar ObjectId bo'lsa "$items.id" + $toObjectId
                totalRevenue: { $sum: "$items.subtotal" },
                totalQuantity: { $sum: "$items.quantity" }
            }
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: 10 },
        {
            $project: {
                _id: 0,
                name: "$_id",
                sales: "$totalRevenue",
                quantity: "$totalQuantity"
            }
        }
    ];
}

async function getReportSummary(req, res) {
    const { startDate, endDate, groupBy = 'day' } = req.query;
    const shopId = req.user.shop;
    const cacheKey = `report:summary:${shopId}:${startDate}:${endDate}:${groupBy}`;

    const cached = await redis.get(cacheKey);
    if (cached) {
        return res.json(JSON.parse(cached));
    }

    try {
        const start = new Date(startDate);
        const end = new Date(endDate + 'T23:59:59.999Z');

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            throw new Error("Noto'g'ri sana formati");
        }

        const matchStage = {
            shop: shopId,
            date: {
                $gte: start,
                $lte: end
            }
        };

        const pipeline = [
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: "$total" },
                    totalInvoices: { $sum: 1 },
                    totalItems: { $sum: { $sum: "$items.quantity" } },
                    totalProfit: { $sum: { $ifNull: ["$profit", 0] } }
                }
            },
            {
                $lookup: {
                    from: "invoices",
                    let: { shopId: shopId, start: start, end: end },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$shop", "$$shopId"] },
                                        { $gte: ["$date", "$$start"] },
                                        { $lte: ["$date", "$$end"] }
                                    ]
                                }
                            }
                        },
                        {
                            $group: {
                                _id: getGroupIdExpression(groupBy),
                                sales: { $sum: "$total" },
                                count: { $sum: 1 },
                                itemsSold: { $sum: { $sum: "$items.quantity" } }
                            }
                        },
                        { $sort: { _id: 1 } }
                    ],
                    as: "timeSeries"
                }
            },
            {
                $addFields: {
                    timeSeries: {
                        $map: {
                            input: "$timeSeries",
                            as: "item",
                            in: {
                                date: "$$item._id",  // _id ni date ga o'zgartirish
                                sales: "$$item.sales",
                                count: "$$item.count",
                                itemsSold: "$$item.itemsSold"
                            }
                        }
                    }
                }
            },

            ...(groupBy === 'hour' ? [] : [
                {
                    $lookup: {
                        from: "invoices",
                        let: { shopId: shopId, start: start, end: end },
                        pipeline: hourlyPipeline(startDate, endDate),
                        as: "hourly"
                    }
                }
            ]),

            {
                $project: {
                    totalSales: 1,
                    totalInvoices: 1,
                    totalItems: 1,
                    totalProfit: 1,
                    averageTicket: { $divide: ["$totalSales", { $max: ["$totalInvoices", 1] }] },
                    timeSeries: 1,
                    topProducts: 1,
                    hourly: 1
                }
            }
        ];

        const [result] = await Invoice.aggregate(pipeline);

        if (!result) {
            return res.json({
                totalSales: 0,
                totalInvoices: 0,
                totalItems: 0,
                totalProfit: 0,
                averageTicket: 0,
                timeSeries: [],
                topProducts: [],
                hourly: []
            });
        }

        const response = {
            totalSales: result.totalSales || 0,
            totalInvoices: result.totalInvoices || 0,
            totalItems: result.totalItems || 0,
            totalProfit: result.totalProfit || 0,
            averageTicket: Math.round(result.averageTicket || 0),
            timeSeries: result.timeSeries || [],
            topProducts: result.topProducts || [],
            hourly: result.hourly || []
        };

        res.json(response);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Hisobot xatosi" });
    }
}

function getGroupIdExpression(groupBy) {
    if (groupBy === 'day') return { $dateToString: { format: "%Y-%m-%d", date: "$date" } };
    if (groupBy === 'week') return { $dateToString: { format: "%Y-%W", date: "$date" } };
    if (groupBy === 'month') return { $dateToString: { format: "%Y-%m", date: "$date" } };
    if (groupBy === 'hour') return { $hour: "$date" };
    return { $dateToString: { format: "%Y-%m-%d", date: "$date" } };
}

// Cheklar ro'yxatini sahifalash bilan qaytarish
async function getReportInvoices(req, res) {
    try {
        const { startDate, endDate, page = 1, limit = 20 } = req.query;
        const shopId = req.user.shop;

        if (!startDate || !endDate) {
            const today = new Date();
            endDate = today.toISOString().split('T')[0];
            const thirtyDaysAgo = new Date(today);
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            startDate = thirtyDaysAgo.toISOString().split('T')[0];
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const query = {
            shop: shopId,
            date: { $gte: start, $lte: end }
        };

        const [invoices, total] = await Promise.all([
            Invoice.find(query)
                .sort({ date: -1 })           // eng yangi birinchi
                .skip(skip)
                .limit(parseInt(limit))
                .lean()                       // tezroq, faqat oddiy object
                .select('_id date items.name items.quantity items.subtotal subtotal total profit paymentMethod'),
            Invoice.countDocuments(query)
        ]);

        const hasMore = (skip + invoices.length) < total;

        res.json({
            invoices,
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            hasMore
        });
    } catch (err) {
        console.error("getReportInvoices xatosi:", err);
        res.status(500).json({ success: false, message: "Cheklarni yuklashda xato" });
    }
}

module.exports = {
    getReports,
    getDailyReports,
    getProductReports,
    getPaymentMethodReports,
    getStatistics,
    getTopSellingProducts,
    getReportSummary,
    getReportInvoices
};
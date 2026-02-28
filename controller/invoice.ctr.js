const Invoice = require("../schema/invoice.schema");
const Product = require("../schema/product.schema");
const mongoose = require("mongoose");
const redis = require("../redis");
const BaseError = require("../utils/BaseError");
const { clearCacheByPrefix } = require("../middleware/cacheMiddleware");

async function getAllInvoices(req, res, next) {
  try {
    const shop = req.user.shop;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const search = req.query.search?.trim() || '';
    const dateFilter = req.query.dateFilter || 'all';
    const sortBy = req.query.sortBy || 'date';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    const filter = { shop };

    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [
        { 'items.name': regex }
      ];
      if (mongoose.Types.ObjectId.isValid(search)) {
        filter.$or.push({ _id: search });
      }
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    if (dateFilter !== 'all') {
      let startDate;
      switch (dateFilter) {
        case 'today':
          startDate = today;
          break;
        case 'yesterday':
          filter.date = { $gte: yesterday, $lt: today };
          break;
        case 'week':
          startDate = lastWeek;
          break;
        case 'month':
          startDate = lastMonth;
          break;
      }
      if (startDate && dateFilter !== 'yesterday') {
        filter.date = { $gte: startDate };
      }
    }

    const basePipeline = [
      { $match: filter },
      { $set: { itemsCount: { $size: "$items" } } }
    ];

    const sortStage =
      sortBy === 'items'
        ? { $sort: { itemsCount: sortOrder } }
        : sortBy === 'amount'
          ? { $sort: { total: sortOrder } }
          : { $sort: { date: sortOrder } };

    const dataPipeline = [
      ...basePipeline,
      sortStage,
      { $skip: skip },
      { $limit: limit }
    ];

    const countPipeline = [
      ...basePipeline,
      { $count: "total" }
    ];

    const [invoices, countResult] = await Promise.all([
      Invoice.aggregate(dataPipeline),
      Invoice.aggregate(countPipeline)
    ]);

    const total = countResult[0]?.total || 0;

    res.status(200).json({
      invoices,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + invoices.length < total
    });
  } catch (error) {
    console.error('Error in getAllInvoices:', error);
    return next(BaseError.BadRequest(500, error.message));
  }
}

async function getInvoiceStats(req, res) {
  try {
    const shopId = req.user.shop;

    const totalInvoices = await Invoice.countDocuments({ shop: shopId });

    const stats = await Invoice.aggregate([
      { $match: { shop: shopId } },
      { $unwind: "$items" },
      {
        $group: {
          _id: null,
          totalValue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
          totalItems: { $sum: "$items.quantity" }
        }
      },
      {
        $addFields: {
          average: { $cond: [{ $eq: [totalInvoices, 0] }, 0, { $divide: ["$totalValue", totalInvoices] }] }
        }
      }
    ]);

    const result = {
      totalInvoices,
      totalValue: stats[0]?.totalValue || 0,
      totalItems: stats[0]?.totalItems || 0,
      average: stats[0]?.average || 0
    };

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Stats olishda xatolik" });
  }
}

async function createInvoice(req, res, next) {
  try {
    const shop = req.user.shop;
    const invoiceData = req.body;
    let totalProfit = 0;

    // Har bir item bo‘yicha stockni tekshirib, profitni hisoblaymiz
    for (const item of invoiceData.items) {
      const productId = item.id.includes("-custom") ? item.id.split("-custom")[0] : item.id;

      // Productni topamiz
      const product = await Product.findOne({ _id: productId });
      if (!product) throw new Error(`Product not found: ${productId}`);

      // Profitni hisoblaymiz
      totalProfit += (Number(item.price) - Number(product.boughtPrice || 0)) * Number(item.quantity);

      // Stockni yangilaymiz: agar yetarli stock bo‘lmasa null qaytaradi
      const updated = await Product.findOneAndUpdate(
        { _id: productId, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { new: true }
      );

      if (!updated) throw new Error(`Yetarli stock yo‘q: ${item.name}`);
    }

    // Invoice yaratamiz
    const invoice = await Invoice.create({
      ...invoiceData,
      profit: totalProfit,
      shop
    });

    // Redis cachelarni tozalaymiz
    await Promise.all([
      clearCacheByPrefix("invoices", req.user),
      clearCacheByPrefix("stats", req.user),
      clearCacheByPrefix("paginated-invoices", req.user)
    ]);

    res.json({ success: true, data: invoice });

  } catch (error) {
    console.error("Invoice create error:", error);
    next(BaseError.BadRequest(500, error.message));
  }
}

async function updateInvoice(req, res, next) {
  try {
    const invoice = await Invoice.findOneAndUpdate({ shop: req.user.shop, _id: req.params.id }, req.body, { new: true });
    await Promise.all([
      clearCacheByPrefix("invoices", req.user),
      clearCacheByPrefix("stats", req.user),
      clearCacheByPrefix("paginated-invoices", req.user)
    ]);
    res.status(200).json(invoice);
  } catch (error) {
    next(BaseError.BadRequest(500, error.message));
  }
}

async function deleteInvoice(req, res, next) {
  try {
    const invoice = await Invoice.findOneAndDelete({ shop: req.user.shop, _id: req.params.id });
    await Promise.all([
      clearCacheByPrefix("invoices", req.user),
      clearCacheByPrefix("stats", req.user),
      clearCacheByPrefix("paginated-invoices", req.user)
    ]);
    res.status(200).json(invoice);
  } catch (error) {
    next(BaseError.BadRequest(500, error.message));
  }
}

async function getPaginatedInvoices(req, res, next) {
  try {
    const { page = 1, limit = 50, startDate, endDate } = req.query;
    const shopId = req.user.shop;
    if (!startDate || !endDate) {
      return next(BaseError.BadRequest(400, "StartDate va EndDate majburiy"));
    }
    const skip = (Number(page) - 1) * Number(limit);

    const dateFilter = {
      shop: shopId,
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate + 'T23:59:59.999Z')
      }
    };

    const total = await Invoice.countDocuments(dateFilter);
    const invoices = await Invoice.find(dateFilter)
      .sort({ date: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    res.json({ invoices, total, page, limit });
  } catch (error) {
    next(BaseError.BadRequest(500, error.message));
  }
}

module.exports = {
  getAllInvoices,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  getInvoiceStats,
  getPaginatedInvoices
}

const Debt = require("../schema/debt.schema");
const { safeSendSms } = require("../services/smsService");
const SmsLog = require('../schema/smsLog.schema')
const { clearCacheByPrefix } = require("../middleware/cacheMiddleware");

async function getAllDebts(req, res) {
    try {
        const shop = req.user.shop;

        // Query parametrlari
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 15;
        const search = req.query.search || '';
        const status = req.query.status;           // 'pending', 'paid' yoki bo'sh (all)
        const sortBy = req.query.sortBy || 'dueDate';   // masalan: dueDate, amount, date
        const sortDir = req.query.sortDir === 'desc' ? -1 : 1;

        // Asosiy filter — faqat shu shop uchun
        let filter = { shop };

        // Status bo'yicha filter (agar kelgan bo'lsa)
        if (status && ['pending', 'paid'].includes(status)) {
            filter.status = status;
        }

        // Qidiruv (customerName bo'yicha, case-insensitive)
        if (search.trim()) {
            filter.customerName = { $regex: search.trim(), $options: 'i' };
        }

        // Sort obyekti
        const sort = {};
        sort[sortBy] = sortDir;

        // Pagination hisoblash
        const skip = (page - 1) * limit;

        // Parallel query — count va data
        const [debts, total] = await Promise.all([
            Debt.find(filter)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean(),               // .lean() — tezroq ishlaydi, faqat oddiy JS object qaytaradi

            Debt.countDocuments(filter)
        ]);

        const totalPages = Math.ceil(total / limit);
        const hasMore = page < totalPages;

        res.status(200).json({
            success: true,
            data: debts,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasMore,
                nextPage: hasMore ? page + 1 : null,
                prevPage: page > 1 ? page - 1 : null
            }
        });

    } catch (error) {
        console.error("getAllDebts error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Server xatosi"
        });
    }
}

async function createDebt(req, res) {
    try {
        const { dueDate } = req.body
        const debt = await Debt.create({
            ...req.body,
            dueDate: new Date(dueDate),
            shop: req.user.shop
        });

        await clearCacheByPrefix("debts", req.user)

        res.status(201).json(debt);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

async function updateDebt(req, res) {
    const { id } = req.params
    const updates = req.body

    try {
        const debt = await Debt.findById(id)
        if (!debt) {
            return res.status(404).json({ message: "Qarz topilmadi" })
        }

        if (updates.amount !== undefined) debt.amount = updates.amount
        if (updates.customerName) debt.customerName = updates.customerName
        if (updates.dueDate) debt.dueDate = new Date(updates.dueDate)
        if (updates.status) debt.status = updates.status
        if (updates.phoneNumber) debt.phoneNumber = updates.phoneNumber

        await debt.save()

        await clearCacheByPrefix("debts", req.user)

        res.status(200).json(debt)
    } catch (err) {
        console.log(err)
        res.status(500).json({ message: err.message })
    }
}

async function deleteDebt(req, res) {
    try {
        const debt = await Debt.findOneAndDelete({ shop: req.user.shop, _id: req.params.id });

        await clearCacheByPrefix("debts", req.user)

        res.status(200).json(debt);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

async function sendDebtSms(req, res) {
    try {
        const { phone, message } = req.body
        const result = await safeSendSms(req.user.shop, phone, message)
        res.status(200).json(result)
    } catch (err) {
        console.log(err)
        res.status(500).json({ message: err.message })
    }
}

async function getSmsHistory(req, res) {
    const storeId = req.user.shop
    const { phone } = req.body
    const docs = await SmsLog
        .find({ storeId, phone })
        .sort({ sentAt: -1 });
    res.json(docs);
}


module.exports = {
    getAllDebts,
    createDebt,
    updateDebt,
    deleteDebt,
    sendDebtSms,
    getSmsHistory
}

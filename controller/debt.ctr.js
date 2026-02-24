const Debt = require("../schema/debt.schema");
const { safeSendSms } = require("../services/smsService");
const SmsLog = require('../schema/smsLog.schema')

async function getAllDebts(req, res) {
    try {
        const shop = req.user.shop;
        const debts = await Debt.find({ shop });
        res.status(200).json(debts);
    } catch (error) {
        res.status(500).json({ message: error.message });
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

        res.status(200).json(debt)
    } catch (err) {
        console.log(err)
        res.status(500).json({ message: err.message })
    }
}

async function deleteDebt(req, res) {
    try {
        const debt = await Debt.findOneAndDelete({ shop: req.user.shop, _id: req.params.id });
        res.status(200).json(debt);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

async function sendDebtSms(req, res) {
    try {
        console.log(req.body)
        const { phone, message } = req.body
        const result = await safeSendSms(req.user.shop, phone, message)
        console.log(result)
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

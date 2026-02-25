const Shop = require('../schema/shop.schema')
const User = require('../schema/user.schema')
const mongoose = require('mongoose')
const SmsBalance = require('../schema/smsBalance.schema')
const { getTotalBalanceInProvider } = require('../providers/devsms')

const getAllShops = async (req, res) => {
    try {
        const shops = await Shop.find().populate('owner')
        res.json(shops)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

const getOneShop = async (req, res) => {
    try {
        const shop = await Shop.findById(req.params.id).populate('owner')
        res.json(shop)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

const createShop = async (req, res) => {
    try {
        const { shopName, owner } = req.body

        const foundOwner = await User.findById(owner)
        if (!foundOwner) return res.status(404).json({ message: 'Owner not found' })

        const shop = await Shop.create({ shopName, owner })
        const updatedOwner = await User.findByIdAndUpdate(owner, { shop: shop._id }, { new: true });
        res.json({ shop, updatedOwner })
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}


const updateShop = async (req, res) => {
    try {
        const { shopName, owner } = req.body
        const shop = await Shop.findByIdAndUpdate(req.params.id, { shopName, owner })
        const oldOwner = await User.findById(shop.owner)
        await User.findByIdAndUpdate(oldOwner._id, { shop: null }, { new: true });
        await User.findByIdAndUpdate(owner, { shop: shop._id }, { new: true });
        res.json(shop)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

const deleteShop = async (req, res) => {
    try {
        const shop = await Shop.findByIdAndDelete(req.params.id)
        await User.findByIdAndUpdate(shop.owner, { shop: null }, { new: true });
        res.json({ shop })
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

const updateShopName = async (req, res) => {
    try {
        const { shopName } = req.body
        console.log(req.user)
        console.log(shopName)
        const shop = await Shop.findByIdAndUpdate(req.user.shop, { shopName })
        res.json(shop)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}


async function topUpBalance(req, res) {
    const { amount, storeId } = req.body;
    if (!amount || amount <= 0) {
        return res.status(400).json({ message: 'Miqdor musbat bo‘lishi kerak' });
    }

    // upsert: agar avval mavjud bo‘lmasa, yangi yozuv yaratadi
    const updated = await SmsBalance.findOneAndUpdate(
        { storeId: new mongoose.Types.ObjectId(storeId) },
        {
            $inc: { balance: amount },
            $set: { lastTopUpAt: new Date() },
        },
        {
            upsert: true,
            returnDocument: 'after',
        }
    );

    return res.json({ balance: updated.balance, storeId });
}

async function getBalancesByAdmin(req, res) {
    const docs = await SmsBalance.find();
    res.json(docs);
}

async function getBalanceInProvider(req, res) {
    try {
        const doc = await getTotalBalanceInProvider();
        return res.json(doc);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

async function getBalance(req, res) {
    const storeId = req.user.shop
    const doc = await SmsBalance.findOne({ storeId: storeId });
    if (!doc) return res.status(404).json({ message: 'Balance not found' });
    return res.json(doc);
}

module.exports = {
    getAllShops,
    createShop,
    updateShop,
    deleteShop,
    getOneShop,
    updateShopName,
    topUpBalance,
    getBalanceInProvider,
    getBalance,
    getBalancesByAdmin
}

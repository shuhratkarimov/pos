const cron = require('node-cron');
const Debt = require('../schema/debt.schema');
const Shop = require('../schema/shop.schema');
const UserSettings = require('../schema/settings.schema');
const { safeSendSms } = require('../services/smsService');
const mongoose = require('mongoose');
const TIMEZONE = 'Asia/Tashkent';

function formatMoney(amount) {
    return amount
        .toString()
        .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

async function buildOwnerSettingsMap(shopIds) {
    if (!shopIds.length) return {};

    const shops = await Shop.find({ _id: { $in: shopIds } })
        .select('_id owner')
        .lean();

    const shopOwnerMap = {};
    const ownerIds = [];

    for (const shop of shops) {
        if (shop.owner) {
            shopOwnerMap[shop._id.toString()] = shop.owner.toString();
            ownerIds.push(shop.owner);
        }
    }

    const settingsList = await UserSettings.find({
        user: { $in: ownerIds }
    }).lean();

    const settingsMap = {};
    for (const s of settingsList) {
        settingsMap[s.user.toString()] = s;
    }

    return { shopOwnerMap, settingsMap };
}

cron.schedule('00 8 * * *', async () => {
    try {
        console.log('[CRON] Due date SMS boshlandi →', new Date().toLocaleString('uz-UZ'));

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todayEnd = new Date(todayStart);
        todayEnd.setHours(23, 59, 59, 999);

        const debts = await Debt.find({
            status: 'pending',
            dueDate: { $gte: todayStart, $lte: todayEnd }
        })
            .select('customerName amount dueDate phoneNumber shop').populate({
                path: 'shop',
                select: 'shopName owner',
                populate: {
                    path: 'owner',
                    select: 'phoneNumber'
                }
            })
            .lean();

        if (!debts.length) {
            console.log('[CRON] Bugun muddati kelgan qarz yo‘q');
            return;
        }

        const shopIds = [...new Set(debts.map(d => d.shop?._id?.toString()).filter(Boolean))];
        const { shopOwnerMap, settingsMap } = await buildOwnerSettingsMap(shopIds);

        let sentCount = 0;

        for (const debt of debts) {
            const ownerId = shopOwnerMap[debt.shop?._id?.toString()];
            const settings = settingsMap[ownerId];

            if (!settings || !settings.autoSmsOnDueDate) continue;

            const shopName = debt.shop?.shopName || 'Do‘kon';
            const phone = debt.shop?.owner?.phoneNumber || '';

            const message = `Assalomu alaykum! Bugun ${shopName} do'konidagi ${formatMoney(debt.amount)} so'm qarzingizni to'lashingiz kerak. Iltimos qarzingizni qaytaring. Tel: ${phone}.`;

            try {
                const storeId = debt.shop?._id; // populate qilingan obyektdan ObjectId
                if (!mongoose.isValidObjectId(storeId)) {
                    console.error('Noto‘g‘ri storeId:', storeId);
                    continue;
                }

                await safeSendSms(debt.shop?._id.toString(), debt.phoneNumber, message); sentCount++;
            } catch (err) {
                console.error(`SMS xatosi → ${debt.phoneNumber}`, err);
            }
        }

        console.log(`[CRON] Due date SMS tugadi. Yuborildi: ${sentCount} ta`);
    } catch (err) {
        console.error('[CRON DueDate] Xato:', err);
    }
}, { timezone: TIMEZONE });

cron.schedule('00 8 * * *', async () => {
    try {
        console.log('[CRON] Overdue SMS boshlandi →', new Date().toLocaleString('uz-UZ'));

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const debts = await Debt.find({
            status: 'pending',
            dueDate: { $lt: today }
        })
            .populate({
                path: 'shop',
                select: 'shopName owner',
                populate: {
                    path: 'owner',
                    select: 'phoneNumber'
                }
            })
            .lean();

        if (!debts.length) {
            console.log('[CRON] Muddati o‘tgan qarz yo‘q');
            return;
        }

        const shopIds = [...new Set(debts.map(d => d.shop?._id?.toString()).filter(Boolean))];
        const { shopOwnerMap, settingsMap } = await buildOwnerSettingsMap(shopIds);

        let sentCount = 0;

        for (const debt of debts) {
            const shopId = debt.shop?._id;
            if (!shopId || !mongoose.isValidObjectId(shopId)) continue;

            const ownerId = shopOwnerMap[shopId.toString()];
            const settings = settingsMap[ownerId];
            if (!settings || !settings.autoSmsOverdue) continue;

            const shopName = debt.shop?.shopName || 'Do‘kon';
            const ownerPhone = debt.shop?.owner?.phoneNumber || '';

            const message = `Assalomu alaykum! Sizning ${shopName} do'konidagi ${formatMoney(debt.amount)} so'm qarzingizni to'lash muddati o'tib ketdi. Iltimos do'konga uchrashing! Tel: ${ownerPhone}.`;

            try {
                await safeSendSms(debt.shop?._id.toString(), debt.phoneNumber, message); sentCount++;
            } catch (err) {
                console.error(`Overdue SMS xatosi → ${debt.phoneNumber}`, err);
            }
        }

        console.log(`[CRON] Overdue SMS yakunlandi. Yuborildi: ${sentCount} ta`);
    } catch (err) {
        console.error('[CRON Overdue] Xato:', err);
    }
}, { timezone: TIMEZONE });

console.log('Cron jobs sozlandi: 08:00 da DueDate va Overdue SMS lar');
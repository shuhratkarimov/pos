const mongoose = require('mongoose');
const SmsBalance = require('../schema/smsBalance.schema');
const SmsLog = require('../schema/smsLog.schema');
const { sendSMS } = require('../providers/devsms');

const SMS_COST = 200;

async function safeSendSms(storeId, phone, message) {
  if (!mongoose.isValidObjectId(storeId)) {
    throw new Error('Noto‘g‘ri storeId formatida');
  }

  const updated = await SmsBalance.findOneAndUpdate(
    {
      storeId: storeId,
      balance: { $gte: SMS_COST },
    },
    {
      $inc: { balance: -SMS_COST },
      $set: { lastSmsSentAt: new Date() },
    },
    { new: true }
  );

  if (!updated) {
    await SmsLog.create({
      storeId: storeId,
      phone,
      message,
      amount: SMS_COST,
      status: 'blocked',
      providerResponse: { reason: 'INSUFFICIENT_BALANCE' },
    });

    return {
      success: false,
      reason: 'INSUFFICIENT_BALANCE',
      balanceLeft: 0,
    };
  }

  const sendResult = await sendSMS(phone, message);

  const log = await SmsLog.create({
    storeId: storeId,
    phone,
    message,
    amount: SMS_COST,
    status: sendResult.success ? 'sent' : 'failed',
    providerResponse: sendResult.response || sendResult.error || sendResult,
  });

  if (!sendResult.success) {
    await SmsBalance.findOneAndUpdate(
      { storeId: storeId },
      { $inc: { balance: SMS_COST } }
    );
  }

  return {
    success: sendResult.success,
    balanceAfter: updated.balance,
    messageId: sendResult.messageId || null,
    logId: log._id?.toString(),
    error: sendResult.error || null,
  };
}

module.exports = { safeSendSms };
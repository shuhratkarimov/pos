// models/SmsBalance.js
const mongoose = require('mongoose');

const smsBalanceSchema = new mongoose.Schema({
  storeId: {                        // yoki userId — sizga qaysi qulay bo‘lsa
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Shop'
  },
  balance: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  lastTopUpAt: Date,
  lastSmsSentAt: Date,
}, {
  timestamps: true,
});

smsBalanceSchema.index({ storeId: 1 });  // har bir store uchun bitta yozuv

module.exports = mongoose.model('SmsBalance', smsBalanceSchema);
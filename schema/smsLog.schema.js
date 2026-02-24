// models/SmsLog.js
const mongoose = require('mongoose');

const smsLogSchema = new mongoose.Schema({
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    default: 200,
  },
  status: {
    type: String,
    enum: ['sent', 'failed', 'blocked'],
    required: true,
  },
  providerResponse: mongoose.Schema.Types.Mixed,
  sentAt: { type: Date, default: Date.now },
}
);

module.exports = mongoose.model('SmsLog', smsLogSchema);
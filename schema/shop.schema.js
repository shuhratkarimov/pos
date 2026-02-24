const mongoose = require('mongoose');

const ShopSchema = new mongoose.Schema({
  shopName: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

module.exports = mongoose.model('Shop', ShopSchema);

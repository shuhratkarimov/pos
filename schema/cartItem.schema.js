const mongoose = require("mongoose");

const CartItemSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  measure: { type: String, required: true },
  subtotal: { type: Number, required: true },
}, { _id: false });

module.exports = CartItemSchema;
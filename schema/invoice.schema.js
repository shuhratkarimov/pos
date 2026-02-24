const mongoose = require("mongoose");
const CartItemSchema = require("./cartItem.schema"); // schema import qilinadi

const InvoiceSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  items: { type: [CartItemSchema], required: true }, // array ichida schema
  subtotal: { type: Number, required: true },
  total: { type: Number, required: true },
  profit: { type: Number, required: false, default: 0 },
  paymentMethod: { type: String, enum: ["naqd", "bank", "transfer", "qarz"], required: true },
  shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop' },
}, { timestamps: true });

InvoiceSchema.index({ shop: 1 });

module.exports = mongoose.model("Invoice", InvoiceSchema);

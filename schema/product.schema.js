const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const productSchema = new Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    code: { type: String, required: true },
    stock: { type: Number, required: true },
    measure: { type: String, required: true },
    boughtPrice: { type: Number, required: false, default: 0 },
    shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop' },
},
    {
        timestamps: true,
        versionKey: false
    });

productSchema.index({ shop: 1 });

const Product = mongoose.model("Product", productSchema);
module.exports = Product;


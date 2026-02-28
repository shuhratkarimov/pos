const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const debtSchema = new Schema({
    customerName: { type: String, required: true },
    amount: { type: Number, required: true },
    date: { type: String, required: true },
    dueDate: { type: Date, required: true },
    status: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop' },
},
    {
        timestamps: true,
        versionKey: false
    });

debtSchema.index({ shop: 1 });
debtSchema.index({ customerName: 1 });

const Debt = mongoose.model("Debt", debtSchema);
module.exports = Debt;
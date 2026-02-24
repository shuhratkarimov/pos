const Invoice = require("../schema/invoice.schema");
const Product = require("../schema/product.schema");
const mongoose = require("mongoose");

async function getAllInvoices(req, res) {
  try {
    const shop = req.user.shop;
    const invoices = await Invoice.find({ shop });
    res.status(200).json(invoices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function createInvoice(req, res) {
  try {
    const shop = req.user.shop;
    const invoiceData = req.body;
    let totalProfit = 0;

    for (const item of invoiceData.items) {
      const productId = item.id.includes("-custom")
        ? item.id.split("-custom")[0]
        : item.id;

      const product = await Product.findById(productId);

      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Mahsulot topilmadi: ${item.name}`
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Omborda yetarli mahsulot yo'q: ${product.name}`
        });
      }

      product.stock = Number((product.stock - item.quantity).toFixed(3));
      if (product.boughtPrice && product.boughtPrice > 0) {
        totalProfit += (item.price - product.boughtPrice) * item.quantity;
      }

      await product.save();
    }

    const invoice = await Invoice.create({
      ...invoiceData,
      profit: totalProfit,
      shop
    });

    res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    console.error("Invoice create error:", error);
    res.status(500).json({
      success: false,
      message: "Sotuvda xatolik"
    });
  }
}

async function updateInvoice(req, res) {
  try {
    const invoice = await Invoice.findOneAndUpdate({shop: req.user.shop, _id: req.params.id}, req.body, {new: true});
    res.status(200).json(invoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function deleteInvoice(req, res) {
  try {
    const invoice = await Invoice.findOneAndDelete({shop: req.user.shop, _id: req.params.id});
    res.status(200).json(invoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

module.exports = {
  getAllInvoices,
  createInvoice,
  updateInvoice,
  deleteInvoice
}

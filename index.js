require("dotenv").config();
const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const cors = require("cors");
const connectDB = require("./db/mongo");
const cookieParser = require("cookie-parser");

app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));


app.use("/api/products", require("./router/product.routes"));
app.use("/api/debts", require("./router/debt.routes"));
app.use("/api/invoices", require("./router/invoice.routes"));
app.use("/api/reports", require("./router/report.routes"));
app.use("/api/auth", require("./router/auth.routes"));
app.use("/api/user", require("./router/user.routes"));
app.use("/api/shop", require("./router/shop.routes"));
require("./services/cron-jobs");
connectDB();
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
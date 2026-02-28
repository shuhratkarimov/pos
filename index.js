require("dotenv").config();
const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const cors = require("cors");
const connectDB = require("./db/mongo");
const cookieParser = require("cookie-parser");
const errorHandler = require("./middleware/errorHandler");
const BaseError = require("./utils/BaseError");

app.use(express.json({limit:'100mb'}));
app.use(cookieParser());
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
console.log("CI-CD ishladi!")

app.use("/api/products", require("./router/product.routes"));
app.use("/api/debts", require("./router/debt.routes"));
app.use("/api/invoices", require("./router/invoice.routes"));
app.use("/api/reports", require("./router/report.routes"));
app.use("/api/auth", require("./router/auth.routes"));
app.use("/api/user", require("./router/user.routes"));
app.use("/api/shop", require("./router/shop.routes"));
require("./services/cron-jobs");
app.all(/.*/, (req, res, next) => {
  next(BaseError.BadRequest(404, `Can't find ${req.originalUrl}`));
}); 
app.use(errorHandler);
process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION 💥", err);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION 💥", err);
  process.exit(1);
});
connectDB();
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
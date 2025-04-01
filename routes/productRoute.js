import express from "express";
const productRouter = express.Router();
import productController from "../controllers/productController.js";
import limiter from "../middleware/rateLimiter.js";  // ✅ Apply rate limiting middleware

// ✅ Apply rate limiting middleware to the scrape route
productRouter.get("/scrape", limiter, productController.scrapeMeeshoProducts);
productRouter.get("/convert", productController.scrapeDataToExcel);

export default productRouter;
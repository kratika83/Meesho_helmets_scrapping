import express from "express";

import dotenv from "dotenv";
dotenv.config();

import connect from "./config/db.js";
connect();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

import productRouter from "./routes/productRoute.js";
app.use("/api/products", productRouter);

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

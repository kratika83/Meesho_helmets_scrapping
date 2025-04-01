import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
    {
        title: String,
        price: String,
        image: String,
        category: String,
        rating: Number,
        productUrl: String,
        scrapedAt: { type: Date, default: Date.now }
    },
    {
        versionKey: false,
        timestamps: true,
        collection: 'Products'
    }
);

const productModel = mongoose.model("productSchema", productSchema);

export default productModel;

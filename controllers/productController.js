import axios from "axios";
import productModel from "../models/productModel.js";
import { getNextProxy } from "../config/proxy.js";
import fs from "fs";
import xlsx from "xlsx";
import path from "path";

const BASE_URL = "https://www.meesho.com/api/v1/products/search";
const JSON_FILE = "./helmets.json";
const EXCEL_FILE = "./helmets.xlsx";

// Function to safely load and validate JSON data
const loadJsonData = (JSON_FILE) => {
    try {
        if (!fs.existsSync(JSON_FILE)) {
            console.error("JSON file not found.");
            return [];
        }

        const rawData = fs.readFileSync(JSON_FILE, "utf-8");
        const jsonData = JSON.parse(rawData);

        // ✅ Check for "catalog" array
        if (!jsonData.catalogs || !Array.isArray(jsonData.catalogs) || jsonData.catalogs.length === 0) {
            console.error("No valid data found in 'catalogs'.");
            return [];
        }

        return Array.isArray(jsonData.catalogs)?jsonData.catalogs:[];  // Return the catalog array
    } catch (error) {
        console.error("Failed to load or parse JSON:", error.message);
        return [];
    }
};

const scrapeMeeshoProducts = async (req, res) => {
    const { page_id = "9bu", limit = 20 } = req.query;
    let page = 1;
    let offset = 0;
    let allProducts = [];
    console.log("🚀 Starting to scrape Meesho API...");

    try {
        while (true) {
            console.log(`🔍 Fetching page ${page}...`);

            const payload = {
                page_id,
                page: page,
                offset: offset,
                limit: limit,
                cursor: page === 1 ? null : undefined,
                isNewPlpFlowEnabled: true,
                isDevicePhone: false
            };

            let retries = 3;
            let success = false;

            while (retries > 0 && !success) {
                try {

                  const response = await axios.post(BASE_URL, payload, {
                      headers: {
                        "Content-Type": "application/json",
                        "Referer": "https://www.meesho.com",
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                        "Cookie": "user_session=your-session-cookie;" // Add real cookies here
                      }
                  });

                       if (response.status === 200 && response.data?.catalogs) {
                          const products = response.data.catalogs;
                           if (products.length === 0) {
                              console.log("✅ No more products found. Stopping...");
                              success = true;
                              break;  // Exit loop if no products are returned
                           }

                           allProducts.push(...products);           
                           success = true;           
                           console.log(`✅ Added ${products.length} products. Total: ${allProducts.length}`);
                       }

                } catch (error) {
                       console.error(`❌ Error on attempt ${4 - retries}: ${error.message}`);
                       retries--;
                       await new Promise(resolve => setTimeout(resolve, 2000));  // Delay between retries
                }
            }

            if (!success) {
               console.log(`⚠️ Skipping Page ${page} after retries failed`);
               break;
            }
            page++;
            offset += limit;  // Move to the next set
        }
        fs.writeFileSync(JSON_FILE, JSON.stringify(allProducts, null, 2));
        console.log(`✅ Data saved to ${JSON_FILE}`);
        res.status(200).json({
            message: `${allProducts.length} products scraped successfully`,
            data: allProducts
        });
    } catch (error) {
                       console.error("❌ Error scraping:", error.message);
                       res.status(500).json({ error: "Failed to scrape Meesho" });
    }
};

const convertToExcel = (data) => {
    if (!Array.isArray(data) || data.length === 0) {
        console.error("No data to convert.");
        return false;
    }

    const workbook = xlsx.utils.book_new();

    //Flatten the JSON data before conversion
    // const flattenedData = data.map(item => ({
    //     ...item,
    //     tags: item.tags ? item.tags.map(tag => tag.name).join(", ") : "",
    //     product_images: item.product_images ? item.product_images.map(img => img.url).join(", ") : "",

    //     // ✅ Flatten supplier_reviews_summary
    //     average_rating: item.supplier_reviews_summary?.average_rating || "",
    //     absolute_average_rating: item.supplier_reviews_summary?.absolute_average_rating || "",
    //     average_rating_str: item.supplier_reviews_summary?.average_rating_str || "",
    //     rating_scale: item.supplier_reviews_summary?.rating_scale || "",
    //     review_count: item.supplier_reviews_summary?.review_count || "",
    //     rating_count: item.supplier_reviews_summary?.rating_count || ""
    // }));

    // ✅ Recursive flattening function to handle all nested objects
    const flattenObject = (obj, parentKey = '', result = {}) => {
       for (const key in obj) {
        if (Object.hasOwnProperty.call(obj, key)) {
            const newKey = parentKey ? `${parentKey}_${key}` : key;

            if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                // Recursively flatten nested objects
                flattenObject(obj[key], newKey, result);
            } else {
                result[newKey] = obj[key] ?? "";  // Include empty string for missing values
            }
        }
      }
      return result;
    };

    // 🔥 Recursively flatten all objects to capture every field
    const flattenedData = data.map(item => flattenObject(item));

    const headers = Object.keys(flattenedData[0]);
    const rows = flattenedData.map(item => headers.map(header => item[header]));

    // Add headers as the first row
    const worksheet = xlsx.utils.aoa_to_sheet([headers, ...rows]);
    xlsx.utils.book_append_sheet(workbook, worksheet, "Helmets");

    // Write Excel file
    xlsx.writeFile(workbook, EXCEL_FILE);
    console.log(`✅ Excel file created: ${EXCEL_FILE}`);
    return true;
};

const scrapeDataToExcel = async (req, res) => {
    const jsonFilePath = path.resolve("./helmet.json");
    const jsonData = loadJsonData(jsonFilePath);
    if (jsonData.length === 0) {
        return res.status(400).send("No data available to convert.");
    }

    const excelFileName = EXCEL_FILE;
    const excelFilePath = path.resolve(`./${excelFileName}`);
    // Convert only if data is available
    const isExcelCreated = convertToExcel(jsonData);

    if (!isExcelCreated) {
        return res.status(500).send("Failed to create Excel file.");
    }

    if (fs.existsSync(excelFilePath)) {
        console.log(`📥 Sending file: ${excelFilePath}`);
        res.download(excelFilePath, (err) => {
            if (err) {
                console.error("Error downloading the Excel file:", err);
                res.status(500).send("Failed to download Excel file.");
            }
        });
    } else {
        console.error("Excel file not found.");
        res.status(500).send("Excel file not found.");
    }
};

let productController = {
    scrapeMeeshoProducts: scrapeMeeshoProducts,
    scrapeDataToExcel: scrapeDataToExcel
}

export default productController;
import rateLimit from "express-rate-limit";

// ✅ Apply rate limiting to avoid rate limiting bans
const limiter = rateLimit({
    windowMs: 60 * 1000,     // 1 minute window
    max: 30,                  // 30 requests per minute per IP
    message: "Too many requests, please try again later."
});

export default limiter;
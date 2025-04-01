import proxyAgentPkg from "https-proxy-agent";
const { HttpsProxyAgent } = proxyAgentPkg;
import dotenv from "dotenv";
dotenv.config();

const proxies = process.env.PROXIES.split(",").map(proxy => proxy.trim());
let currentProxyIndex = 0;

export const getNextProxy = () => {
    const proxyUrl = proxies[currentProxyIndex];
    currentProxyIndex = (currentProxyIndex + 1) % proxies.length;
    console.log(`🌐 Using Proxy: ${proxyUrl}`);
    return proxyUrl;
};
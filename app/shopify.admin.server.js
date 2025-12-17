import { shopifyApi, ApiVersion } from "@shopify/shopify-api";
import "@shopify/shopify-api/adapters/node";

export const adminApi = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,

  /* ✅ REQUIRED */
  apiVersion: ApiVersion.October25,

  /* ✅ REQUIRED FOR APP PROXY */
  hostName: process.env.SHOPIFY_APP_URL
    .replace("https://", "")
    .replace("http://", ""),

  isEmbeddedApp: true,
});

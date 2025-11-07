import dotenv from "dotenv";
import { runBulkOperation } from "./utils_bulk.js";

dotenv.config();
const { SHOPIFY_STORE: SHOP, SHOPIFY_ADMIN_TOKEN: TOKEN } = process.env;
const LOCALE = "zh-TW"; // 或 ja-JP

const QUERY = `
{
  translatableResources(first: 1000, resourceType: PRODUCT) {
    edges {
      node {
        resourceId
        translations(locale: "${LOCALE}") {
          key
          value
          locale
        }
      }
    }
  }
}
`;

runBulkOperation(SHOP, TOKEN, QUERY, `bulk_products_translations_${LOCALE}`, {
  pollIntervalMs: 5000,
  showProgress: true,
});

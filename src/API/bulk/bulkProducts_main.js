import dotenv from "dotenv";
import { runBulkOperation } from "./utils_bulk.js";

dotenv.config();
const { SHOPIFY_STORE: SHOP, SHOPIFY_ADMIN_TOKEN: TOKEN } = process.env;

const QUERY = `
{
  products {
    edges {
      node {
        id
        handle
        title
        descriptionHtml
        vendor
        productType
        tags
        templateSuffix
        status
        seo { title description }
        images(first: 250) {
          edges {
            node {
              id
              altText
              url
            }
          }
        }
      }
    }
  }
}
`;

runBulkOperation(SHOP, TOKEN, QUERY, "bulk_products_main", {
  pollIntervalMs: 5000,
  showProgress: true,
  productsOnly: true, // 產出 bulk_products_main.products_only.json
});

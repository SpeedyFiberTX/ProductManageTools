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
        variants {
          edges {
            node {
              id
              title
              sku
              price
              selectedOptions { name value }
              inventoryItem { id tracked }
            }
          }
        }
      }
    }
  }
}
`;

runBulkOperation(SHOP, TOKEN, QUERY, "bulk_products_variants", {
  pollIntervalMs: 5000,
  showProgress: true,
});

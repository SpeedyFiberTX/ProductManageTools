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
        collections(first: 20) {
          edges {
            node {
              id
              title
              handle
            }
          }
        }
      }
    }
  }
}
`;

runBulkOperation(SHOP, TOKEN, QUERY, "bulk_products_collections", {
  pollIntervalMs: 5000,
  showProgress: true,
});

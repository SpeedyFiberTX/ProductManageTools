import dotenv from "dotenv";
import { GraphQLClient, gql } from "graphql-request";
import fs from "fs";
import path from "path";

dotenv.config();

const SHOP = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const graphqlEndpoint = `https://${SHOP}/admin/api/2025-07/graphql.json`;

const client = new GraphQLClient(graphqlEndpoint, {
  headers: {
    "X-Shopify-Access-Token": TOKEN,
    "Content-Type": "application/json",
  },
});

export default async function getAllProductsToJSON() {
  const query = gql`
    query getAllProducts($cursor: String) {
      products(first: 250, after: $cursor) {
        edges {
          node {
            id
            title
            handle
            description
            productType
            status
            vendor
            seo {
              title
              description
            }
            collections(first: 5) {
              edges {
                node {
                  id
                  title
                }
              }
            }
            options {
              id
              name
              position
              optionValues {
                id
                name
              }
            }
            variants(first: 100) {
              nodes {
                id
                title
                sku
                price
                inventoryItem {
                  id
                  tracked
                }
              }
            }
            metafields(first: 10) {
              edges {
                node {
                  namespace
                  key
                  type
                  value
                }
              }
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;

  let cursor = null;
  let hasNextPage = true;
  const allProducts = [];

  try {
    while (hasNextPage) {
      const variables = { cursor };
      const res = await client.request(query, variables);
      const { edges, pageInfo } = res.products;

      const products = edges.map((edge) => edge.node);
      allProducts.push(...products);

      hasNextPage = pageInfo.hasNextPage;
      cursor = pageInfo.endCursor;

      console.log(`✅ 已抓取 ${allProducts.length} 筆產品（繼續抓取中...）`);
    }

    console.log("🎯 全部抓取完成！");
    console.log("總筆數：", allProducts.length);

    // 建立輸出資料夾
    const outputDir = path.resolve("./output");
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    // 輸出 JSON 檔案
    const filePath = path.join(outputDir, "all_products.json");
    fs.writeFileSync(filePath, JSON.stringify(allProducts, null, 2), "utf-8");

    console.log(`💾 已輸出 JSON 檔案：${filePath}`);
    return allProducts;
  } catch (error) {
    console.error("❌ 抓取產品失敗：", error.response?.errors || error.message);
    return [];
  }
}

// 若直接執行此檔案
getAllProductsToJSON();

import dotenv from 'dotenv';
import { GraphQLClient, gql } from 'graphql-request'; //處理GraphQL

dotenv.config();

const SHOP = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const graphqlEndpoint = `https://${SHOP}/admin/api/2025-07/graphql.json`;
const client = new GraphQLClient(graphqlEndpoint, {
  headers: {
    'X-Shopify-Access-Token': TOKEN,
    'Content-Type': 'application/json',
  }
});

export default async function getProductDataByHandle(handle) {
  // console.log("查詢 Handle：", handle);

  const query = gql`
    query productByHandle($handle: String!){
  productByHandle(handle: $handle) {
    id
    title
    productType
    description
    vendor
    collections(first: 10) {
      edges {
        node {
          id
          title
        }
      }
    }
    options{
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
        inventoryItem{
        id
        }
      }
    }
  }
}`;

  const variables = {
    handle: handle
  }


  try {
    const res = await client.request(query, variables);
    const productDataFromShopify = res.productByHandle;
    if (productDataFromShopify) {
      // console.log(`✅ 取得產品`,productDataFromShopify );
      return productDataFromShopify;
    } else {
      console.warn(`⚠️ 查無產品：「${handle}」`);
      return null;
    }

  } catch (error) {
    console.error(`❌ 查詢產品錯誤：「${handle}」`, error.response?.errors || error.message);
    return null;
  }
}
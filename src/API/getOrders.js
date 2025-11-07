import dotenv from 'dotenv';
import { GraphQLClient, gql } from 'graphql-request'; //處理GraphQL

dotenv.config();

const SHOP = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ORDER_ADMIN_TOKEN;
const graphqlEndpoint = `https://${SHOP}/admin/api/2025-07/graphql.json`;
const client = new GraphQLClient(graphqlEndpoint, {
  headers: {
    'X-Shopify-Access-Token': TOKEN,
    'Content-Type': 'application/json',
  }
});

export default async function getOrders() {

  const query = gql`
    query {
  orders(first: 10) {
    edges {
      cursor
      node {
        id
      }
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
  }
}`;


  try {
    const res = await client.request(query);
    const orders = res.orders.edges;
    if (orders) {
      console.log(`✅ 取得訂單`, orders);
    //   return orders;
    } else {
      console.warn(`⚠️ 查無訂單`);
      return null;
    }

  } catch (error) {
    console.error(`❌ 查詢訂單錯誤`, error.response?.errors || error.message);
    return null;
  }
}

getOrders()
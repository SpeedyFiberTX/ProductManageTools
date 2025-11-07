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

export default async function getTranslatableResourcesByIds(resourceIds) {
  const query = gql`query {
  translatableResourcesByIds(first: 100, resourceIds: ["${resourceIds}"]) {
    edges {
      node {
        resourceId
        translatableContent {
          key
          value
          digest
          locale
        }
      }
    }
  }
}`;

  try {
    const res = await client.request(query);
    const translatableContent = res.translatableResourcesByIds.edges.map(e => e.node);
    if (translatableContent.length > 0) {
      // console.log(translatableContent[0].translatableContent);
      return translatableContent;
    } else {
      console.warn(`⚠️ 資源無翻譯欄位  ：「${resourceIds}」`);
      return null;
    }
  } catch (error) {
    console.error(`❌ 查詢翻譯欄位錯誤：「${resourceIds}」`, error.response?.data || error.message);
    return null;
  }
}
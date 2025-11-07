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

export default async function getCollectionIdByTitle(title) {
    const query = gql`
      query($title: String!) {
        collections(first: 1, query: $title) {
          edges {
            node {
              id
              title
            }
          }
        }
      }`;

    const variables = {
        title: `title:${title}`,
    };

    try {
        const res = await client.request(query, variables);
        const collections = res.collections.edges;
        if (collections.length > 0) {
            return collections[0].node.id;
        } else {
            console.warn(`⚠️ 查無 Collection：「${title}」`);
            return null;
        }
    } catch (error) {
        console.error(`❌ 查詢 Collection 錯誤：「${title}」`, error.response?.data || error.message);
        return null;
    }
}
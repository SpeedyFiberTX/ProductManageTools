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

export default async function getLocales() {

    const query = gql`{
  locations(first: 10) {
    nodes {
      id
      name
      address {
        address1
        city
        country
      }
    }
  }
}`;

    try {
        const res = await client.request(query);
        const availableLocales = res.locations.nodes;
        if (availableLocales) {
            console.log(`✅ 取得倉庫`, availableLocales);
            return availableLocales;
        } else {
            console.warn(`⚠️ 查無倉庫`);
            return null;
        }

    } catch (error) {
        console.error(`❌ 查詢倉庫`, error.response?.errors || error.message);
        return null;
    }
}
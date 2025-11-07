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

export default async function getProductMetafields(productID) {
    const query = gql`
      query ProductMetafields($ownerId: ID!) {
  product(id: $ownerId) {
    metafields(first: 100) {
      edges {
        node {
          namespace
          key
          value
          id
        }
      }
    }
  }
}`;

    const variables = {
        "ownerId": productID
    };

    try {
        const res = await client.request(query, variables);
        const metafields = res.product.metafields.edges.map(e => e.node);
        if (metafields.length > 0) {
            return metafields;
        } else {
            console.warn(`⚠️ 本產品無 Metafields ：「${productID}」`);
            return null;
        }
    } catch (error) {
        console.error(`❌ 查詢產品錯誤：「${productID}」`, error.response?.data || error.message);
        return null;
    }
}
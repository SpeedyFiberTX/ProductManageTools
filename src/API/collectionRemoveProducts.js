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

export default async function collectionRemoveProducts(productId, collectionIds) {
    const mutation = gql`mutation collectionRemoveProducts($id: ID!, $productIds: [ID!]!) {
  collectionRemoveProducts(id: $id, productIds: $productIds) {
    job {
      done
      id
    }
    userErrors {
      field
      message
    }
  }
}`;

    for (const id of collectionIds) {
        try {
            const variables = {
                id,
                productIds: [productId]
            };

            const res = await client.request(mutation, variables);
            const errors = res.collectionRemoveProducts.userErrors;

            if (errors.length > 0) {
                console.warn(`⚠️ 移除 Collection ${id} 時發生錯誤：`);
                errors.forEach(err => console.warn(`• ${err.field?.join('.') || 'unknown'}: ${err.message}`));
            } else {
                console.log(`✅ 已移除 Collection ${id}`);
            }
        } catch (error) {
            console.error(`❌ 移除 Collection 錯誤（${id}）：`, error.response?.data || error.message);
        }
    }
}
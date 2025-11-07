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

export default async function collectionAddProducts(productId, collectionIds) {
    const mutation = gql`
      mutation AddProductToCollection($id: ID!, $productIds: [ID!]!) {
        collectionAddProducts(id: $id, productIds: $productIds) {
          userErrors {
            field
            message
          }
        }
      }`;

    for (const id of collectionIds) {
        try {
            const variables = {
                id, // 正確的 collection id 傳給 id，而不是 collectionId
                productIds: [productId]
            };

            const res = await client.request(mutation, variables);
            const errors = res.collectionAddProducts.userErrors;

            if (errors.length > 0) {
                console.warn(`⚠️ 加入 Collection ${id} 時發生錯誤：`);
                errors.forEach(err => console.warn(`• ${err.field?.join('.') || 'unknown'}: ${err.message}`));
            } else {
                console.log(`✅ 已加入Collection ${id}`);
            }
        } catch (error) {
            console.error(`❌ 加入Collection錯誤（${id}）：`, error.response?.data || error.message);
        }
    }
}
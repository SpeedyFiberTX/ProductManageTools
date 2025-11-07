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

export default async function activateInventoryLevel(inventoryItemId, locationId, initQty = 0) {
  const mutation = `
    mutation {
      inventoryActivate(
        inventoryItemId: "${inventoryItemId}"
        locationId: "${locationId}"
        available: ${initQty}
      ) {
        inventoryLevel {
          id
          quantities(names: ["available"]) {
            name
            quantity
          }
          item {
            id
          }
          location {
            id
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;


  

  try {
    const res = await client.request(mutation);
    const result = res.inventoryActivate;
    if (!result) {
      console.error('❌ 沒有回傳 inventoryActivate 結果：');
      console.dir(res.data, { depth: null });
      throw new Error('inventoryActivate 回傳為 undefined');
    }

    if (result.userErrors?.length) {
      const msg = result.userErrors.map(e => `${e.field?.join('.') || ''}: ${e.message}`).join(', ');
      throw new Error(`inventoryActivate userErrors: ${msg}`);
    }

    return result.inventoryLevel;
  } catch (err) {
    console.error(`❌ activateInventoryLevel 發生錯誤（item=${inventoryItemId}, location=${locationId}）: ${err.message}`);
    throw err;
  }
}
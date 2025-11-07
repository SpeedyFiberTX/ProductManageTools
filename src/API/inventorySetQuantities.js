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

import activateInventoryLevel from './activateInventoryLevel.js';

export default async function inventorySetQuantities(quantities) {
    const mutation = gql`mutation InventorySet($input: InventorySetQuantitiesInput!) {
  inventorySetQuantities(input: $input) {
    inventoryAdjustmentGroup {
      createdAt
      reason
      referenceDocumentUri
      changes {
        name
        delta
      }
    }
    userErrors {
      field
      message
    }
  }
}`;

    const variables = {
        "input": {
            "name": "available",
            "reason": "correction",
            "quantities": quantities,
            "ignoreCompareQuantity": true,
        }
    };

    try {
        let res = await client.request(mutation, variables);
        let { inventoryAdjustmentGroup, userErrors } = res.inventorySetQuantities;

        let firstTimeSetInventory =[];

        // 檢查是否有錯誤
        if (userErrors.length > 0) {

            for (const error of userErrors) { //所有錯誤依序拆解
                const field = error.field?.join('.') || 'unknown';
                const message = error.message;
                // 如果錯誤是 "inventory item is not stocked at the location"
                const match = field.match(/input\.quantities\.(\d+)\.locationId/);
                if (match && message.includes('not stocked at the location')) {
                    const index = parseInt(match[1]);
                    const q = quantities[index];
                    console.log(`🛠️ 執行首次庫存設定 (${q.inventoryItemId}, ${q.locationId})`);

                    // 執行 activate
                    const activateInventoryLevel_res = await activateInventoryLevel(q.inventoryItemId, q.locationId, q.quantity);
                    firstTimeSetInventory.push(activateInventoryLevel_res);
                } else {
                    console.warn(`⚠️ Shopify 回傳 userErrors：`);
                    console.warn(`• ${field}: ${message}`);
                }
            }
        }

        if (inventoryAdjustmentGroup) {
            return inventoryAdjustmentGroup
        } else if (firstTimeSetInventory.length > 0) {
            return firstTimeSetInventory
        } else {
            return null
        }

    } catch (error) {
        console.error(`❌ 執行 inventorySetQuantities 發生錯誤：`, error.response?.data || error.message);
        return null;
    }
}
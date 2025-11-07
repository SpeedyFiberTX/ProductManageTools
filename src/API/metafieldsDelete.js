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

export default async function metafieldsDelete(metafields) {
    const mutation = gql`
    mutation MetafieldsDelete($metafields: [MetafieldIdentifierInput!]!) {
  metafieldsDelete(metafields: $metafields) {
    deletedMetafields {
      key
      namespace
      ownerId
    }
    userErrors {
      field
      message
    }
  }
}`;

    const variables = {
        "metafields": metafields
    };

    // 示範資料

    // const variables = {
    //     "metafields": [
    //         {
    //             "ownerId": "gid://shopify/Product/20995642",
    //             "namespace": "inventory",
    //             "key": "today"
    //         }
    //     ]
    // };

    try {
        const res = await client.request(mutation, variables);
        const deletedMetafields = res.metafieldsDelete.deletedMetafields;
        const userErrors = res.metafieldsDelete.userErrors;

        if (userErrors.length > 0) {
            console.warn(`⚠️ Shopify 回傳 userErrors：`);
            userErrors.forEach(err => {
                console.warn(`• ${err.field?.join('.') || 'unknown'}: ${err.message}`);
            });
        }

        if (deletedMetafields) {
            return deletedMetafields;
        } else {
            return null;
        }


    } catch (error) {
        console.error(`❌ 執行 metafieldsDelete 發生錯誤："`, error.response?.data || error.message);
        return null;
    }
}
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

export default async function metafieldsSet(metafields) {
    const mutation = gql`
      mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $metafields) {
    metafields {
      key
      namespace
      value
      createdAt
      updatedAt
    }
    userErrors {
      field
      message
      code
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
    //             "key": "example_key",
    //             "namespace": "example_namespace",
    //             "ownerId": "gid://shopify/Product/20995642",
    //             "type": "single_line_text_field",
    //             "value": "Example Value"
    //         }
    //     ]
    // };

    try {
        const res = await client.request(mutation, variables);
        const metafields = res.metafieldsSet.metafields;
        const userErrors = res.metafieldsSet.userErrors;

        if (userErrors?.length > 0) {
            console.warn(`⚠️ Shopify 回傳 userErrors：`);
            userErrors.forEach(err => {
                console.warn(`• ${err.field?.join('.') || 'unknown'}: ${err.message}`);
            });
        }

        if (metafields || userErrors?.length > 0) {
            return { metafields, userErrors };
        } else {
            return null;
        }


    } catch (error) {
        console.log('❌ 執行 metafieldsSet 發生錯誤（展開）：');
        console.log(JSON.stringify(error.response?.errors || error, null, 2));
        return null;
    }
}
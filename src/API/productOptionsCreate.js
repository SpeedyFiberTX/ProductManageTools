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

export default async function productOptionsCreate(optionsInput) {
  // console.log(`傳送進來的optionInput`)
  // console.log(JSON.stringify(optionsInput))

  const mutation = gql`
      mutation createOptions($productId: ID!, $options: [OptionCreateInput!]!, $variantStrategy: ProductOptionCreateVariantStrategy) {
  productOptionsCreate(productId: $productId, options: $options, variantStrategy: $variantStrategy) {
    userErrors {
      field
      message
      code
    }
    product {
      id
      variants(first: 10) {
        nodes {
          id
          title
          selectedOptions {
            name
            value
          }
        }
      }
      options {
        id
        name
        values
        position
        optionValues {
          id
          name
          hasVariants
        }
      }
    }
  }
}`;

  const variables = optionsInput;


  // 示範資料
  // const variables = {
  //   "productId": "gid://shopify/Product/9289324626151",
  // "variantStrategy": "CREATE"
  //   "options": [
  //     {
  //       "name": "Color",
  //       "position": 1,
  //       "values": [
  //         {
  //           "name": "Blue"
  //         }
  //       ]
  //     }
  //   ]
  // };

  try {
    const res = await client.request(mutation, variables);
    const product = res.productOptionsCreate.product;
    if (product) {
      return product;
    } else {
      console.warn(`⚠️ 查無 product：${res.productOptionsCreate.userErrors.message}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ 建立 options 錯誤：`, error.response?.data || error.message);
    return null;
  }
}
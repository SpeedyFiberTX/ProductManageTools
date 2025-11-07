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

export default async function productCreate(productData) {
    const mutation = gql`
      mutation productCreate($input: ProductInput!){
  productCreate(input: $input){
    product{
      id
      title
      handle
      options {
        name
        optionValues {
          name
          hasVariants
        }
      }
    }
    userErrors {
      field
      message
    }
  }
}`;

    const variables = { input: productData };

    try {
        const res = await client.request(mutation, variables);
        const {product,userErrors} = res.productCreate;

        if (userErrors.length > 0) {
      console.warn(`⚠️ Shopify 回傳 userErrors：`);
      userErrors.forEach(err => {
        console.warn(`• ${err.field?.join('.') || 'unknown'}: ${err.message}`);
      });
    }

    if (product) {
      return product;
    } else {
      return null;
    }


    } catch (error) {
        console.error(`❌ 執行 productCreate 發生錯誤："`, error.response?.data || error.message);
        return null;
    }
}
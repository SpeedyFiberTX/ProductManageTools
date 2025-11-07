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

export default async function productVariantsBulkDelete(variantsInput) {
  const mutation = gql`
      mutation bulkDeleteProductVariants($productId: ID!, $variantsIds: [ID!]!) {
  productVariantsBulkDelete(productId: $productId, variantsIds: $variantsIds) {
    product {
      id
      title
    }
    userErrors {
      field
      message
    }
  }
}`;

  const variables = variantsInput;

  // 範例
  // const variables = {
//   "productId": "gid://shopify/Product/20995642",
//   "variantsIds": [
//     "gid://shopify/ProductVariant/30322695",
//     "gid://shopify/ProductVariant/113711323"
//   ]
// }

  try {
    const res = await client.request(mutation, variables);
    const productVariants = res.productVariantsBulkDelete.product;
    if (productVariants) {
      // console.log(productVariants);
      return productVariants;
    }

    const userErrors = res.productVariantsBulkDelete.userErrors;
    if (userErrors.length > 0) {
      console.warn("⚠️ User Errors:", userErrors);
    }
  } catch (error) {
    console.error(`❌ 建立變體錯誤：`, error.response?.errors || error.message);
    return null;
  }
}
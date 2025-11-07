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

export default async function productVariantsCreate(variantsInput) {
  const mutation = gql`
      mutation ProductVariantsCreate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
  productVariantsBulkCreate(productId: $productId, variants: $variants) {
    productVariants {
      id
      title
      selectedOptions {
        name
        value
      }
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
  //   "productId": "gid://shopify/Product/9289324626151",
  //   "variants": [
  //     {
  //       "barcode": "",
  //       "price": 100,
  //       "compareAtPrice": 300,
  //       "optionValues": [
  //          {
  //             "name": "Golden",
  //             "optionId": "gid://shopify/ProductOption/328272167"
  //          }
  //        ],
  //       "inventoryItem": {
  //         "measurement": {
  //           "weight": {
  //             "unit": "GRAMS",
  //             "value": 10,
  //           }
  //         },
  //         "requiresShipping": true,
  //         "sku": "ABCDEFG",
  //         "tracked": true,
  //       },
  //       "inventoryPolicy": "CONTINUE",
  //       "taxable": true
  //     }
  //   ]
  // };

  try {
    const res = await client.request(mutation, variables);
    const productVariants = res.productVariantsBulkCreate.productVariants;
    if (productVariants) {
      // console.log(productVariants);
      return productVariants;
    }

    const userErrors = res.productVariantsBulkCreate.userErrors;
    if (userErrors.length > 0) {
      console.warn("⚠️ User Errors:", userErrors);
    }
  } catch (error) {
    console.error(`❌ 建立變體錯誤：`, error.response?.errors || error.message);
    return null;
  }
}
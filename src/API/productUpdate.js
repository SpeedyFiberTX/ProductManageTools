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

export default async function productUpdate(productData) {

    const { collectionsToJoin, ...cleanedData } = productData;//解構排除collectionIds

    const mutation = gql`
    mutation UpdateProduct($product: ProductInput!){
 productUpdate(input: $product)  {
    product {
      id
      handle
      title
      descriptionHtml
      vendor
      productType
      tags
      status
      seo {
        title
        description
        }
      templateSuffix
    }
    userErrors {
      field
      message
    }
  }
}`;

    const variables = { "product": cleanedData };

    try {
        const response = await client.request(mutation, variables);
        const product = response.productUpdate.product;
        const userErrors = response.productUpdate.userErrors;

        if (userErrors.length > 0) {
            console.error("❌ Shopify 錯誤回傳：");
            userErrors.forEach(err => {
                console.error(`• ${err.field?.join('.') || 'unknown'}: ${err.message}`);
            });
        }

        if (product) {
            console.log(`✅ 更新成功：${product.handle}`);
            // console.log(JSON.stringify(product, null, 2));
            return product;
        } else {
            console.warn(`⚠️ 查無產品資料（可能被 userErrors 阻止）`);
            return null;
        }

    } catch (error) {
        console.error(`❌ 產品更新 錯誤：`, error.response?.data || error.message);
    }
}
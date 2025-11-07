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

export default async function translationsRemove(resourceId,translationKeys) {
  const mutation = gql`
      mutation translationsRemove($resourceId: ID!, $translationKeys: [String!]!, $locales: [String!]!) {
  translationsRemove(resourceId: $resourceId, translationKeys: $translationKeys,locales: $locales) {
    userErrors {
      message
      field
    }
    translations {
      key
      value
    }
  }
}`;

  const variables = {
  "resourceId": resourceId,
  "locales": "ja",
  "translationKeys":translationKeys,
};

//   範例
//   const variables = {
//   "resourceId": "gid://shopify/Product/20995642",
//   "translations": [
//     {
//       "locale": "fr",
//       "key": "title",
//       "value": "L'élément",
//       "translatableContentDigest": "4e5b548d6d61f0006840aca106f7464a4b59e5a854317d5b57861b8423901bf6"
//     }
//   ]
// };

  try {
    const res = await client.request(mutation, variables);
    const translations = res.translationsRemove;
    if (translations) {
      console.log('翻譯刪除完成：',resourceId)
      return translations;
    }

    const userErrors = res.translationsRegister.userErrors;
    if (userErrors.length > 0) {
      console.warn("⚠️ User Errors:", userErrors);
    }
  } catch (error) {
    console.error(`❌ 翻譯刪除錯誤：`, error.response?.errors || error.message);
    return null;
  }
}
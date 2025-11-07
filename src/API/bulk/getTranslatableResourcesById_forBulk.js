import dotenv from 'dotenv';
import { GraphQLClient, gql } from 'graphql-request';

dotenv.config();

const SHOP = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const graphqlEndpoint = `https://${SHOP}/admin/api/2025-07/graphql.json`;

const client = new GraphQLClient(graphqlEndpoint, {
  headers: {
    'X-Shopify-Access-Token': TOKEN,
    'Content-Type': 'application/json',
  },
});

export default async function getTranslatableResourcesByIds(resourceIds, locale = "zh-TW") {
  const query = gql`
    query ($ids: [ID!]!, $loc: String!) {
      translatableResourcesByIds(resourceIds: $ids, first: 250) {
        edges {
          node {
            resourceId
            translations(locale: $loc) {
              key
              value
              locale
            }
          }
        }
      }
    }
  `;

  try {
    const res = await client.request(query, { ids: resourceIds, loc: locale });
    return (res?.translatableResourcesByIds?.edges ?? [])
      .map(({ node }) => {
        const t = (node?.translations ?? []).find(x => x?.key === "value" && x?.value);
        return t ? { resourceId: node.resourceId, value: t.value, locale: t.locale } : null;
      })
      .filter(Boolean);
  } catch (error) {
    console.error(`❌ 查詢翻譯欄位錯誤：`, error.response?.data || error.message);
    return [];
  }
}

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { fileURLToPath } from 'url';
import { GraphQLClient, gql } from 'graphql-request'; //處理GraphQL

import getFieldValue from '../../helper/getFieldValue.js';

dotenv.config();

const SHOP = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const graphqlEndpoint = `https://${SHOP}/admin/api/2024-01/graphql.json`;
const client = new GraphQLClient(graphqlEndpoint, {
    headers: {
        'X-Shopify-Access-Token': TOKEN,
        'Content-Type': 'application/json',
    }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvDir = path.join(__dirname, '..', '4_csv', 'Relative');
const files = fs.readdirSync(csvDir).filter(f => f.endsWith('.csv'));

function parseCSV(filePath) {
    return new Promise((resolve, reject) => {
        const rows = [];
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', data => rows.push(data))
            .on('end', () => resolve(rows))
            .on('error', reject);
    });
}


// 從handle查詢產品id
async function getProductIdByHandle(handle) {
    const query = gql`
    query ($handle:String!){
      productByHandle(handle: $handle) {
    id
  }
}`

    try {
        const response = await client.request(query, { handle });
        const productId = response.productByHandle.id
        if (productId.length > 0) {
            return productId;
        } else {
            console.warn(`⚠️ 查無 產品：「${handle}」`);
            return null;
        }
    } catch (error) {
        console.error(`❌ 查詢 產品ID 錯誤：「${handle}」`, error.response?.data || error.message)
        return null;
    }
}

// 更新metafield
async function updateProduct(productData) {

    const mutation = gql`
    mutation UpdateProduct($product: ProductInput!){
 productUpdate(input: $product)  {
    product {
      id
      handle
      metafield(namespace: "recommendation", key: "related_products") {
        value
        type
      }
    }
    userErrors {
      field
      message
    }
  }
}`;



    try {
        const response = await client.request(mutation, productData);
        const product = response.productUpdate.product;
        const userErrors = response.productUpdate.userErrors;

        if (userErrors.length > 0) {
            console.error("❌ Shopify 錯誤回傳：");
            userErrors.forEach(err => {
                console.error(`• ${err.field?.join('.') || 'unknown'}: ${err.message}`);
            });
        }

        if (product) {
            console.log("✅ 關聯產品更新成功");
            console.log(product.metafield);
            return product;
        } else {
            console.warn(`⚠️ 查無產品資料（可能被 userErrors 阻止）`);
            return null;
        }

    } catch (error) {
        console.error(`❌ 產品更新 錯誤：`, error.response?.data || error.message);
    }



}


(async () => {
    for (const file of files) { //逐一處理每個檔案
        const filePath = path.join(csvDir, file); //檔案路徑
        console.log(`📦 處理檔案：${file}`);

        try {
            //CSV轉成javascript陣列
            const productList = await parseCSV(filePath);

            for (let product of productList) {
                const handle = getFieldValue(product, 'Handle');
                const related = getFieldValue(product, 'recommendation.related_products');
                const relatedProductsHandle = related.split(',');
                const relatedProductsId = [];

                if (!handle) {
                    console.warn(`⚠️ 缺少 Handle，跳過`);
                    continue;
                }

                console.log(`✅準備查詢產品 handle:${handle}`)
                const productID = await getProductIdByHandle(handle);
                console.log(`🆔 查詢結果：${productID}`);


                for (let relatedProductHandle of relatedProductsHandle) {

                    if (!relatedProductHandle) {
                        console.warn(`⚠️ 缺少 Handle，跳過`);
                        continue;
                    }

                    // console.log(`⭕準備查詢關聯產品 handle:${relatedProductHandle}`)
                    const relatedProductID = await getProductIdByHandle(relatedProductHandle);
                    // console.log(`🆔 查詢結果：${relatedProductID}`);

                    if (!relatedProductID) {  // 👈 這裡檢查是否為 null 或 undefined
                        console.warn(`⚠️ 無法找到產品 ID，Handle：${relatedProductHandle}，跳過`);
                        continue;
                    }

                        relatedProductsId.push(relatedProductID);
                }


                const productData = {
                    "product": {
                        id: productID,
                        metafields: [
                            {
                                namespace: "recommendation",
                                key: "related_products",
                                value: JSON.stringify(relatedProductsId),
                                type: "list.product_reference",
                            }
                        ]
                    }
                }
                console.log(`✅ 產品組合完成，準備上傳產品：${handle}`)
                console.table(productData.product.metafields[0].value)

                const response = await updateProduct(productData);
                console.log(`產品 ${handle} 執行結束`)

            }



        } catch (error) {
            console.error(error.message)
        }
        console.log('\n'); // 每個檔案之間空行區隔
    }
})();
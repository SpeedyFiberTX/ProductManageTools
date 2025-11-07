/**
 * 讀取 4_csv/Metafields 資料夾內的資料
 * 依據csv檔案設定Metafields->覆寫模式
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 資料處理
import parseCSV from '../helper/parseCSV.js';
import groupByHandle from '../../helper/groupByHandle.js';
import buildMetafieldsData from '../../helper/buildMetafieldsData.js';
import { metafieldTypes } from '../../helper/metafield-config.js';

// API
import getProductDataByHandle from '../API/getProductDataByHandle.js';
import getProductMetafields from '../API/getProductMetafields.js';
import metafieldsDelete from '../API/metafieldsDelete.js';
import metafieldsSet from '../API/metafieldsSet.js'
import buildRichTextData from '../../helper/buildRichTextData.js';

// 處理CSV會用到的變數
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const csvDir = path.join(__dirname, '..', '4_csv', 'Metafields');
const files = fs.readdirSync(csvDir).filter(f => f.endsWith('.csv'));
const doneDir = path.join(__dirname, '..', '8_RecycleBin');
if (!fs.existsSync(doneDir)) {
    fs.mkdirSync(doneDir);
}

// 執行
(async () => {

    try {
        for (const file of files) { //逐一處理每個檔案
            const filePath = path.join(csvDir, file); //檔案路徑
            console.log(`📦 處理檔案：${file}`);

            // 個別檔案處理流程
            try {
                //CSV轉成javascript陣列
                const rows = await parseCSV(filePath);

                // 按照 handle 組成陣列(同一檔案中如果有多個handle就會被拆成多個陣列)
                const groupedProducts = groupByHandle(rows);

                // Metafield 寫入流程
                for (const [handle, productRows] of Object.entries(groupedProducts)) {

                    console.log(`⬇️ 開始處理 ${handle} Metafields 上傳`)

                    // 傳入row

                    for (const row of productRows) {

                        // 呼叫API
                        try {

                            // 取得產品ID
                            const product = await getProductDataByHandle(handle);
                            const productID = product.id;
                            console.log("✅已取得產品ID： ", productID);

                            // 組織成要寫入的欄位
                            const metafieldsNormal = buildMetafieldsData(row); //一般的metafields
                            const metafieldsRichText = buildRichTextData(row);//rich text
                            let metafieldsToWrite = [...metafieldsNormal, ...metafieldsRichText];
                            metafieldsToWrite.forEach(mf => mf.ownerId = productID); //寫入productID

                            // 取得現有欄位
                            const existingMetafields = await getProductMetafields(productID); // 取得現存 Metafields

                            if (existingMetafields) {
                                // 比對已存在的欄位，篩選出確切要刪除的 (排除本來就空白的欄位)
                                const allowedKeys = Object.keys(metafieldTypes); // 由我們管理的 key 列表

                                const confirmedMetafieldsToDelete = existingMetafields
                                    .filter(existing => {
                                        const fullKey = `${existing.namespace}.${existing.key}`;
                                        return (
                                            allowedKeys.includes(fullKey) && // 只動我們管理的 key
                                            !metafieldsToWrite.some(toWrite =>
                                                toWrite.namespace === existing.namespace && toWrite.key === existing.key
                                            )
                                        );
                                    })
                                    .map(({ namespace, key }) => ({
                                        namespace,
                                        key,
                                        ownerId: productID
                                    }));

                                // 🧹刪除空白的欄位

                                if (confirmedMetafieldsToDelete.length > 0) {
                                    const alreadyDelete = await metafieldsDelete(confirmedMetafieldsToDelete);
                                    console.log(`🧹 已清除 ${alreadyDelete.length} 個欄位：`);
                                    console.table(
                                        alreadyDelete.map(({ namespace, key }) => ({
                                            Namespace: namespace,
                                            Key: key
                                        }))
                                    );
                                } else {
                                    console.log(`⬇️ 沒有要清除的欄位`)
                                }

                            }

                            // ✏️ 寫入有值的欄位 (分批)
                            if (metafieldsToWrite.length > 0) {
                                const chunkSize = 20; //每20個一次
                                for (let i = 0; i < metafieldsToWrite.length; i += chunkSize) {
                                    const chunk = metafieldsToWrite.slice(i, i + chunkSize);
                                    try {
                                        const result = await metafieldsSet(chunk);
                                        if (result === null) {
                                            console.error(`❌ ${handle} 第 ${i / chunkSize + 1} 批寫入失敗：回傳為 null，可能是 API 錯誤`);
                                        } else {
                                            console.log(`✅ ${handle} 第 ${i / chunkSize + 1} 批成功寫入 ${chunk.length} 筆`);
                                        }
                                    } catch (err) {
                                        console.error(`❌ ${handle} 第 ${i / chunkSize + 1} 批寫入失敗：`, err.message);
                                    }
                                }
                            }



                        } catch (error) {
                            console.error(`❌ ${handle}處理失敗` + error.message)
                        }


                    }


                    console.log('\n'); // 每個產品之間空行區隔
                }

                // 個別檔案處理流程結束
                // 成功後移動檔案
                const donePath = path.join(doneDir, file);
                fs.renameSync(filePath, donePath);
                console.log(`📁 已移動至 8_RecycleBin：${file}`);

            } catch (error) {
                console.error(`❌ 檔案處理發生錯誤` + error.message)
            }

            // 個別檔案處理流程結束

            console.log('\n'); // 每個檔案之間空行區隔
        }
    } catch (error) {
        console.error(`❌ metafieldsOverWriter.js 流程發生錯誤` + error.message)
    }


})();
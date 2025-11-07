// 資料處理
import groupByHandle from '../helper/groupByHandle.js';
import buildMetafieldsData from '../helper/buildMetafieldsData.js';
import buildRichTextData from '../helper/buildRichTextData.js';

// API
import getProductDataByHandle from '../API/getProductDataByHandle.js';
import metafieldsSet from '../API/metafieldsSet.js'

// 執行
export default async function metafieldsWriter(rows){

        // 個別檔案處理流程
        try {

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

                        // 組織成要寫入的欄位
                        const metafieldsNormal = buildMetafieldsData(row); //一般的metafields
                        const metafieldsRichText = buildRichTextData(row);//rich text
                        let metafieldsToWrite = [...metafieldsNormal, ...metafieldsRichText];
                        metafieldsToWrite.forEach(mf => mf.ownerId = productID); //寫入productID

                        // ✏️ 寫入有值的欄位
                        if (metafieldsToWrite.length > 0) {
                            const chunkSize = 20;
                            for (let i = 0; i < metafieldsToWrite.length; i += chunkSize) {
                                const chunk = metafieldsToWrite.slice(i, i + chunkSize);
                                try {
                                    const result = await metafieldsSet(chunk);
                                    if (!result) {
                                        console.error(`❌ ${handle} 第 ${i / chunkSize + 1} 批寫入失敗：回傳為 null，可能是 API 錯誤`);
                                    } else {
                                        const successCount = result.metafields?.length || 0;
                                        const errorCount = result.userErrors?.length || 0;

                                        if (errorCount > 0) {
                                            console.warn(`⚠️ ${handle} 第 ${i / chunkSize + 1} 批有錯誤：成功 ${successCount}/${chunk.length}，失敗 ${errorCount}`);
                                            result.userErrors.forEach(e => {
                                                console.warn(`• ${e.code || 'UNKNOWN'} | ${e.field?.join('.') || 'unknown'}: ${e.message}`);
                                            });
                                        } else {
                                            console.log(`✅ ${handle} 第 ${i / chunkSize + 1} 批成功寫入 ${successCount}/${chunk.length} 筆`);
                                        }
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

        } catch (error) {
            console.error(`❌ 檔案處理發生錯誤` + error.message)
        }
}
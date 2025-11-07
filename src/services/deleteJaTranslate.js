import getProductMetafields from "../API/getProductMetafields.js";
import getProductDataByHandle from "../API/getProductDataByHandle.js";
import translationsRemove from "../API/translationsRemove.js";
import groupByHandle from "../helper/groupByHandle.js";
// import getTranslatableResourcesByIds from "../API/getTranslatableResourcesByIds.js";

export default async function deleteJaTranslate(rows) {
    // 個別檔案處理流程
    try {


        const groupedProducts = groupByHandle(rows);


        for (const [handle, productRows] of Object.entries(groupedProducts)) {

            console.log(`⬇️ 開始處理 ${handle} 日文翻譯刪除`)

            // 傳入row

            for (const row of productRows) {

                // 呼叫API
                try {

                    // 取得產品ID
                    const product = await getProductDataByHandle(handle);
                    const productID = product.id;
                    const productOption = product.options?.map(option => ({ optionID: option?.id, optionValues: option?.optionValues?.map(value => value?.id) }));
                    const metafields = await getProductMetafields(productID);
                    const metafieldsIDs = metafields?.map(metafield => metafield?.id);

                    // 用translationsRemove
                    await translationsRemove(productID, ["title", "body_html", "meta_description", "product_type"])
                    for (const { optionID, optionValues } of productOption) {
                        await translationsRemove(optionID, ["name"]);

                        for (const valueID of optionValues) {
                            await translationsRemove(valueID, ["name"]);
                        }
                    }

                    console.log('開始刪除 Metafields');
                    for (const metafield of metafieldsIDs) {
                        await translationsRemove(metafield, ["value"]);
                    }

                    console.log(`✅ ${handle}刪除完成`)


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
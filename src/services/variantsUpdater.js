import groupByHandle from '../helper/groupByHandle.js';

// API
import buildVariantsData from '../helper/buildVariantsData.js';
import productVariantsBulkUpdate from '../API/productVariantsBulkUpdate.js';


// 執行
export default async function variantsUpdater(rows){
        // 個別檔案處理流程
        try {

            // 按照 handle 組成陣列(同一檔案中如果有多個handle就會被拆成多個陣列)
            const groupedProducts = groupByHandle(rows);

            // 組織產品內容(取陣列中第一筆資料)
            for (const [handle, productRows] of Object.entries(groupedProducts)) {

                    // 準備變體資料
                    const {updateInput} = await buildVariantsData(productRows);
                    // 更新變體
                    if (updateInput.variants) {
                        console.log(`⏬ 已取得變體資料`)
                        console.log(updateInput.variants);

                        // 更新變體
                        const productVariants = await productVariantsBulkUpdate(updateInput);
                        if (productVariants) {
                            console.log(`✅變體更新完成`)
                        }
                    } else {
                        console.log(`⚠️ 沒有需要更新的變體`)
                    }

                console.log('\n'); // 每個產品之間空行區隔
            }

        } catch (error) {
            console.error(`❌ ` + error.message)
        }
    };
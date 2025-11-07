// 資料處理
import groupByHandle from '../helper/groupByHandle.js';
import buildProductOptionsData from '../helper/buildProductOptionsData.js';

// API
import productOptionsCreate from '../API/productOptionsCreate.js';
import buildVariantsData from '../helper/buildVariantsData.js';
import productVariantsBulkUpdate from '../API/productVariantsBulkUpdate.js';
import buildInventoryData from '../helper/buildInventoryData.js';
import inventorySetQuantities from '../API/inventorySetQuantities.js';
import productVariantsBulkDelete from '../API/productVariantsBulkDelete.js';

// 執行
export default async function productVariantsBuilder (rows){
        try {
            // 按照 handle 組成陣列(同一檔案中如果有多個handle就會被拆成多個陣列)
            const groupedProducts = groupByHandle(rows);

            // 組織產品內容(取陣列中第一筆資料)
            for (const [handle, productRows] of Object.entries(groupedProducts)) {

                // 準備Options
                const productOptionsData = await buildProductOptionsData(productRows);

                if (productOptionsData) {
                    console.log(`⏬ 偵測到 Options`)

                    // 建立options
                    const productHaveOptions = await productOptionsCreate(productOptionsData);
                    if (productHaveOptions) {
                        console.log("✅ 建立 Options 成功")

                    } else {
                        console.log(`⚠️ 建立 Options 失敗`)
                    }

                } else {
                    console.log(`⚠️ 本產品無Options`)
                }

                // 準備變體資料
                const { updateInput, deleteInput } = await buildVariantsData(productRows);
                // 更新變體
                if (updateInput.variants) {
                    console.log(`⏬ 已取得變體資料`)

                    // 更新變體
                    const productVariants = await productVariantsBulkUpdate(updateInput);
                    if (productVariants) {
                        console.log(`✅變體更新完成`)
                    }
                } else {
                    console.log(`⚠️ 沒有需要更新的變體`)
                }

                // 刪除變體
                if (deleteInput.variantsIds.length > 0) {
                    console.log(`⏬ 已取得要刪除的變體`)

                    // 刪除變體
                    const deleteVariants = await productVariantsBulkDelete(deleteInput);
                    if (deleteVariants) {
                        console.log(`✅變體刪除完成`)
                    }
                } else {
                    console.log(`⚠️ 沒有需要刪除的變體`)
                }

                // 查詢庫存ID
                const InventoryData = await buildInventoryData(handle, productRows);
                console.log(`⏬ 已取得庫存資料`);
                if (InventoryData.length > 0) {
                    // console.log(InventoryData);

                    // 更新庫存
                    const inventoryChanges = await inventorySetQuantities(InventoryData);
                    if (inventoryChanges) {
                        console.log(`✅ 庫存更新完成`)
                        console.table(inventoryChanges);
                    } else {
                        console.log(`⚠️ 前後數量一致，無更新`)
                    }
                } else {
                    console.log(`⚠️ ${handle}沒有需要更新的庫存`)
                }



                console.log('\n'); // 每個產品之間空行區隔
            }

        } catch (error) {
            console.error(`❌ ` + error.message)
        }
};
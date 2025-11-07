/**
 * 讀取 4_csv/Shopify 資料夾內的資料
 * 依據csv檔案設定庫存
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 資料處理
import parseCSV from '../helper/parseCSV.js';
import groupByHandle from '../../helper/groupByHandle.js';

// API
import buildInventoryData from '../../helper/buildInventoryData.js';
import inventorySetQuantities from '../API/inventorySetQuantities.js';

// 處理CSV會用到的變數
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const csvDir = path.join(__dirname, '..', '4_csv', 'Shopify');
const files = fs.readdirSync(csvDir).filter(f => f.endsWith('.csv'));


// 執行
(async () => {
    for (const file of files) { //逐一處理每個檔案
        const filePath = path.join(csvDir, file); //檔案路徑
        console.log(`📦 處理檔案：${file}`);

        // 個別檔案處理流程
        try {
            //CSV轉成javascript陣列
            const rows = await parseCSV(filePath);

            // 按照 handle 組成陣列(同一檔案中如果有多個handle就會被拆成多個陣列)
            const groupedProducts = groupByHandle(rows);

            // 組織產品內容(取陣列中第一筆資料)
            for (const [handle, productRows] of Object.entries(groupedProducts)) {


                // 查詢庫存ID
                const InventoryData = await buildInventoryData(handle, productRows);
                console.log(`⏬ ${handle}已取得庫存資料`);
                if (InventoryData.length > 0) {
                    console.log(InventoryData);

                    // 更新庫存
                    const inventoryChanges = await inventorySetQuantities(InventoryData);
                    if (inventoryChanges) {
                        console.log(`✅ 庫存更新完成`)
                        console.table(inventoryChanges);
                    }else{
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

        // 個別檔案處理流程結束

        console.log('\n'); // 每個檔案之間空行區隔
    }
})();
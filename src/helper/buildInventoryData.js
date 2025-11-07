import dotenv from 'dotenv';
dotenv.config();

import getFieldValue from '../helper/getFieldValue.js';
import getProductDataByHandle from '../API/getProductDataByHandle.js';
import buildOptionTitle from './buildOptionTitle.js';

const LOCATION_TW_ID = process.env.SHOPIFY_LOCATION_TW_ID;
const LOCATION_SZ_ID = process.env.SHOPIFY_LOCATION_SZ_ID;

export default async function buildInventoryData(handle, rows) {

    const product = await getProductDataByHandle(handle)
    const variants = product.variants.nodes; //有title sku 可以用來組裝

    const inventoryList = [];


    //處理單一列
    for (const row of rows) {

        const title = buildOptionTitle(row);
        const sku = getFieldValue(row, 'Variant SKU') || "";
        const ShenZhenQty = Number(getFieldValue(row, 'Variant Inventory Qty / SpeedyFiberTX Shenzhen'));
        const TaiwanQty = Number(getFieldValue(row, 'Variant Inventory Qty / SpeedyFIberTX TW'))
        const variant = variants.find(item => item.sku === sku || item.title === title);

        if (!variant) {
            console.warn(`⚠️ 找不到 SKU 為 ${sku} 或標題為 ${title} 的 variant，跳過`);
            continue;
        }

        const inventoryItemID = variant.inventoryItem.id

        if (!inventoryItemID) {
            console.warn(`⚠️ 找不到 inventoryItem.id for variant:`, variant);
            continue;
        }

        if (ShenZhenQty) {

            const inventoryItemData = {
                "inventoryItemId": inventoryItemID,
                "locationId": LOCATION_SZ_ID,
                "quantity": ShenZhenQty,
            }

            inventoryList.push(inventoryItemData);

        }

        if (TaiwanQty) {
            const inventoryItemData = {
                "inventoryItemId": inventoryItemID,
                "locationId": LOCATION_TW_ID,
                "quantity": TaiwanQty,
            }

            inventoryList.push(inventoryItemData);
        }

    }

    return inventoryList;

}
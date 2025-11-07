import getFieldValue from '../helper/getFieldValue.js';
import getProductDataByHandle from '../API/getProductDataByHandle.js';
import buildOptionTitle from './buildOptionTitle.js';

export default async function buildVariantsData(rows) {

    const mainRow = rows[0];//只讀取第一列->第一列才是產品主要資訊，其他是變體

    const handle = getFieldValue(rows[0], 'handle'); //取得handle
    const product = await getProductDataByHandle(handle); //查詢產品資料
    const productID = product.id;
    const originVariants = product.variants.nodes;
    const variables = {
        "productId": productID,
    };

    //處理單一檔案
    for (const row of rows) {

        const title = buildOptionTitle(row); //計算title
        
            const thisVariant = {
                "barcode": getFieldValue(row, 'Variant Barcode') || "",
                "price": Number(getFieldValue(row, 'Variant Price')),
                ...(getFieldValue(row, 'Variant Compare At Price') && {
                    compareAtPrice: Number(getFieldValue(row, 'Variant Compare At Price'))
                }),
                "inventoryItem": {
                    "measurement": {
                        "weight": {
                            "unit": "GRAMS",
                            "value": Number(getFieldValue(row, 'Variant Grams') || "0"),
                        }
                    },
                    "requiresShipping": getFieldValue(row, 'Variant Requires Shipping')?.toUpperCase() === 'TRUE',
                    "sku": getFieldValue(row, 'Variant SKU') || "",
                    "tracked": getFieldValue(row, 'Variant Inventory Tracker')?.toLowerCase() === 'shopify',
                },
                "inventoryPolicy": getFieldValue(row, 'Variant Inventory Policy')?.toUpperCase() || "",
                "taxable": getFieldValue(row, 'Variant Taxable')?.toUpperCase() === 'TRUE'
            }

            if (variables.variants) {
                variables.variants.push(thisVariant)
            } else {
                variables.variants = [thisVariant]
            }


    }

    if (variables.variants) {
        return variables;
    }
}
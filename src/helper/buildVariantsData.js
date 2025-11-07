import getFieldValue from '../helper/getFieldValue.js';
import getProductDataByHandle from '../API/getProductDataByHandle.js';
import buildOptionTitle from './buildOptionTitle.js';

export default async function buildVariantsData(rows) {

    const mainRow = rows[0];//只讀取第一列->第一列才是產品主要資訊，其他是變體

    const handle = getFieldValue(rows[0], 'handle'); //取得handle
    const product = await getProductDataByHandle(handle); //查詢產品資料
    const productID = product.id;
    const originVariants = product.variants.nodes || [];
    const variables = {
        "productId": productID,
    };

    //處理單一檔案
    for (const row of rows) {

        const title = buildOptionTitle(row); //計算title

        // 比對id
        const originVariantData = originVariants.find(originVariant => originVariant.title === title);

        if (originVariants[0].title === 'Default Title') { //如果是預設值的話

            const thisVariant = {
                "id": originVariants[0].id,
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

        } else if (originVariantData) { //如果有多個變體，並且抓到id
            const thisVariant = {
                "id": originVariantData.id,
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

    }

    // 要刪除的產品邏輯
    const csvTitles = rows.map(row => buildOptionTitle(row)); //取得所有csv內的 option title
    const csvTitleSet = new Set(csvTitles);  // 用 Set 查找效率快

    const toDeleteVariantIds = originVariants
        .filter(v => !csvTitleSet.has(v.title))
        .map(v => v.id)
        .filter(Boolean);

    // console.log(toDeleteVariantIds);

    const deleteVariants = {
        "productId": productID,
        "variantsIds": toDeleteVariantIds
    }

    return { updateInput: variables, deleteInput: deleteVariants, };
}
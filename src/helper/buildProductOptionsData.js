import getFieldValue from '../helper/getFieldValue.js';
import getProductDataByHandle from '../API/getProductDataByHandle.js';

export default async function buildProductOptionsData(rows) {

    const mainRow = rows[0];//只讀取第一列->第一列才是產品主要資訊，其他是變體

    const handle = getFieldValue(mainRow, 'handle'); //取得handle
    const product = await getProductDataByHandle(handle); //查詢產品資料
    const productID = product.id;
    const option1 = getFieldValue(mainRow, 'Option1 Name') || "";
    const option2 = getFieldValue(mainRow, 'Option2 Name') || "";
    const option3 = getFieldValue(mainRow, 'Option3 Name') || "";

    const option1Input = {
        "name": option1,
        "position": 1,
        "values": []
    }

    const option2Input = {
        "name": option2,
        "position": 2,
        "values": []
    }

    const option3Input = {
        "name": option3,
        "position": 3,
        "values": []
    }

    const productOptionsData = {
        "productId": productID,
        "variantStrategy": "CREATE"
    };


    if (option1) {

        const valueSet = new Set();

        rows.forEach(row => {
            const raw = getFieldValue(row, 'Option1 Value')?.trim(); // 去除前後空白
            if (raw) valueSet.add(raw); // 排除空字串，自動去重
        });

        option1Input.values = Array.from(valueSet).map(name => ({ name }));

        productOptionsData.options = [option1Input];
    }

    if (option2) {
        const valueSet = new Set();

        rows.forEach(row => {
            const raw = getFieldValue(row, 'Option2 Value')?.trim();
            if (raw) valueSet.add(raw);
        });

        option2Input.values = Array.from(valueSet).map(name => ({ name }));

        productOptionsData.options.push(option2Input);
    }

    if (option3) {
        const valueSet = new Set();

        rows.forEach(row => {
            const raw = getFieldValue(row, 'Option3 Value')?.trim();
            if (raw) valueSet.add(raw);
        });

        option3Input.values = Array.from(valueSet).map(name => ({ name }));

        productOptionsData.options.push(option3Input);


    }

    if (productOptionsData.options?.some(opt => opt.values.length > 0)) {
        return productOptionsData;
    } else {
        return;
    }

}
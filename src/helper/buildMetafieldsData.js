import { metafieldTypes, metafieldOptions } from '../helper/metafield-config.js';

export default function buildMetafieldsData(row) {

    const metafieldsToWrite = [];//要寫入的欄位
    const metafieldsToDelete = [];//要刪除的欄位->現在暫時用不到

    // 只排除這些「格式型別」輔助欄位
    const TYPE_META_COLUMNS = new Set([
        'content.highlight_type',
        'content.features_type',
        'content.application_type',
        'content.specification_type',
    ]);

    for (const [field, rawValue] of Object.entries(row)) { //物件轉換成陣列，field = index 0 的值，rawValue = index 1 的值
        if (field === 'handle' || TYPE_META_COLUMNS.has(field)) {
            continue; // handle 和 rich text type 排除
        }

        const type = metafieldTypes[field]; //用 field (也就是 index 0 的值) 來查找 metafieldTypes 的值 => 查詢該欄位的 type
        if (!type || type === 'rich_text_field') continue; // 如果該欄位的 type 是 rich text 略過

        const [namespace, key] = field.split('.'); // 把 field 拆成 namespace 和 key
        if (!namespace || !key) continue; // 如果 namespace 或 key 不存在 略過

        const trimmedValue = rawValue?.trim?.() || ''; // 清除欄位空白

        // ⬇️ 若為空白，則加入刪除清單
        if (trimmedValue === '') {
            metafieldsToDelete.push({ namespace, key });
            continue;
        }

        let valueToUse = trimmedValue;

        // ✅ 驗證選項合法性，進一步處理 valueToUse 只有符合下列情況的會進入處理流程
        if (metafieldOptions[field]) { //如果該欄位有限定選項
            if (type.startsWith('list.')) { // 如果該欄位是多選
                const values = trimmedValue.split(',').map(v => v.trim()); // 如果有多個選項 就切開
                const allValid = values.every(val => metafieldOptions[field].includes(val)); // 逐一檢查values(此欄位的選項們)是否都符合option合法內容，回傳True/false
                if (!allValid) {
                    console.warn(`⚠️ ${field} 含有非法值：`, values);
                    console.warn(`預設選項：`, metafieldOptions[field]);

                    // 這裡打開可以看到字元碼，更容易除錯
                    // values.forEach(val => {
                    //     if (!metafieldOptions[field].includes(val)) {
                    //         console.warn(`❌ 不匹配：「${val}」 -> 字元碼：`, Array.from(val).map(c => c.charCodeAt(0)));
                    //     }
                    // });

                    // metafieldOptions[field].forEach(opt => {
                    //     console.warn(`✔️ 預設：「${opt}」 -> 字元碼：`, Array.from(opt).map(c => c.charCodeAt(0)));
                    // });

                    continue;
                }
                valueToUse = JSON.stringify(values);//合法的會會執行
            } else { //如果該欄位是單選
                if (!metafieldOptions[field].includes(trimmedValue)) { //如果選項不在選項內 
                    console.warn(`⚠️ ${field} 值 "${trimmedValue}" 不在選項內，已略過`);
                    continue;
                }
            }
        } else if (type.startsWith('list.')) { //如果該欄位無限定選項且為多選
            valueToUse = JSON.stringify(trimmedValue.split(',').map(v => v.trim())); //拆成多個選項
        }

        // 寫入待寫入的欄位
        metafieldsToWrite.push({
            ownerId: '',
            namespace,
            key,
            type,
            value: valueToUse,
        });
    }

    // console.log(metafieldsToWrite, metafieldsToDelete);
    return metafieldsToWrite;

}
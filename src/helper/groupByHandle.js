import getFieldValue from '../helper/getFieldValue.js';

// 將傳入的整個檔案陣列，依照 Handle 拆成不同陣列
export default function groupByHandle(rows) {
    const grouped = {};

    rows.forEach((row, index) => {
        // 檢查整列是否為空
        const isEmptyRow = Object.values(row).every(value =>
            value === null || value === undefined || String(value).trim() === ''
        );

        if (isEmptyRow) return; // 完全空白就跳過

        const handle = getFieldValue(row, 'Handle');
        row.handle = handle;

        if (!handle) {
            console.warn(`⚠️ 第 ${index + 2} 行缺少 Handle，跳過`); // +2 是因為 Excel 通常第 1 列是標題，第 2 列才是資料
            console.warn(`RowDump=`, JSON.stringify(row, null, 2));
            return;
        }

        if (!grouped[handle]) grouped[handle] = [];
        grouped[handle].push(row);
    });

    // console.log('🧩 分組後 keys：', Object.keys(grouped));

    return grouped;
}

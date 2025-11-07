import { metafieldTypes } from './metafield-config.js';
import textToTextJson from './textToTextJson.js'

export default function buildRichTextData(row) {

    const metafieldsToWrite = [];//要寫入的欄位


    // 從 config 中找出所有 rich_text 欄位
    const richTextFields = Object.entries(metafieldTypes)
        .filter(([_, type]) => type === 'rich_text_field')
        .map(([field]) => field);

    // console.log('可寫入的 richTextFields:', richTextFields);

    for (const field of richTextFields) {
        if (typeof field !== 'string' || !field.includes('.')) {
            console.warn(`⚠️ 無法解析 field: ${field}，略過`);
            continue;
        }

        // 如果 CSV 裡沒有這個欄位也直接跳過
        if (!Object.prototype.hasOwnProperty.call(row, field) || !Object.prototype.hasOwnProperty.call(row, `${field}_type`)) {
            console.warn(`⚠️ 缺少 ${field} 或 ${field}_type，略過`);
            continue;
        }

        const [namespace, key] = field.split('.');
        const typeField = `${field}_type`;
        const typeValue = (row[typeField] || '').trim();
        const contentValue = (row[field] || '').trim();

        if (!typeValue || !contentValue) {
            console.warn(`⚠️  ${field} 沒有內容或格式類型，略過`);
            continue;
        }

        const jsonValue = textToTextJson(contentValue, typeValue);
        if (!jsonValue || !jsonValue.children.length) {
            console.warn(`⚠️  ${field} rich text 解析失敗`);
            continue;
        }

        // 寫入待寫入的欄位
        metafieldsToWrite.push({
            ownerId: '',
            namespace,
            key,
            type:'rich_text_field',
            value: JSON.stringify(jsonValue),
        });
    }


    // console.log(metafieldsToWrite);
    return metafieldsToWrite;

}
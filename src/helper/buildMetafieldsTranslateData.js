import textToTextJson from './textToTextJson.js'
import getTranslatableResourcesByIds from '../API/getTranslatableResourcesByIds.js';

export default async function buildMetafieldsTranslateData(row, productMetafields) {

    const metafields = productMetafields.filter(mf => {
        const key = `${mf.namespace}.${mf.key}`;
        const value = row[key];
        return value && typeof value === 'string' && value.trim() !== '';
    });

    const metafieldInput = [];

    for (const mf of metafields) {
        const key = `${mf.namespace}.${mf.key}`;
        const typeKey = `${key}_type`;

        const originalText = row[key];
        const inputType = row[typeKey]?.trim() || 'paragraph';

        let translatedValue = '';

        // ✅ 如果是 content.specification_html，直接用原始值
        if (key === 'content.specification_html') {
            translatedValue = originalText;
        } else {
            // 其他的照舊轉成 RichText JSON
            translatedValue = JSON.stringify(textToTextJson(originalText, inputType));
        }

        try {

            const metafieldDigest = await getTranslatableResourcesByIds(mf.id);

            console.log(metafieldDigest[0].translatableContent);

            const valueDigest = metafieldDigest[0].translatableContent.find(item => item.key === 'value');

            if (!valueDigest) {
                console.warn(`⚠️ 找不到 digest for metafield ${key}`);
                continue;
            }

            metafieldInput.push({
                locale: "zh-TW",
                key: "value",
                value: translatedValue,
                translatableContentDigest: valueDigest.digest,
            });

        }catch(error){
            console.error(`❌ 建立 Metafields 資料錯誤` + error.message)
        }

            


          }

    return metafieldInput;

}
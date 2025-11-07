import { metafieldTypes } from './metafield-config.js';
import textToTextJson from './textToTextJson.js'
import resolveProductDescription from './resolveProductDescription.js';

export default function buildTranslateData(row,translatableContent) {

    // 組裝title、meta_description
    const productTranslationInput = ['title', 'meta_description']
            .map(key => {//輪流把title、meta_description帶入流程
              const value = row[key]; //取得中文翻譯
              if (!value || !value.trim()) return null; //如果翻譯不存在就返回null
              const match = translatableContent.find(item => item.key === key); //存在的情況下找到Shopify上相應的欄位
              if (!match) {
                console.warn(`⚠️ 找不到 ${key} 的 digest`);
                return null;
              }
              return {
                locale: "ja",
                key,
                value,
                translatableContentDigest: match.digest, //帶入digest
              };
            })
            .filter(Boolean);

    // 組裝description
    const html = resolveProductDescription(row);
          if (html) {
            // console.log(`📝 轉換後 HTML:\n${html}`);
            const match = translatableContent.find(item => item.key === 'body_html');
            if (match) {
              productTranslationInput.push({
                locale: "ja",
                key: 'body_html',
                value: html,
                translatableContentDigest: match.digest,
              });
            } else {
              console.warn(`⚠️ 找不到 body_html 的 digest`);
            }
          }

    return productTranslationInput;

}
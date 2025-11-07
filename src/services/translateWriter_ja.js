// services/translateWriter.js
import groupByHandle from '../helper/groupByHandle.js';
import buildTranslateData from '../helper/buildTranslateData_ja.js';
import textToTextJson from '../helper/textToTextJson.js';

import getProductDataByHandle from '../API/getProductDataByHandle.js';
import getTranslatableResourcesByIds from '../API/getTranslatableResourcesByIds.js';
import getProductMetafields from '../API/getProductMetafields.js';
import translationsRegister from '../API/translationsRegister.js';

export default async function translateWriter_ja(rows) {
  const summaries = [];

  try {
    const groupedProducts = groupByHandle(rows);

    for (const [handle, productRows] of Object.entries(groupedProducts)) {
      const summary = {
        handle,
        productId: null,
        rows: productRows.length,
        ok: true,
        productCore: { ok: 0, fail: 0, messages: [] },
        metafields: { ok: 0, fail: 0, messages: [] },
      };

      console.log(`⬇️ 開始處理 ${handle} 翻譯上傳`);

      try {
        for (const row of productRows) {
          // 取得產品ID
          const product = await getProductDataByHandle(handle);
          const productID = product.id;
          summary.productId = productID;
          console.log("✅已取得產品ID：", productID);

          // 產品本體翻譯
          try {
            const translatableData = await getTranslatableResourcesByIds(productID);
            const translatableContent = translatableData?.[0]?.translatableContent ?? [];

            const translateData = buildTranslateData(row, translatableContent);
            if (translateData?.length) {
              await translationsRegister(productID, translateData);
              console.log("✅上傳產品原始翻譯欄位成功");
              summary.productCore.ok += 1;
              summary.productCore.messages.push(`core ok (${translateData.length})`);
            } else {
              summary.productCore.messages.push("core skipped (empty)");
            }
          } catch (error) {
            console.error("❌ 上傳產品原始翻譯欄位失敗 " + error.message);
            summary.ok = false;
            summary.productCore.fail += 1;
            summary.productCore.messages.push(`core fail: ${error.message}`);
          }

          // Metafields
          try {
            const productMetafields = await getProductMetafields(productID);

            const metafields = productMetafields.filter((mf) => {
              const key = `${mf.namespace}.${mf.key}`;
              const value = row[key];
              return typeof value === "string" && value.trim() !== "";
            });

            for (const mf of metafields) {
              const key = `${mf.namespace}.${mf.key}`;
              const typeKey = `${key}_type`;

              const originalText = row[key];
              const inputType = String(row[typeKey] ?? 'paragraph').trim();

              const translatedValue =
                key === "content.specification_html" || key === "theme.shipping_time"
                  ? originalText
                  : JSON.stringify(textToTextJson(originalText, inputType));

              try {
                const mfDigest = await getTranslatableResourcesByIds(mf.id);
                const valueDigest = mfDigest?.[0]?.translatableContent?.find((it) => it.key === "value");

                if (!valueDigest) {
                  console.warn(`⚠️ 找不到 digest for metafield ${key}`);
                  summary.ok = false;
                  summary.metafields.fail += 1;
                  summary.metafields.messages.push(`no digest for ${key}`);
                  continue;
                }

                const metafieldInput = [
                  { locale: "ja", key: "value", value: translatedValue, translatableContentDigest: valueDigest.digest },
                ];

                await translationsRegister(mf.id, metafieldInput);
                console.log(`✅ 翻譯欄位 ${mf.namespace}.${mf.key} 成功`);
                summary.metafields.ok += 1;
                summary.metafields.messages.push(`mf ok: ${key}`);
              } catch (error) {
                console.error(`❌ 上傳 Metafields 翻譯欄位失敗 ` + error.message);
                summary.ok = false;
                summary.metafields.fail += 1;
                summary.metafields.messages.push(`mf fail ${key}: ${error.message}`);
              }
            }
          } catch (error) {
            console.error(`❌ 取得 Metafields 失敗 ` + error.message);
            summary.ok = false;
            summary.metafields.messages.push(`list metafields fail: ${error.message}`);
          }
        }
      } catch (error) {
        console.error(`❌ 處理 ${handle} 失敗 ` + error.message);
        summary.ok = false;
        summary.productCore.messages.push(`handle fail: ${error.message}`);
      }

      summaries.push(summary);
    }

    // ⭐ 成功路徑一定要回傳
    return { ok: summaries.every((s) => s.ok), summaries };
  } catch (error) {
    console.error(`❌ translateWriter 流程發生錯誤 ` + error.message);
    return { ok: false, error: error.message, summaries: [] };
  }
}

import fs from "fs";
import path from "path";
import getTranslatableResourcesByIds from "./getTranslatableResourcesById_forBulk.js";

const outDir = path.resolve("./output");
const data = JSON.parse(fs.readFileSync(path.join(outDir, "bulk_products_metafields.json"), "utf-8"));

// ✅ 只保留：content.* 或 theme.shipping_time
const metafieldIds = [
  ...new Set(
    data
      .filter((x) => {
        if (!x.id?.startsWith("gid://shopify/Metafield/")) return false;
        if (x.namespace === "content") return true;
        if (x.namespace === "theme" && x.key === "shipping_time") return true;
        return false;
      })
      .map((x) => x.id)
  ),
];

console.log(`📦 將查詢 ${metafieldIds.length} 筆 metafield（僅限 content.* 與 theme.shipping_time）`);

const chunk = (arr, size) =>
  arr.reduce((acc, _, i) => (i % size ? acc : [...acc, arr.slice(i, i + size)]), []);

const batches = chunk(metafieldIds, 200);

const results = {}; // { [metafieldId]: translatedValue }

for (let i = 0; i < batches.length; i++) {
  try {
    // ✅ 明確指定 zh-TW，且新版函式回傳 { resourceId, value, locale }
    const res = await getTranslatableResourcesByIds(batches[i], "zh-TW");

    for (const item of res) {
      const { resourceId, value } = item || {};
      if (resourceId && value) results[resourceId] = String(value);
    }

    console.log(`✅ 第 ${i + 1}/${batches.length} 批完成（累積 ${Object.keys(results).length} 筆）`);
  } catch (err) {
    console.error(`❌ 第 ${i + 1} 批失敗：`, err?.message || err);
  }

  // 節流避免打到速率限制（可視情況調整）
  await new Promise((r) => setTimeout(r, 300));
}

const outPath = path.join(outDir, "metafield_translations_zhTW.json");
fs.writeFileSync(outPath, JSON.stringify(results, null, 2), "utf-8");
console.log(`💾 已輸出：${outPath}`);

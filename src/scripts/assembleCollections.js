import fs from "fs";
import path from "path";

const mainPath = path.resolve("./output/bulk_products_main.products_only.json");
const relPath  = path.resolve("./output/bulk_products_collections.json");
const outPath  = path.resolve("./output/bulk_products_with_collections.json");

const main = JSON.parse(fs.readFileSync(mainPath, "utf-8"));
const rel  = JSON.parse(fs.readFileSync(relPath, "utf-8"));

const map = new Map(main.map(p => [p.id, { ...p, collections: [] }]));

for (const row of rel) {
  if (!row?.__parentId) continue;
  const product = map.get(row.__parentId);
  if (!product) continue;

  const isCollection = typeof row.id === "string" && row.id.startsWith("gid://shopify/Collection/");
  if (isCollection) {
    product.collections.push({ id: row.id, title: row.title, handle: row.handle });
  }
}

// 去重 + 排序（可選）
for (const p of map.values()) {
  const seen = new Set();
  p.collections = p.collections.filter(c => (seen.has(c.id) ? false : (seen.add(c.id), true)));
  p.collections.sort((a, b) => a.title.localeCompare(b.title));
}

const assembled = Array.from(map.values());
fs.writeFileSync(outPath, JSON.stringify(assembled, null, 2), "utf-8");
console.log("✅ 已組裝：", assembled.length, "筆");
console.log("💾 輸出：", outPath);

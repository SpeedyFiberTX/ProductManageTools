import fs from "fs";
import path from "path";

const outDir = path.resolve("./output");
const mainBase = JSON.parse(fs.readFileSync(path.join(outDir, "bulk_products_main.products_only.json"), "utf-8"));
const variantsRaw = JSON.parse(fs.readFileSync(path.join(outDir, "bulk_products_variants.json"), "utf-8"));

// 以 product.id 作為 key 的主地圖
const productsMap = new Map(mainBase.map(p => [
  p.id,
  { ...p, options: [], variants: [] }
]));

// 暫存 option 與其對應的 productId
const optionById = new Map(); // optionId -> { productId, optionObj }

for (const row of variantsRaw) {
  // 1) ProductOption：__parentId 指向 Product
  if (typeof row.id === "string" && row.id.startsWith("gid://shopify/ProductOption/") && row.__parentId) {
    const product = productsMap.get(row.__parentId);
    if (product) {
      const opt = {
        id: row.id,
        name: row.name,
        position: row.position ?? null,
        optionValues: []  // 先空，等會接 ProductOptionValue
      };
      product.options.push(opt);
      optionById.set(row.id, { productId: row.__parentId, optionObj: opt });
    }
    continue;
  }

  // 2) ProductOptionValue：__parentId 指向 ProductOption
  if (typeof row.id === "string" && row.id.startsWith("gid://shopify/ProductOptionValue/") && row.__parentId) {
    const optRef = optionById.get(row.__parentId);
    if (optRef) {
      optRef.optionObj.optionValues.push({ id: row.id, name: row.name });
    }
    continue;
  }

  // 3) ProductVariant：__parentId 指向 Product
  if (typeof row.id === "string" && row.id.includes("ProductVariant/") && row.__parentId) {
    const product = productsMap.get(row.__parentId);
    if (product) {
      product.variants.push({
        id: row.id,
        title: row.title,
        sku: row.sku,
        price: row.price,
        compareAtPrice: row.compareAtPrice,
        barcode: row.barcode,
        selectedOptions: row.selectedOptions || [],
        inventoryItem: row.inventoryItem || null
      });
    }
    continue;
  }
}

// 排序（可選）
for (const p of productsMap.values()) {
  p.options.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  p.variants.sort((a, b) => String(a.sku || "").localeCompare(String(b.sku || "")));
}

// 輸出
const merged = Array.from(productsMap.values());
const outPath = path.join(outDir, "products_with_variants.json");
fs.writeFileSync(outPath, JSON.stringify(merged, null, 2), "utf-8");
console.log("✅ 已組裝 products_with_variants.json，產品數：", merged.length);
console.log("💾 輸出：", outPath);

import fs from "fs";
import path from "path";

const input = process.argv[2] || "./output/bulk_products_main.json";
const out = input.replace(/\.json$/i, ".products_only.json");

const rows = JSON.parse(fs.readFileSync(path.resolve(input), "utf-8"));
const productsOnly = rows.filter(
  r =>
    typeof r?.id === "string" &&
    r.id.startsWith("gid://shopify/Product/") &&
    (r.__parentId === null || r.__parentId === undefined)
);

fs.writeFileSync(path.resolve(out), JSON.stringify(productsOnly, null, 2), "utf-8");
console.log("✅ 產品總數：", productsOnly.length);
console.log("💾 已輸出：", out);

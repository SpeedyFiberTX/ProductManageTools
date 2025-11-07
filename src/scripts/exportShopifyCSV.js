import fs from "fs";
import path from "path";

const outDir = path.resolve("./output");
const products = JSON.parse(fs.readFileSync(path.join(outDir, "products_full.json"), "utf-8"));

const headers = [
  "Handle",
  "Title",
  "Description",
  "SEO Title",
  "SEO Description",
  "Tags",
  "Status",
  "Vendor",
  "Type",
  "Template",
];

function esc(v) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const lines = [];
for (const p of products) {
  const handle = p.handle || "";
  const title = p.title || "";
  const description = p.description || "";
  const seoTitle = p?.seo?.title ?? "";
  const seoDesc = p?.seo?.description ?? "";
  const tags = Array.isArray(p.tags) ? p.tags.join(", ") : (p.tags || "");
  const status = p.status || "";
  const vendor = p.vendor || "";
  const type = p.productType || "";
  const template = p.templateSuffix || "";

  const row = [
    handle,
    title,
    description,
    seoTitle,
    seoDesc,
    tags,
    status,
    vendor,
    type,
    template,
  ].map(esc).join(",");

  lines.push(row);
}

const csv = headers.map(esc).join(",") + "\n" + lines.join("\n");
const outCsvPath = path.join(outDir, "Shopify_Export_Simple.csv");
fs.writeFileSync(outCsvPath, csv, "utf-8");
console.log("✅ 已輸出 CSV：", outCsvPath);
console.log("📊 產品筆數：", products.length);

import fs from "fs";
import path from "path";

const outDir = path.resolve("./output");
const inputPath = path.join(outDir, "products_full.json");

// 讀入合併後含 metafields 的產品檔
if (!fs.existsSync(inputPath)) {
  console.error("❌ 找不到檔案：", inputPath);
  process.exit(1);
}
const products = JSON.parse(fs.readFileSync(inputPath, "utf-8"));

// CSV 轉義
function esc(v) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/* ========== 1) 長表輸出（每個 metafield 一列） ========== */
(function exportLong() {
  const headers = ["Handle", "Namespace", "Key", "Type", "Value"];
  const lines = [];

  for (const p of products) {
    const handle = p.handle || "";
    const mfs = Array.isArray(p.metafields) ? p.metafields : [];
    for (const mf of mfs) {
      const row = [
        handle,
        mf?.namespace ?? "",
        mf?.key ?? "",
        mf?.type ?? "",
        mf?.value ?? "",
      ].map(esc).join(",");
      lines.push(row);
    }
  }

  const csv = headers.map(esc).join(",") + "\n" + lines.join("\n");
  const outCsvPath = path.join(outDir, "Metafields_Export_Long.csv");
  fs.writeFileSync(outCsvPath, csv, "utf-8");
  console.log("✅ 已輸出（長表）：", outCsvPath, "｜列數：", lines.length);
})();

/* ========== 2) 寬表輸出（每個產品一列、每個 metafield 變欄位） ========== */
/** 欄名規則： `${namespace}.${key} (${type})`
 *  - 可避免不同 type 同名鍵相衝
 *  - 若未來想改成 `${namespace}.${key}`，把下面 titleFor() 改掉即可
 */
(function exportWide() {
  const titleFor = (mf) => {
    const ns = mf?.namespace ?? "";
    const key = mf?.key ?? "";
    const type = mf?.type ?? "";
    // 乾淨的欄位名稱（避免逗號與換行）
    return `${ns}.${key} (${type})`;
  };

  // 先掃一遍蒐集所有會出現的欄位集合與順序
  const allCols = new Map(); // colName -> true（保持插入順序）
  for (const p of products) {
    const mfs = Array.isArray(p.metafields) ? p.metafields : [];
    for (const mf of mfs) {
      const col = titleFor(mf);
      if (!allCols.has(col)) allCols.set(col, true);
    }
  }

  // 組 headers
  const dynamicCols = Array.from(allCols.keys());
  const headers = ["Handle", ...dynamicCols];

  // 產列
  const lines = [];
  for (const p of products) {
    const handle = p.handle || "";
    const mfs = Array.isArray(p.metafields) ? p.metafields : [];

    // 先做一個 lookup：同欄位若有多個值，保留第一個；也可改成合併用 " | "
    const valueMap = new Map();
    for (const mf of mfs) {
      const col = titleFor(mf);
      if (!valueMap.has(col)) {
        valueMap.set(col, mf?.value ?? "");
      }
    }

    const rowArr = [handle, ...dynamicCols.map(c => valueMap.get(c) ?? "")];
    const row = rowArr.map(esc).join(",");
    lines.push(row);
  }

  const csv = headers.map(esc).join(",") + "\n" + lines.join("\n");
  const outCsvPath = path.join(outDir, "Metafields_Export_Wide.csv");
  fs.writeFileSync(outCsvPath, csv, "utf-8");
  console.log("✅ 已輸出（寬表）：", outCsvPath, "｜產品數：", products.length, "｜欄數：", headers.length);
})();

import fs from "fs";
import path from "path";
import addNotionPageToDatabase from "../API/notion/add-page-to-database.js";

const outDir = path.resolve("./output");
const srcPath = path.join(outDir, "products_full_with_i18n.json");
const outPath = path.join(outDir, "notion_products.json");

const products = JSON.parse(fs.readFileSync(srcPath, "utf-8"));
const STATUS_MAP = { ACTIVE: "active", DRAFT: "draft", ARCHIVED: "archived" };

/* ---------------------------- 參數 ---------------------------- */
const MAX_TEXT_LEN = 2000; // 超過即改為提示文字
const OVERFLOW_MSG = "超過字數限制，請向管理員索取原始資料或上官網查詢";

/* ---------------------------- 小工具 ---------------------------- */
// 新增：簡易 HTML 轉純文字
function htmlToText(html) {
  if (!html) return "";
  try {
    return html
      .replace(/<br\s*\/?>/gi, "\n")       // 換行
      .replace(/<\/p>/gi, "\n")            // 段落
      .replace(/<\/li>/gi, "\n")           // 清單項目換行
      .replace(/<li>/gi, "• ")             // 清單項目前綴
      .replace(/<[^>]+>/g, "")             // 移除所有 HTML 標籤
      .replace(/\n{2,}/g, "\n")            // 多重換行壓縮
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .trim();
  } catch {
    return html;
  }
}

function safeText(s, limit = MAX_TEXT_LEN) {
  const str = String(s ?? "");
  return str.length > limit ? OVERFLOW_MSG : str;
}

const titleProp = (s) => ({
  type: "title",
  title: [{ type: "text", text: { content: safeText(s) } }],
});

const rt = (s) => ({
  type: "rich_text",
  rich_text: [{ type: "text", text: { content: safeText(s) } }],
});

const numProp = (n) => ({
  type: "number",
  number: n === null || n === undefined || n === "" ? null : Number(n),
});

// 將可能為 Lexical Rich JSON 的內容轉為純文字（並做字數檢查）
function toPlainTextFromRich(value) {
  if (value == null) return "";
  const apply = (txt) => safeText(txt); // 統一套用字數檢查

  if (typeof value === "string") {
    const s = value.trim();
    if ((s.startsWith("{") && s.endsWith("}")) || (s.startsWith("[") && s.endsWith("]"))) {
      try {
        return toPlainTextFromRich(JSON.parse(s));
      } catch {
        return apply(s);
      }
    }
    return apply(s);
  }

  if (Array.isArray(value)) {
    return apply(value.map(toPlainTextFromRich).filter(Boolean).join("\n").trim());
  }

  if (typeof value === "object") {
    const lines = [];
    const buf = [];
    const flushLine = () => {
      const line = buf.join("").trim();
      if (line) lines.push(line);
      buf.length = 0;
    };
    const walk = (node) => {
      if (!node) return;
      if (node.type === "text") {
        buf.push(String(node.value ?? node.text ?? ""));
      } else if (node.type === "list-item") {
        if (Array.isArray(node.children)) node.children.forEach(walk);
        flushLine();
      } else if (node.children && Array.isArray(node.children)) {
        node.children.forEach(walk);
        if (node.type === "paragraph" || node.type === "quote") flushLine();
      } else if ("text" in node || "value" in node) {
        buf.push(String(node.text ?? node.value ?? ""));
      }
    };

    if (value.type && value.children) {
      walk(value);
      flushLine();
      return apply(lines.join("\n").trim() || buf.join("").trim());
    }

    if ("text" in value || "value" in value) {
      return apply(String(value.text ?? value.value ?? "").trim());
    }
    return "";
  }

  return apply(String(value ?? ""));
}

// 原清洗（將 JSON 字串快速清為字串）＋字數檢查
const cleanValue = (v) => {
  if (v === null || v === undefined) return "";
  const s = String(v).trim();
  if ((s.startsWith("[") && s.endsWith("]")) || (s.startsWith("{") && s.endsWith("}"))) {
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return safeText(parsed.join(", "));
      return safeText(JSON.stringify(parsed));
    } catch {
      return safeText(s);
    }
  }
  return safeText(s);
};

const mfRaw = (p, key) => cleanValue(p?.metafields?.[key]?.value ?? "");
const mfZh = (p, key) => cleanValue(p?.metafields?.[key]?.i18n?.["zh-TW"] ?? "");
const i18nZh = (p, key) => cleanValue(p?.i18n?.["zh-TW"]?.[key] ?? "");

// 可能為 Rich JSON → 轉純文字（含字數檢查）
const mfRichPlain = (p, key) => toPlainTextFromRich(p?.metafields?.[key]?.value ?? "");
const mfRichPlainZh = (p, key) => toPlainTextFromRich(p?.metafields?.[key]?.i18n?.["zh-TW"] ?? "");
const i18nRichPlainZh = (p, key) => toPlainTextFromRich(p?.i18n?.["zh-TW"]?.[key] ?? "");

// —— 進度條工具 —— //
function formatMs(ms) {
  if (!isFinite(ms) || ms < 0) return "--:--";
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

function renderProgress(done, total, startTime, okCount, failCount) {
  if (!process.stdout.isTTY) {
    console.log(`Progress: ${done}/${total} (ok: ${okCount}, fail: ${failCount})`);
    return;
  }
  const pct = total ? Math.floor((done / total) * 100) : 0;
  const width = 30;
  const filled = Math.floor((pct / 100) * width);
  const bar = "█".repeat(filled) + "─".repeat(width - filled);

  const elapsed = Date.now() - startTime;
  const avgPerItem = done > 0 ? elapsed / done : 0;
  const remaining = Math.max(total - done, 0) * avgPerItem;

  const msg =
    `${String(pct).padStart(3, " ")}% |${bar}| ` +
    `${done}/${total}  ok:${okCount}  fail:${failCount}  ` +
    `ETA ${formatMs(remaining)}`;

  process.stdout.write(`\r${msg}`);
}

/* 將 images URL 陣列轉為 Notion files 陣列（external） */
function makeNotionFiles(urls, limit = 50) {
  const list = Array.isArray(urls) ? urls : [];
  const files = [];
  for (let i = 0; i < list.length && i < limit; i++) {
    const u = String(list[i] ?? "").trim();
    if (!u) continue;
    let name = `media_${i + 1}`;
    try {
      const pathname = new URL(u).pathname;
      const last = pathname.split("/").pop();
      if (last) name = last;
    } catch {
      const last = u.split("?")[0].split("/").pop();
      if (last) name = last;
    }
    files.push({ name, external: { url: u } });
  }
  return files;
}

/* ---------------------------- 主轉換 ---------------------------- */
const today = new Date().toISOString().split("T")[0]; // 例如 "2025-10-30"

const notionRows = products.map((p) => {
  const firstV = (p.variants || [])[0] || {}; // ✅ 抓第一筆 variant

  const data = {
    // 基本欄位
    "Status": { type: "status", status: { name: STATUS_MAP[p.status] || "draft" } },
    "Title": titleProp(p.title || ""),
    "Price(USD)": numProp(firstV.price || ""),
    "SKU": rt(firstV.sku || ""),
    "Type": rt(p.productType || ""),
    "Template": rt(p.templateSuffix || ""),
    "Handle": rt(p.handle || ""),
    "Vendor": rt(p.vendor || ""),
    "Collections": rt((p.collections || []).join(", ")),
    "Description": rt(p.descriptionHtml || ""),
    "Description_type": { type: "select", select: { name: "html" } },
    "Description_t": rt(htmlToText(p.descriptionHtml || "")),

    // Notion 檔案與媒體（把 p.images URL 塞進來）
    "media": { type: "files", files: makeNotionFiles(p.images, 50) },

    // 備份日期
    "備份日期": { type: "date", date: { start: today } },

    // 翻譯欄位（中文優先，沒中文→空白）
    "中文 Title": rt(i18nZh(p, "title")),
    "日文 Title": rt(p?.i18n?.["ja"]?.["title"] || ""),
    "SEO Title": rt(p?.seo?.title || ""),
    "SEO Description": rt(p?.seo?.description || ""),
    "中文 SEO Description": rt(i18nZh(p, "meta_description")),

    // 發貨時間
    "Shipping Time": rt(mfRaw(p, "theme.shipping_time")),
    "發貨時間": rt(mfZh(p, "theme.shipping_time") || i18nZh(p, "metafields.theme.shipping_time")),

    "是否開啟詢價": rt(mfRaw(p, "theme.inquiry") || "FALSE"),
    "Tags": rt((p.tags || []).join(", ")),
    "Compatibility": rt(mfRaw(p, "custom.compatibility")),

    // 標籤 Label 1~4
    "Label 1": rt(mfRaw(p, "theme.label_1")),
    "Label 2": rt(mfRaw(p, "theme.label_2")),
    "Label 3": rt(mfRaw(p, "theme.label_3")),
    "Label 4": rt(mfRaw(p, "theme.label_4")),

    // 產品介紹（中英分開）——保留原始值
    "Highlight": rt(mfRaw(p, "content.highlight")),
    "Highlight_type": { type: "select", select: { name: "rich text" } },
    "中文 Highlight": rt(mfZh(p, "content.highlight") || i18nZh(p, "metafields.content.highlight")),
    "中文 Highlight_type": { type: "select", select: { name: "rich text" } },

    "Application": rt(mfRaw(p, "content.application")),
    "Application_type": { type: "select", select: { name: "rich text" } },
    "中文 Application": rt(mfZh(p, "content.application") || i18nZh(p, "metafields.content.application")),
    "中文 Application_type": { type: "select", select: { name: "rich text" } },

    "Feature": rt(mfRaw(p, "content.features")),
    "Feature_type": { type: "select", select: { name: "rich text" } },
    "中文 Feature": rt(mfZh(p, "content.features") || i18nZh(p, "metafields.content.features")),
    "中文 Feature_type": { type: "select", select: { name: "rich text" } },

    "Specification": rt(mfRaw(p, "content.specification")),
    "Specification_type": { type: "select", select: { name: "rich text" } },
    "中文 Specification": rt(mfZh(p, "content.specification") || i18nZh(p, "metafields.content.specification")),
    "中文 Specification_type": { type: "select", select: { name: "rich text" } },

    "Specification_html": rt(mfRaw(p, "content.specification_html")),
    "中文 Specification_html": rt(
      mfZh(p, "content.specification_html") || i18nZh(p, "metafields.content.specification_html")
    ),

    // 產品介紹（純文字版 *_t）——轉純文字＋字數檢查
    "Highlight_t": rt(mfRichPlain(p, "content.highlight")),
    "中文 Highlight_t": rt(
      mfRichPlainZh(p, "content.highlight") || i18nRichPlainZh(p, "metafields.content.highlight")
    ),
    "Application_t": rt(mfRichPlain(p, "content.application")),
    "中文 Application_t": rt(
      mfRichPlainZh(p, "content.application") || i18nRichPlainZh(p, "metafields.content.application")
    ),
    "Feature_t": rt(mfRichPlain(p, "content.features")),
    "中文 Feature_t": rt(
      mfRichPlainZh(p, "content.features") || i18nRichPlainZh(p, "metafields.content.features")
    ),
    "Specification_t": rt(mfRichPlain(p, "content.specification")),
    "中文 Specification_t": rt(
      mfRichPlainZh(p, "content.specification") || i18nRichPlainZh(p, "metafields.content.specification")
    ),

    // 中文 Description
    "中文 Description": rt(i18nZh(p, "body_html")),
    "中文 Description_type": { type: "select", select: { name: "html" } },
    "中文 Description_t": rt(htmlToText(i18nZh(p, "body_html"))),
  };

  // Filter 群組
  const filters = {
    "#Transceiver Type": mfRaw(p, "filter.transceiverType"),
    "#Fiber Mode": mfRaw(p, "filter.fiberMode"),
    "#Connector Type": mfRaw(p, "filter.connectorType"),
    "#ConnectorA": mfRaw(p, "filter.connector_a"),
    "#Polish Type": mfRaw(p, "filter.polishType"),
    "#Transmission Mode": mfRaw(p, "filter.transmissionMode"),
    "#Insertion Loss Grade": mfRaw(p, "filter.insertionLossGrade"),
    "#Transmission Distance": mfRaw(p, "filter.transmissionDistance"),
    "#Data Rate (Gbps)": mfRaw(p, "filter.data_rate_gbps"),
    "#Branch Type": mfRaw(p, "filter.branchType"),
    "#Fiber Count": mfRaw(p, "filter.fiberCount"),
    "#Connector Gender": mfRaw(p, "filter.connectorGender"),
    "#Connector Color": mfRaw(p, "filter.connectorColor"),
    "#Jacket Color": mfRaw(p, "filter.jacketColor"),
    "#Jacket": mfRaw(p, "filter.jacket"),
    "#Wavelength": mfRaw(p, "filter.wavelength_filter"),
    "#Polarity": mfRaw(p, "filter.polarity"),
    "#Body Type": mfRaw(p, "filter.bodyType"),
    "#Gender": mfRaw(p, "filter.gender"),
  };
  Object.entries(filters).forEach(([k, v]) => (data[k] = rt(v)));

  // Table 規格表
  for (let i = 1; i <= 40; i++) {
    const key = `table.custom_${i}`;
    data[key] = rt(mfRaw(p, key));
  }

  return data;
});

/* ---------------------------- 輸出 ---------------------------- */
fs.writeFileSync(outPath, JSON.stringify(notionRows, null, 2), "utf-8");
console.log("✅ 已整理成完整 Notion JSON（含備份日期、*_t 轉譯欄位、media、字數限制保護）");
console.log("💾 輸出：", outPath);

/* ---------------------------- 打 API ---------------------------- */
(async () => {
  const total = notionRows.length;
  const start = Date.now();

  console.log(`🚀 開始上傳 ${total} 筆產品至 Notion...`);
  let okCount = 0;
  let failCount = 0;
  const fails = [];

  for (let i = 0; i < total; i++) {
    const props = notionRows[i];
    try {
      await addNotionPageToDatabase(props);
      okCount++;
    } catch (err) {
      failCount++;
      const handle = props?.Handle?.rich_text?.[0]?.text?.content ?? "";
      const title =
        props?.Title?.title?.map((t) => t?.text?.content).filter(Boolean).join("") ?? "";
      fails.push({
        index: i + 1,
        title,
        handle,
        error: err?.response?.data ?? err?.message ?? String(err),
      });
    }

    // 畫進度條
    renderProgress(i + 1, total, start, okCount, failCount);

    // 速率限制，避免 429
    await new Promise((r) => setTimeout(r, 400));
  }

  process.stdout.write("\n");

  if (fails.length) {
    const failPath = path.join(outDir, `notion_upload_fail_${today}.json`);
    fs.writeFileSync(failPath, JSON.stringify(fails, null, 2), "utf-8");
    console.warn(`⚠️ 失敗 ${failCount} 筆，已輸出失敗清單：${failPath}`);
  }

  console.log(`🎉 完成！成功 ${okCount}、失敗 ${failCount}`);
})();

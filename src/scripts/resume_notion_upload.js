// resume_notion_upload.js
import fs from "fs";
import path from "path";
import url from "url";
import addNotionPageToDatabase from "../API/notion/add-page-to-database.js";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

/** ===== 可調參數 ===== */
const OUT_DIR = getArg("--outdir") || path.resolve(__dirname, "../../output");
const NOTION_ROWS_PATH = path.join(OUT_DIR, "notion_products.json");
const FAIL_PATH = getArg("--fail") || findLatestFailFile(OUT_DIR);
const RATE_LIMIT_MS = Number(getArg("--sleep") || 400);      // 每筆間隔，避免 429
const RETRIES = Number(getArg("--retries") || 3);            // 429/5xx 重試次數（指數退避）
/** ==================== */

if (!fs.existsSync(NOTION_ROWS_PATH)) {
  console.error("❌ 找不到 notion_products.json：", NOTION_ROWS_PATH);
  process.exit(1);
}
if (!FAIL_PATH) {
  console.error("❌ 找不到失敗清單（--fail 未指定且資料夾內也沒找到符合名稱的檔案）。");
  process.exit(1);
}

const notionRows = JSON.parse(fs.readFileSync(NOTION_ROWS_PATH, "utf-8"));
const failList = JSON.parse(fs.readFileSync(FAIL_PATH, "utf-8"));

if (!Array.isArray(notionRows) || !Array.isArray(failList)) {
  console.error("❌ 檔案格式錯誤：notion_products.json 或 失敗清單不是陣列。");
  process.exit(1);
}

console.log("📄 使用資料：");
console.log(" - notion_products.json:", NOTION_ROWS_PATH);
console.log(" - 失敗清單：", FAIL_PATH);
console.log(" - 總筆數（欲補上傳）：", failList.length);

const handleToIndex = buildHandleIndex(notionRows);

const toRetry = [];
for (const f of failList) {
  // 先用 index 對；不行再用 handle 對
  let idx = Number(f.index) - 1;
  if (!(idx >= 0 && idx < notionRows.length)) {
    const h = f?.handle || "";
    if (h && h in handleToIndex) idx = handleToIndex[h];
  }
  if (idx >= 0 && idx < notionRows.length) {
    toRetry.push({ idx, props: notionRows[idx] });
  } else {
    console.warn(`⚠️ 找不到對應 props：index=${f.index} handle=${f?.handle || ""}`);
  }
}

if (!toRetry.length) {
  console.log("✅ 失敗清單中沒有能對應到 props 的項目（可能都已手動補上傳）。");
  process.exit(0);
}

console.log(`🔁 準備補上傳 ${toRetry.length} 筆（原檔共 ${notionRows.length} 筆）…`);

const start = Date.now();
let ok = 0;
let fail = 0;
const stillFails = [];

for (let i = 0; i < toRetry.length; i++) {
  const { idx, props } = toRetry[i];

  try {
    await withRetry(() => addNotionPageToDatabase(props), { retries: RETRIES });
    ok++;
  } catch (err) {
    fail++;
    const handle = props?.Handle?.rich_text?.[0]?.text?.content ?? "";
    const title = (props?.Title?.title || [])
      .map((t) => t?.text?.content)
      .filter(Boolean)
      .join("");
    stillFails.push({
      index: idx + 1,
      title,
      handle,
      error: err?.response?.data ?? err?.message ?? String(err),
    });
  }

  renderProgress(i + 1, toRetry.length, start, ok, fail);
  await sleep(RATE_LIMIT_MS);
}

process.stdout.write("\n");
if (stillFails.length) {
  const outFail = path.join(
    OUT_DIR,
    `notion_upload_fail_retry_${new Date().toISOString().split("T")[0]}.json`
  );
  fs.writeFileSync(outFail, JSON.stringify(stillFails, null, 2), "utf-8");
  console.warn(`⚠️ 本次仍失敗 ${fail} 筆，已輸出：${outFail}`);
}
console.log(`🎉 補上傳完成！成功 ${ok}、失敗 ${fail}`);

/* -------------------- 小工具 -------------------- */

function getArg(flag) {
  const i = process.argv.indexOf(flag);
  if (i >= 0 && i < process.argv.length - 1) return process.argv[i + 1];
  return null;
}

function findLatestFailFile(dir) {
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir)
    .filter((f) => /^notion_upload_fail_.*\.json$/.test(f))
    .map((f) => ({ f, mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  return files[0] ? path.join(dir, files[0].f) : null;
}

function buildHandleIndex(rows) {
  const map = {};
  for (let i = 0; i < rows.length; i++) {
    const handle = rows[i]?.Handle?.rich_text?.[0]?.text?.content;
    if (handle) map[handle] = i;
  }
  return map;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withRetry(fn, { retries = 3, base = 400 } = {}) {
  let err;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      const code = e?.response?.status || 0;
      if (code === 429 || (code >= 500 && code < 600)) {
        // 指數退避
        await sleep(base * Math.pow(2, i));
        err = e;
        continue;
      }
      throw e; // 4xx 驗證錯等，直接拋出
    }
  }
  throw err;
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
  const avgPer = done > 0 ? elapsed / done : 0;
  const remain = Math.max(total - done, 0) * avgPer;

  const msg =
    `${String(pct).padStart(3, " ")}% |${bar}| ` +
    `${done}/${total}  ok:${okCount}  fail:${failCount}  ` +
    `ETA ${formatMs(remain)}`;
  process.stdout.write(`\r${msg}`);
}

function formatMs(ms) {
  if (!isFinite(ms) || ms < 0) return "--:--";
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

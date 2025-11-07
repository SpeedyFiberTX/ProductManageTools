import { GraphQLClient, gql } from "graphql-request";
import fs from "fs";
import path from "path";
import https from "https";

/** 進度：格式化時間 */
function fmtDuration(sec) {
  const s = Math.floor(sec % 60);
  const m = Math.floor((sec / 60) % 60);
  const h = Math.floor(sec / 3600);
  return (h ? `${h}:` : "") + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}

/** 過濾：只保留產品本體 */
function filterProductsOnly(rows = []) {
  return rows.filter(
    (r) =>
      typeof r?.id === "string" &&
      r.id.startsWith("gid://shopify/Product/") &&
      (r.__parentId === null || r.__parentId === undefined)
  );
}

/** 下載工具 */
async function downloadToFile(url, filePath) {
  const file = fs.createWriteStream(filePath);
  await new Promise((resolve, reject) => {
    https.get(url, (res) => {
      res.pipe(file);
      file.on("finish", () => file.close(resolve));
    }).on("error", reject);
  });
}

/**
 * 執行 Bulk Operation
 * @param {string} SHOP
 * @param {string} TOKEN
 * @param {string} query - Bulk 查詢（不用包 mutation）
 * @param {string} outputName - 輸出檔名前綴
 * @param {object} options
 *   - pollIntervalMs: number = 5000
 *   - showProgress: boolean = true
 *   - productsOnly: boolean = false  // 完成後自動輸出 *.products_only.json
 */
export async function runBulkOperation(
  SHOP,
  TOKEN,
  query,
  outputName,
  { pollIntervalMs = 5000, showProgress = true, productsOnly = false } = {}
) {
  const graphqlEndpoint = `https://${SHOP}/admin/api/2025-07/graphql.json`;
  const client = new GraphQLClient(graphqlEndpoint, {
    headers: {
      "X-Shopify-Access-Access": TOKEN, // 打錯容易：正確是下行
      "X-Shopify-Access-Token": TOKEN,
      "Content-Type": "application/json",
    },
  });

  // 啟動 bulk job
  const startMutation = gql`
    mutation {
      bulkOperationRunQuery(query: """${query}""") {
        bulkOperation { id status }
        userErrors { field message }
      }
    }
  `;
  console.log(`🚀 [${outputName}] 正在啟動 Bulk Operation...`);
  const startRes = await client.request(startMutation);
  const errors = startRes.bulkOperationRunQuery.userErrors;
  if (errors?.length) {
    console.error(`❌ [${outputName}] 啟動失敗：`, errors);
    return;
  }

  // 監控狀態
  const statusQuery = gql`{ currentBulkOperation { id status errorCode objectCount url createdAt } }`;
  const t0 = Date.now();
  let lastCount = 0;
  let lastT = t0;

  while (true) {
    const sRes = await client.request(statusQuery);
    const op = sRes.currentBulkOperation;

    if (op?.status === "COMPLETED") {
      const elapsed = (Date.now() - t0) / 1000;
      console.log(`🎯 [${outputName}] 完成！共 ${op.objectCount} 筆，耗時 ${fmtDuration(elapsed)}`);
      await downloadAndConvert(op.url, outputName, { productsOnly });
      return;
    }

    if (op?.status === "FAILED") {
      console.error(`❌ [${outputName}] 失敗：${op.errorCode}`);
      return;
    }

    if (showProgress) {
      const now = Date.now();
      const dt = (now - lastT) / 1000;
      const dCount = (op?.objectCount ?? 0) - lastCount;
      const rate = dt > 0 ? dCount / dt : 0;
      const elapsed = (now - t0) / 1000;
      const ts = new Date().toLocaleTimeString();
      console.log(
        `⌛ [${outputName}] ${ts} 狀態：${op?.status ?? "等待中..."} (${op?.objectCount ?? 0} 筆) | ` +
          `+${dCount} / ${dt.toFixed(1)}s ≈ ${rate.toFixed(1)}/s | 累積 ${fmtDuration(elapsed)}`
      );
      lastT = now;
      lastCount = op?.objectCount ?? 0;
    }

    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }
}

async function downloadAndConvert(url, outputName, { productsOnly }) {
  if (!url) {
    console.error(`❌ [${outputName}] 無下載網址。`);
    return;
  }

  const outputDir = path.resolve("./output");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const jsonlPath = path.join(outputDir, `${outputName}.jsonl`);
  const jsonPath = path.join(outputDir, `${outputName}.json`);

  console.log(`⬇️ [${outputName}] 下載中...`);
  await downloadToFile(url, jsonlPath);

  console.log(`📦 [${outputName}] JSONL 下載完成，開始轉換 JSON...`);
  const lines = fs.readFileSync(jsonlPath, "utf-8").trim().split("\n");
  const data = lines.map((line) => JSON.parse(line));
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), "utf-8");
  console.log(`💾 [${outputName}] 已輸出：${jsonPath}`);

  if (productsOnly) {
    const only = filterProductsOnly(data);
    const onlyPath = path.join(outputDir, `${outputName}.products_only.json`);
    fs.writeFileSync(onlyPath, JSON.stringify(only, null, 2), "utf-8");
    console.log(`🧹 [${outputName}] Products only：${only.length} 筆 → ${onlyPath}`);
  }
}

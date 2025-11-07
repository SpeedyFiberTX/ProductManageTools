import fs from "fs";
import path from "path";

const outDir = path.resolve("./output");

// 主要來源：現在改讀 bulk_products_main.json（同檔含 Product 與 ProductImage）
const baseRaw = JSON.parse(
  fs.readFileSync(path.join(outDir, "bulk_products_main.json"), "utf-8")
);

// 只建立「產品」的 Map（排除圖片/其他節點）
const onlyProducts = baseRaw.filter(
  (r) => typeof r?.id === "string" && r.id.includes("gid://shopify/Product/") && !r.id.includes("ProductImage/")
);

// 不放 options；metafields 改成 map 物件；collections 改成只存 title 的陣列；i18n 裝翻譯；images 放 URL 陣列
const map = new Map(
  onlyProducts.map((p) => [
    p.id,
    {
      ...p,
      variants: [],
      metafields: {}, // "namespace.key": { type, value, i18n? }
      collections: [], // 只存 title
      i18n: { "zh-TW": {}, ja: {}, en: {} }, // 扁平 key 的翻譯容器
      images: [], // 🔥 依出現順序的 URL 陣列
    },
  ])
);

// 允許試多個候選檔名，第一個存在就用
function safeLoadMany(...names) {
  for (const name of names) {
    try {
      const p = path.join(outDir, name);
      if (fs.existsSync(p)) {
        return JSON.parse(fs.readFileSync(p, "utf-8"));
      }
    } catch {}
  }
  return null;
}

function safeLoad(name) {
  try {
    return JSON.parse(fs.readFileSync(path.join(outDir, name), "utf-8"));
  } catch {
    return null;
  }
}

function attachCollections() {
  const rows = safeLoad("bulk_products_collections.json");
  if (!rows) return;

  for (const r of rows) {
    if (!r?.__parentId) continue;
    const p = map.get(r.__parentId);
    if (!p) continue;

    const title = r?.title ?? r?.handle ?? "";
    if (title) p.collections.push(title);
  }

  // 去重（保留出現順序）
  for (const p of map.values()) {
    const seen = new Set();
    p.collections = p.collections.filter((t) => (seen.has(t) ? false : (seen.add(t), true)));
  }
}

function attachVariants() {
  const rows = safeLoad("bulk_products_variants.json");
  if (!rows) return;

  for (const r of rows) {
    if (!(typeof r.id === "string" && r.id.includes("ProductVariant/") && r.__parentId)) continue;
    const p = map.get(r.__parentId);
    if (!p) continue;

    p.variants.push({
      id: r.id,
      title: r.title,
      sku: r.sku,
      price: r.price,
      compareAtPrice: r.compareAtPrice,
      barcode: r.barcode,
      selectedOptions: Array.isArray(r.selectedOptions)
        ? r.selectedOptions.map((so) => ({ name: so.name, value: so.value }))
        : [],
      inventoryItem: r.inventoryItem || null,
    });
  }

  for (const p of map.values()) {
    p.variants.sort((a, b) => String(a.sku || "").localeCompare(String(b.sku || "")));
  }
}

function attachMetafields() {
  const rows = safeLoad("bulk_products_metafields.json");
  if (!rows) return;

  for (const r of rows) {
    if (!r?.__parentId) continue;
    const p = map.get(r.__parentId);
    if (!p) continue;

    const ns = r?.namespace;
    const key = r?.key;
    if (!ns || !key || !("value" in r)) continue;

    const k = `${ns}.${key}`;
    if (!(k in p.metafields)) {
      p.metafields[k] = {
        type: r?.type ?? "",
        value: r?.value ?? "",
      };
    }
  }
}

/**
 * 附上圖片（依出現順序組成 URL 陣列）
 * 來源：同一個 bulk_products_main.json 裡的 ProductImage 節點
 */
function attachImages() {
  let cnt = 0;

  for (const r of baseRaw) {
    if (!(typeof r?.id === "string" && r.id.includes("gid://shopify/ProductImage/"))) continue;
    if (!r?.__parentId) continue;

    const p = map.get(r.__parentId);
    if (!p) continue;

    const url = String(r?.url ?? "").trim();
    if (!url) continue;

    p.images.push(url); // 直接依檔案出現順序 push
    cnt++;
  }

  // 去重（保留順序）
  for (const p of map.values()) {
    const seen = new Set();
    p.images = p.images.filter((u) => (seen.has(u) ? false : (seen.add(u), true)));
  }

  console.log(`🖼️ 已附加圖片 URL：${cnt} 張（來源：bulk_products_main.json）`);
}

// —— 既有程式上面略 —— //
function attachMetafieldTranslations(locale, filename) {
  const transMap = safeLoad(filename); // { "<MetafieldGID>": "<translated string>", ... }
  const mfRows = safeLoad("bulk_products_metafields.json"); // 來源資料，用來把 metafieldId 對回 product + namespace.key
  if (!transMap || !mfRows) return;

  // 建立索引：metafieldId -> { productId, keyStr, namespace, key, type }
  const idx = new Map();
  for (const r of mfRows) {
    if (!r?.id?.startsWith("gid://shopify/Metafield/")) continue;
    if (!r.__parentId) continue;
    const ns = r.namespace;
    const key = r.key;
    if (!ns || !key) continue;

    // 只收 content.* 與 theme.shipping_time
    const isWanted = ns === "content" || (ns === "theme" && key === "shipping_time");
    if (!isWanted) continue;

    idx.set(r.id, {
      productId: r.__parentId,
      keyStr: `${ns}.${key}`,
      namespace: ns,
      key,
      type: r.type,
    });
  }

  // 寫回 map
  let hit = 0;
  for (const [mfId, translatedValueRaw] of Object.entries(transMap)) {
    const meta = idx.get(mfId);
    if (!meta) continue;

    const p = map.get(meta.productId);
    if (!p) continue;

    const k = meta.keyStr;
    if (!p.metafields[k]) {
      // 若 attachMetafields 尚未建立，也幫忙補個殼
      p.metafields[k] = { type: meta.type || "", value: "" };
    }
    if (!p.metafields[k].i18n) p.metafields[k].i18n = {};
    if (!p.metafields[k].i18n[locale]) p.metafields[k].i18n[locale] = "";

    // 原樣存放（rich_text_field 大多是 JSON 字串）
    p.metafields[k].i18n[locale] = String(translatedValueRaw ?? "");
    hit++;
  }

  console.log(`🈶 已合併 ${hit} 筆 metafield 翻譯到 p.metafields[*].i18n["${locale}"]`);
}

/**
 * 兼容兩種 Bulk 轉譯輸出形態：
 * A) { resourceId, translations: [{ key, value, locale }, ...] }
 * B) { resourceId, key, value, locale }  // 扁平一條一條
 * 只保留原始 key（例如 meta_description）
 */
function attachTranslationsWithAliases(locale, ...candidateFilenames) {
  const rows = safeLoadMany(...candidateFilenames);
  if (!rows || !rows.length) return;

  for (const r of rows) {
    const pid = r.resourceId || r.__parentId || r.id;
    if (!pid) continue;
    const p = map.get(pid);
    if (!p) continue;

    if (!p.i18n[locale]) p.i18n[locale] = {};

    if (Array.isArray(r.translations)) {
      for (const t of r.translations) {
        if (!t || typeof t.key !== "string") continue;
        const k = t.key;
        const v = String(t.value ?? "");
        p.i18n[locale][k] = v;
      }
    } else if (typeof r.key === "string") {
      const k = r.key;
      const v = String(r.value ?? "");
      p.i18n[locale][k] = v;
    }
  }
}

// 執行組裝
attachCollections();
attachVariants();
attachMetafields();
attachImages(); // 🔥 從 bulk_products_main.json 把圖片 URL 串進各產品

// 多個候選名 → 自動找到存在的那個
attachTranslationsWithAliases(
  "zh-TW",
  "bulk_products_translations_zh-TW.json",
  "bulk_products_translations_zhTW.json",
  "bulk_products_translations_tw.json"
);

// 日文與英文（視需要）
attachTranslationsWithAliases("ja", "bulk_products_translations_ja.json");
attachTranslationsWithAliases("en", "bulk_products_translations_en.json");
attachMetafieldTranslations("zh-TW", "metafield_translations_zhTW.json");

const full = Array.from(map.values());

// 移除 options（若 main 原本帶有 options）
for (const p of full) {
  if ("options" in p) delete p.options;
}

// 建議另存新檔名
const outPath = path.join(outDir, "products_full_with_i18n.json");
fs.writeFileSync(outPath, JSON.stringify(full, null, 2), "utf-8");
console.log("✅ 合併完成（含 images URL 陣列）筆數：", full.length);
console.log("💾 輸出：", outPath);

// 資料處理
import groupByHandle from '../helper/groupByHandle.js';
import buildProductUpdateData from '../helper/buildProductUpdateData.js';

// API
import productUpdate from '../API/productUpdate.js';
import collectionAddProducts from '../API/collectionAddProducts.js';
import getProductDataByHandle from '../API/getProductDataByHandle.js';
import collectionRemoveProducts from '../API/collectionRemoveProducts.js';

/**
 * 更穩健的表頭正規化：去除 BOM、前後空白並小寫
 */
function normalizeHeader(key = '') {
  return String(key).replace(/\uFEFF/g, '').trim().toLowerCase();
}

/**
 * 偵測是否有提供 collections 欄位（任一列有即可）
 */
function hasCollectionsColumnInRows(rows = []) {
  return rows.some(row =>
    Object.keys(row || {}).some(k => normalizeHeader(k) === 'collections')
  );
}

// 執行
export default async function productUpdater(rows) {
  try {
    // 按照 handle 組成陣列(同一檔案中如果有多個handle就會被拆成多個陣列)
    const groupedProducts = groupByHandle(rows);

    // 組織產品內容(取陣列中第一筆資料)
    for (const [handle, productRows] of Object.entries(groupedProducts)) {
      // 取得現況
      const product = await getProductDataByHandle(handle);
      const productId = product?.id;
      const productCollection = (product?.collections?.edges || []).map(e => e.node);

      // 組裝更新資料
      const productData = await buildProductUpdateData(productId, productRows);
      // console.log('[productData]', productData);

      // 先更新產品
      const updateCheck = await productUpdate(productData);

      // ---- collections 控制條件 ----
      // 1) CSV 有帶 collections 欄位（不論大小寫、含空白/BOM 都能匹配）
      // 2) 或 helper 已經產出 collectionsToJoin（代表你有意圖變更 collections）
      const hasCollectionsColumn = hasCollectionsColumnInRows(productRows);
      const hasTargets = Array.isArray(productData?.collectionsToJoin);

      // collection 邏輯（僅在有「意圖」時執行）
      if (updateCheck && productId && (hasCollectionsColumn || hasTargets)) {
        // ✅ 排除掉不處理的集合
        const excludeTitles = ['All Products', 'Hot Picks', 'TAA Compliant'];

        const currentCollectionIds = productCollection
          .filter(c => !excludeTitles.includes(c.title))
          .map(c => c.id);

        const targetCollectionIds = productData.collectionsToJoin || [];

        const toAdd = targetCollectionIds.filter(id => !currentCollectionIds.includes(id));
        const toRemove = currentCollectionIds.filter(id => !targetCollectionIds.includes(id));

        if (toAdd.length === 0 && toRemove.length === 0) {
          console.log(`✅ collections 不需調整：product ${productId}`);
        } else {
          if (toAdd.length > 0) {
            console.log(`➕ 準備新增 collections：`, toAdd);
            await collectionAddProducts(productId, toAdd);
          }
          if (toRemove.length > 0) {
            console.log(`➖ 準備移除 collections：`, toRemove);
            await collectionRemoveProducts(productId, toRemove);
          }
        }
      } else {
        console.log(`⚠️ 未提供 collections 欄位或無目標，略過 collection 處理：${handle}`);
      }

      console.log('\n'); // 每個產品之間空行區隔
    }
  } catch (error) {
    console.error(`❌ 更新產品處理發生錯誤：${error.message}`);
  }
}

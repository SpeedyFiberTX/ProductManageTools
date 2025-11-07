import resolveProductDescription from '../helper/resolveProductDescription.js';
import getCollectionIdByTitle from '../API/getCollectionIdByTitle.js';
import getFieldValue from '../helper/getFieldValue.js';

export default async function buildProductData(rows = []) {
  const mainRow = rows?.[0];
  if (!mainRow) throw new Error('buildProductData: rows[0] is missing');

  const pick = (key) => getFieldValue(mainRow, key);

  const data = {};

  // 基本欄位（有值才加入）
  const handle = pick('Handle');
  if (handle) data.handle = handle;

  const title = pick('Title');
  if (title) data.title = title;

  const vendor = pick('Vendor');
  if (vendor) data.vendor = vendor;

  const productType = pick('Type');
  if (productType) data.productType = productType;

  const templateSuffix = pick('Template');
  if (templateSuffix) data.templateSuffix = templateSuffix;

  // descriptionHtml（非空白才加入）
  const desc = resolveProductDescription(mainRow);
  if (typeof desc === 'string' && desc.trim() !== '') {
    data.descriptionHtml = desc;
  }

  // tags（有有效值才加入）
  const rawTags = pick('Tags');
  const tags = rawTags
    ? String(rawTags).split(',').map(t => t.trim()).filter(Boolean)
    : [];
  if (tags.length) data.tags = tags;

  // 狀態（提供 Status= draft/active 的判斷；只在有填時加入）
  const rawStatus = pick('Status');
  if (rawStatus) {
    data.status = String(rawStatus).toLowerCase() === 'draft' ? 'DRAFT' : 'ACTIVE';
  }

  // SEO（有任一值才加入 seo 物件）
  const seoTitle = pick('SEO Title');
  const seoDescription = pick('SEO Description');
  const seo = {};
  if (seoTitle) seo.title = seoTitle;
  if (seoDescription) seo.description = seoDescription;
  if (Object.keys(seo).length) data.seo = seo;

  // Collections（把 collections 字串轉成 ID；有才加入）
  const collectionTitles = (pick('collections') ?? '')
    .split(',')
    .map(c => c.trim())
    .filter(Boolean);

  if (collectionTitles.length) {
    const collectionIds = [];
    for (const title of collectionTitles) {
      const id = await getCollectionIdByTitle(title);
      if (id) collectionIds.push(id);
    }
    if (collectionIds.length) data.collectionsToJoin = collectionIds;
  }

  return data;
}

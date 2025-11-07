import getCollectionIdByTitle from '../API/getCollectionIdByTitle.js';
import getProductDataByHandle from '../API/getProductDataByHandle.js';
import resolveProductDescription from './resolveProductDescription.js';

// 組織產品資料->舊版
// export default async function buildProductData(productId,rows) {
//     const mainRow = rows[0];//只讀取第一列->第一列才是產品主要資訊，其他是變體

//     // 取得collection
//     const collectionTitles = (mainRow['collections'] || '').split(',').map(c => c.trim()).filter(Boolean);//取出collection
//     const collectionIds = [];//準備接收collection ID，因為不只有一個collection，所以用陣列接收
//     for (const title of collectionTitles) { //一次查詢每一個title
//         const id = await getCollectionIdByTitle(title);
//         if (id) collectionIds.push(id);
//     }

//     return {
//         handle: mainRow['handle'],
//         id: productId,
//         title: mainRow['Title'],
//         descriptionHtml: resolveProductDescription(mainRow),//這邊會帶入整列，到函式中才會再取description和description_type
//         vendor: mainRow['Vendor'],
//         productType: mainRow['Type'] || '',
//         tags: (mainRow['Tags'] || '').split(',').map(tag => tag.trim()).filter(Boolean),
//         status: mainRow['Status'] === 'active' || mainRow['Published'] == 1 ? 'ACTIVE' : 'DRAFT',
//         seo:{
//             title:mainRow['SEO Title'],
//             description:mainRow['SEO Description'],
//         },
//         collectionsToJoin: collectionIds,
//         templateSuffix: mainRow['Template'] || '',
//     };
// }

export default async function buildProductData(productId, rows) {
    const mainRow = rows[0]; // 只讀第一列
    const data = {};

    // 基本欄位
    if (mainRow['handle']) data.handle = mainRow['handle'];
    if (productId) data.id = productId;
    if (mainRow['Title']) data.title = mainRow['Title'];

    // descriptionHtml 需要特殊處理
    const desc = resolveProductDescription(mainRow);
    if (desc && desc.trim() !== '') data.descriptionHtml = desc;

    if (mainRow['Vendor']) data.vendor = mainRow['Vendor'];
    if (mainRow['Type']) data.productType = mainRow['Type'];

    // Tags
    const tags = (mainRow['Tags'] || '')
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean);
    if (tags.length) data.tags = tags;

    // Status
    if (mainRow['Status'] || mainRow['Published']) {
        data.status =
            mainRow['Status'] === 'active' || mainRow['Published'] == 1
                ? 'ACTIVE'
                : 'DRAFT';
    }

    // SEO
    const seo = {};
    if (mainRow['SEO Title']) seo.title = mainRow['SEO Title'];
    if (mainRow['SEO Description']) seo.description = mainRow['SEO Description'];
    if (Object.keys(seo).length) data.seo = seo;

    // Collections
    const collectionTitles = (mainRow['collections'] || '')
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

    if (mainRow['Template']) data.templateSuffix = mainRow['Template'];

    return data;
}
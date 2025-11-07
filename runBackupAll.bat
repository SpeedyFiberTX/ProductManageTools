@echo off
cd /d %~dp0

echo [1/9] main
node src/API/bulk/bulkProducts_main.js

echo [2/9] variants
node src/API/bulk/bulkProducts_variants.js

echo [3/9] metafields
node src/API/bulk/bulkProducts_metafields.js

echo [4/9] collections
node src/API/bulk/bulkProducts_collections.js

echo [5/9] translations_ja
node src/API/bulk/bulkProducts_translations_ja.js

echo [6/9] translations_tw
node src/API/bulk/bulkProducts_translations_tw.js

echo [7/9] metafieldsTranslate
node src/API/bulk/bulkProducts_metafieldsTranslate.js

echo [8/9] assembleAll
node src/scripts/assembleAll.js

echo [9/9] buildNotionProducts
node src/scripts/buildNotionProducts.js

echo ✅ 全部完成！請到 notion 查看輸出結果。
pause
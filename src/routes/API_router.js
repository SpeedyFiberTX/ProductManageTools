import express from 'express';
import translateWriter from '../services/translateWriter.js';
import productUpdater from '../services/productUpdater.js';
import productBuilder from '../services/productBuilder.js';
import metafieldsWriter from '../services/metafieldsWriter.js';
import deleteJaTranslate from '../services/deleteJaTranslate.js';
import translateWriter_ja from '../services/translateWriter_ja.js';
import productVariantsBuilder from '../services/productVariantsBuilder.js';
import variantsUpdater from '../services/variantsUpdater.js';
import createProductFlow from '../services/createProductFlow.js';

const router = express.Router();

function backgroundHandler(serviceFn, successMsg) {
  return async (req, res) => {
    try {
      const { rows } = req.body || {};
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ ok: false, message: 'rows must be a non-empty array' });
      }

      const requestId = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      if (!res.headersSent) {
        res.status(202).json({
          ok: true,
          message: `${successMsg}（背景執行中）`,
          requestId
        });
      }

      // Run the heavy task in the background
      setImmediate(async () => {
        try {
          await serviceFn(rows);
          console.log(`✅ [${requestId}] ${successMsg}`);
        } catch (err) {
          console.error(`❌ [${requestId}] ${successMsg}失敗:`, err?.stack || err?.message || err);
        }
      });
    } catch (e) {
      if (!res.headersSent) {
        res.status(500).json({ ok: false, message: e.message });
      } else {
        console.error('Response already sent; background handler error:', e);
      }
    }
  };
}

router.post('/translate',backgroundHandler(translateWriter, '翻譯更新結束'))
router.post('/translate_ja',           backgroundHandler(translateWriter_ja,     '執行日文翻譯更新結束'));
router.post('/productUpdater',         backgroundHandler(productUpdater,          '執行產品更新結束'));
router.post('/productBuilder',         backgroundHandler(productBuilder,          '執行產品建立結束'));
router.post('/metafieldsWriter',       backgroundHandler(metafieldsWriter,        '執行 Metafields 寫入結束'));
router.post('/deleteTranslate',        backgroundHandler(deleteJaTranslate,       '執行翻譯刪除結束'));
router.post('/productVariantsBuilder', backgroundHandler(productVariantsBuilder,  '執行變體建立結束'));
router.post('/variantsUpdater',        backgroundHandler(variantsUpdater,         '執行變體更新結束'));

router.post("/fullPipeline", async (req, res) => {
  const { products, metafields, translations, variants } = req.body || {};
  res.status(202).json({ ok: true, message: "新增產品流程已啟動，請稍後查看官網後台是否建立成功，並請記得到 notion 修改 status 狀態與官網同步唷。" });

  setImmediate(async () => {
    await createProductFlow(products, metafields, translations, variants);
  });
});


export default router;
// index.js
import 'dotenv/config';
import express from 'express';
// 若前後端不同網域需要 CORS：
// import cors from 'cors';

import api_router from './src/routes/API_router.js';

const app = express();

app.use(express.json({ limit: '10mb' }));
// app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || true }));

// 健康檢查
app.get('/health', (req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || 'development' });
});

// API 路由
app.use('/api', api_router);

// 404
app.use((req, res) => {
  res.status(404).json({ ok: false, message: 'Not Found' });
});

// 統一錯誤處理
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ ok: false, message: 'Internal Server Error' });
});

// 啟動
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 API server listening on http://localhost:${PORT}`);
  console.log(`   POST /api/translate   ← 前端把 rows 丟到這裡`);
  console.log(`   GET  /health`);
});

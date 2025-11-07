// index.js
// 套件
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
// Router
import authRoute from './src/routes/authRoute.js';
import authRequired from './src/middleware/authRequired.js';
import api_router from './src/routes/API_router.js';

const app = express();
app.set('trust proxy', 1); // 在 Render/反向代理後面，secure cookie 才會生效
// 允許的前端來源（用環境變數管理）
const FRONTEND_ORIGINS = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// ✅ 這裡請在 Render 環境變數裡填：
app.use(cors({
  origin(origin, cb) {
    // Postman / 同源直呼情境沒有 origin，直接放行
    if (!origin) return cb(null, true);
    if (FRONTEND_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true, // 一定要開，前端才帶得進/出 Cookie
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));

app.use(cookieParser());

app.use(express.json({ limit: '10mb' }));
// app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || true }));

app.use(authRoute);

app.get('/api/hello-secure', authRequired, (req, res) => {
  res.json({ hi: `Hello ${req.user.email}!` });
});


// 健康檢查
app.get('/health', (req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || 'development' });
});

// API 路由
app.use('/api',authRequired,api_router);

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
});

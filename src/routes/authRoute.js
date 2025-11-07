import express from 'express';
import bcrypt from 'bcrypt';
import * as Users from '../services/users.js';
import * as RT from '../services/refreshTokens.js';
import { signAccess, signRefresh, verifyRefresh } from '../services/jwt.js';

const router = express.Router();

const isProd = process.env.NODE_ENV === 'production';
// 這個環境變數請在 Render 設為 'true'（因為你是 github pages ↔ onrender.com 跨站）
const isCrossSite = process.env.CROSS_SITE === 'true';

// ⚠️ 重點：跨站時 SameSite 必須為 'none' 且 secure:true，且不要設定 domain（host-only 最穩）
// 若未跨站（同站網域，例如 panel.example.com ↔ api.example.com），可用 'lax' 並設定 domain
const COOKIE_OPTS_BASE = isProd
  ? { httpOnly: true, secure: true, sameSite: (isCrossSite ? 'none' : 'lax'), path: '/' }
  : { httpOnly: true, secure: false, sameSite: 'lax', path: '/' };

const COOKIE_OPTS = isCrossSite
  ? COOKIE_OPTS_BASE // 跨站：不要設 domain
  : { ...COOKIE_OPTS_BASE, domain: process.env.COOKIE_DOMAIN || undefined };

router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Missing email/password' });

    const user = await Users.findByEmail(email);
    if (!user || !user.is_active) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const access  = signAccess({ id: user.id, email: user.email, role: user.role });
    const refresh = signRefresh({ id: user.id });

    // ✅ 單一裝置策略：先清掉舊的、再寫新的
    await RT.saveSingle({ user_id: user.id, token: refresh, user_agent: req.headers['user-agent'] });

    return res
      .cookie('access_token', access,  { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 })
      .cookie('refresh_token', refresh, { ...COOKIE_OPTS, maxAge: 30 * 24 * 60 * 60 * 1000 })
      .json({ ok: true });
  } catch (e) {
    console.error('[auth/login] ', e);
    return res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/auth/refresh', async (req, res) => {
  try {
    const token = req.cookies?.refresh_token;
    if (!token) return res.status(401).json({ error: 'No refresh token' });

    // 先確認 DB 仍承認這顆 refresh（單一裝置策略）
    const valid = await RT.isValid(token);
    if (!valid) return res.status(401).json({ error: 'Invalid refresh token' });

    // 驗證 refresh JWT，取出 user id
    let payload;
    try {
      payload = verifyRefresh(token); // { id, iat, exp }
    } catch {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // 讀取使用者資料（不要用 req.user，這裡不會有）
    const user = await Users.findById(payload.id);
    if (!user || !user.is_active) return res.status(401).json({ error: 'Unauthorized' });

    // 簽新 access
    const access = signAccess({ id: user.id, email: user.email, role: user.role });

    // 🔁 建議旋轉 refresh：撤銷舊的、發新的（更安全，仍是單一裝置）
    const newRefresh = signRefresh({ id: user.id });
    try { await RT.revoke(token); } catch { /* ignore revoke error */ }
    await RT.saveSingle({ user_id: user.id, token: newRefresh, user_agent: req.headers['user-agent'] });

    return res
      .cookie('access_token', access,    { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 })
      .cookie('refresh_token', newRefresh, { ...COOKIE_OPTS, maxAge: 30 * 24 * 60 * 60 * 1000 })
      .json({ ok: true });
  } catch (e) {
    console.error('[auth/refresh] ', e);
    return res.status(500).json({ error: 'Refresh failed' });
  }
});

router.post('/auth/logout', async (req, res) => {
  try {
    const token = req.cookies?.refresh_token;
    if (token) {
      try { await RT.revoke(token); } catch { /* ignore */ }
    }
    return res
      .clearCookie('access_token', COOKIE_OPTS)
      .clearCookie('refresh_token', COOKIE_OPTS)
      .json({ ok: true });
  } catch (e) {
    console.error('[auth/logout] ', e);
    return res.status(500).json({ error: 'Logout failed' });
  }
});

export default router;

// src/routes/authRoute.js
import express from 'express';
import bcrypt from 'bcrypt';
import * as Users from '../services/users.js';
import * as RT from '../services/refreshTokens.js';
import { signAccess, signRefresh, verifyRefresh } from '../services/jwt.js';

const router = express.Router();

const isProd = process.env.NODE_ENV === 'production';

// ✅ 同網域策略（前端與後端同一主網域，例如 instantcheeseshao.com ↔ api.instantcheeseshao.com）
// - prod：Secure + SameSite=Lax + 指定頂層網域（.your-domain.com）
// - dev：Secure=false，不指定 domain（host-only）
const COOKIE_OPTS = isProd
  ? {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      domain: process.env.COOKIE_DOMAIN || undefined, // 例：.instantcheeseshao.com（前面有點）
      path: '/',
    }
  : {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
    };

/**
 * POST /auth/login
 * body: { email, password }
 * 成功：設定 access_token(15m) + refresh_token(30d)
 * 策略：單一裝置（清掉同 user 先前 refresh，再存新的一顆）
 */
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email/password' });
    }

    const user = await Users.findByEmail(email);
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const access  = signAccess({ id: user.id, email: user.email, role: user.role });
    const refresh = signRefresh({ id: user.id });

    // 單一裝置：先刪舊 refresh，再存新 refresh
    await RT.saveSingle({
      user_id: user.id,
      token: refresh,
      user_agent: req.headers['user-agent'],
    });

    return res
      .cookie('access_token',  access,  { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 })
      .cookie('refresh_token', refresh, { ...COOKIE_OPTS, maxAge: 30 * 24 * 60 * 60 * 1000 })
      .json({ ok: true });
  } catch (e) {
    console.error('[auth/login]', e);
    return res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * POST /auth/refresh
 * 使用 refresh_token 重新簽發 access_token，並旋轉 refresh（更安全）
 */
router.post('/auth/refresh', async (req, res) => {
  try {
    const token = req.cookies?.refresh_token;
    if (!token) return res.status(401).json({ error: 'No refresh token' });

    // 先確認這顆 refresh 仍然在 DB 內有效（單一裝置策略）
    const valid = await RT.isValid(token);
    if (!valid) return res.status(401).json({ error: 'Invalid refresh token' });

    // 驗證 refresh JWT，取得 user id
    let payload;
    try {
      payload = verifyRefresh(token); // { id, iat, exp }
    } catch {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // 重新讀使用者資料（不要用 req.user，這條路由本身不會有）
    const user = await Users.findById(payload.id);
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 簽新 access
    const access = signAccess({ id: user.id, email: user.email, role: user.role });

    // 旋轉 refresh：撤銷舊的、發新的（仍維持單一裝置）
    const newRefresh = signRefresh({ id: user.id });
    try { await RT.revoke(token); } catch { /* ignore */ }
    await RT.saveSingle({
      user_id: user.id,
      token: newRefresh,
      user_agent: req.headers['user-agent'],
    });

    return res
      .cookie('access_token',  access,    { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 })
      .cookie('refresh_token', newRefresh, { ...COOKIE_OPTS, maxAge: 30 * 24 * 60 * 60 * 1000 })
      .json({ ok: true });
  } catch (e) {
    console.error('[auth/refresh]', e);
    return res.status(500).json({ error: 'Refresh failed' });
  }
});

/**
 * POST /auth/logout
 * 撤銷 refresh，清除兩顆 cookie
 */
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
    console.error('[auth/logout]', e);
    return res.status(500).json({ error: 'Logout failed' });
  }
});

export default router;

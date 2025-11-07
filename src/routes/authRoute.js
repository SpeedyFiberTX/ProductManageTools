import express from 'express';
import bcrypt from 'bcrypt';
import * as Users from '../services/users.js';
import * as RT from '../services/refreshTokens.js';
import { signAccess, signRefresh, verifyRefresh } from '../services/jwt.js';

const router = express.Router();
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  domain: process.env.COOKIE_DOMAIN || undefined,
  path: '/',
};

router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Missing email/password' });

  const user = await Users.findByEmail(email);
  if (!user || !user.is_active) return res.status(401).json({ error: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  const access  = signAccess({ id: user.id, email: user.email, role: user.role });
  const refresh = signRefresh({ id: user.id });

  // ✅ 單一裝置策略：先清，再寫新的一筆
  await RT.saveSingle({ user_id: user.id, token: refresh, user_agent: req.headers['user-agent'] });

  res
    .cookie('access_token', access,  { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 })
    .cookie('refresh_token', refresh, { ...COOKIE_OPTS, maxAge: 30 * 24 * 60 * 60 * 1000 })
    .json({ ok: true });
});

router.post('/auth/refresh', async (req, res) => {
  const token = req.cookies?.refresh_token;
  if (!token) return res.status(401).json({ error: 'No refresh token' });

  const valid = await RT.isValid(token);
  if (!valid) return res.status(401).json({ error: 'Invalid refresh token' });

  let payload;
  try { payload = verifyRefresh(token); }
  catch { return res.status(401).json({ error: 'Invalid refresh token' }); }

  const access = signAccess({ id: payload.id, email: req.user?.email, role: req.user?.role });
  // 若想「旋轉」（rotate）refresh，可在這裡 revoke 舊的並發新的
  res.cookie('access_token', access, { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 }).json({ ok: true });
});

router.post('/auth/logout', async (req, res) => {
  const token = req.cookies?.refresh_token;
  if (token) await RT.revoke(token);
  res.clearCookie('access_token', COOKIE_OPTS).clearCookie('refresh_token', COOKIE_OPTS).json({ ok: true });
});

export default router;

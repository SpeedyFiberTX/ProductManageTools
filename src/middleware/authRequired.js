import { verifyAccess } from '../services/jwt.js';

export default function authRequired(req, res, next) {
  try {
    const token = req.cookies?.access_token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const payload = verifyAccess(token); // { id, email, role }
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

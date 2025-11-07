import jwt from 'jsonwebtoken';
const ACCESS_TTL = '15m';
const REFRESH_TTL = '30d';

export const signAccess = (payload) =>
  jwt.sign(payload, process.env.JWT_ACCESS_SECRET, { expiresIn: ACCESS_TTL });

export const signRefresh = (payload) =>
  jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_TTL });

export const verifyAccess = (t) => jwt.verify(t, process.env.JWT_ACCESS_SECRET);
export const verifyRefresh = (t) => jwt.verify(t, process.env.JWT_REFRESH_SECRET);

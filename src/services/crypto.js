import crypto from 'crypto';
export const sha256hex = (s) => crypto.createHash('sha256').update(s).digest('hex');

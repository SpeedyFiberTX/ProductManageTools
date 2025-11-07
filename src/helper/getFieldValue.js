// getFieldValue.js
export default function getFieldValue(obj, keyName) {
  if (!obj || keyName == null) return null;

  const normKey = (s) =>
    String(s).replace(/\uFEFF/g, '').trim().toLowerCase();

  const wanted = normKey(keyName);

  let actualKey = null;
  for (const k of Object.keys(obj)) {
    if (normKey(k.normalize('NFC')) === wanted) {
      actualKey = k;
      break;
    }
  }
  if (actualKey == null) return null;

  const raw = obj[actualKey];
  if (raw == null) return null;

  let v = String(raw)
    .replace(/\uFEFF/g, '')                // BOM
    .replace(/\u00A0/g, ' ')               // NBSP → space
    .replace(/[\u200B-\u200D\u2060]/g, '') // 零寬字
    .replace(/[\u2013\u2014\uFF0D]/g, '-') // dash 統一
    .replace(/\r/g, '')                    // 砍掉任何 CR
    .replace(/\\"/g, '"');                 // 轉回被逸出的引號

  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }

  return v.trim().normalize('NFC');
}

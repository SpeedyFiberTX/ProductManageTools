// 📌 將 description + type 轉為 HTML
export default function resolveProductDescription(row) {
  const type = (row['description_type'] || '').toLowerCase();
  const input = row['description'] || '';

  if (!input || !type) return '';

  if (type === 'html') {
    return input;
  }

  if (type === 'unordered_list') {
    const lines = input.split(/[•*]/).map(i => i.trim()).filter(Boolean);
    return `<ul>${lines.map(line => `<li>${line}</li>`).join('')}</ul>`;
  }

  if (type === 'paragraph') {
    const paragraphs = input.split(/\s*\/\/\s*/).map(p => p.trim()).filter(Boolean);
    return paragraphs.map(p => `<p>${p}</p>`).join('');
  }

  if (type === 'bold_paragraph') {
    const paragraphs = input.split(/\s*\/\/\s*/).map(p => p.trim()).filter(Boolean);
    return paragraphs.map((p, i) => {
      const text = p;
      return i === 0 ? `<p><strong>${text}</strong></p>` : `<p>${text}</p>`;
    }).join('');
  }

  if (type === 'bold_unordered_list') {
    const lines = input.split(/[•*]/).map(i => i.trim()).filter(Boolean);
    const listItems = lines.map(line => {
      const [key, ...rest] = line.split(/[:：]/);
      const boldPart = key.trim();
      const textPart = rest.join(':').trim();
      return `<li><strong>${boldPart}:</strong> ${textPart}</li>`;
    });
    return `<ul>${listItems.join('')}</ul>`;
  }

  console.warn(`⚠️ 不支援的 description_type: ${type}，已略過`);
  return '';
}
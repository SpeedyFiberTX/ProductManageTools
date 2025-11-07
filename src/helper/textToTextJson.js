export default function textToTextJson(input, inputType) {
  const result = {
    type: 'root',
    children: []
  };

  if (!input || !inputType) return result;

  if (inputType === 'rich text') {
    return input;
  }

  if (inputType === 'unordered_list') {
    const lines = input
      .split(/\s*[•*]\s+/)  // 改掉 ^ 和 m
      .map(i => i.trim())
      .filter(Boolean);

    if (lines.length > 0) {
      result.children.push({
        type: 'list',
        listType: 'unordered',
        children: lines.map(line => ({
          type: 'list-item',
          children: [{ type: 'text', value: line }],
        })),
      });
    }
  } else if (inputType === 'paragraph') {
    const paragraphs = input.split(/\s*\/\/\s*/).map(p => p.trim()).filter(Boolean);
    result.children.push(
      ...paragraphs.map((text) => ({
        type: 'paragraph',
        children: [
          { type: 'text', value: text },
        ],
      }))
    );
  } else if (inputType === 'bold_paragraph') {
    const paragraphs = input.split(/\s*\/\/\s*/).map(p => p.trim()).filter(Boolean);
    result.children.push(
      ...paragraphs.map((text, index) => ({
        type: 'paragraph',
        children: [
          {
            type: 'text',
            value: text,
            bold: index === 0,
          },
        ],
      }))
    );
  } else if (inputType === 'bold_unordered_list') {
    const lines = input
      .split(/\s*[•*]\s+/)  // 改進：移除 ^ 和 m，支援沒有換行的情況
      .map(i => i.trim())
      .filter(Boolean);     // 避免空字串

    const linesChildren = lines.map(item => {
      const parts = item.split(/[:：]/).map(i => i.trim());
      return [parts[0], parts.slice(1).join(':') || ''];
    });

    if (lines.length > 0) {
      result.children.push({
        type: 'list',
        listType: 'unordered',
        children: lines.map((line, index) => ({
          type: 'list-item',
          children: [
            { type: 'text', value: `${linesChildren[index][0]}:`, bold: true },
            { type: 'text', value: `${linesChildren[index][1]}` },
          ],
        })),
      });
    }
  }
  else if (inputType === 'intro_list') {
    const paragraphs = input.split(/\s*\/\/\s*/).map(p => p.trim()).filter(Boolean);//拆段落
    const lists = paragraphs[1].split(/^\s*[•*]\s+/gm).map(i => i.trim()).filter(Boolean);//中間那一段拆成列點

    if (paragraphs[0]) {
      result.children.push({
        type: 'paragraph',
        children: [{ type: 'text', value: paragraphs[0] }]
      });
    }

    if (lists.length > 0) {
      result.children.push({
        type: 'list',
        listType: 'unordered',
        children: lists.map(line => ({
          type: 'list-item',
          children: [{ type: 'text', value: line }],
        })),
      });
    }

    if (paragraphs[2]) {
      result.children.push({
        type: 'paragraph',
        children: [{ type: 'text', value: paragraphs[2] }]
      });
    }
  }

  return result;
}
// 中文按字换行，英文标识尽量保持完整，避免 prompt caching / 模型名在中间断开。
export function wrapLines(value, width, measure) {
  const tokens =
    String(value).match(/[A-Za-z0-9_]+(?:[./-][A-Za-z0-9_]+)*|./gu) || [];
  const rows = [];
  let row = '';
  for (const token of tokens) {
    const parts = measure(token) > width ? [...token] : [token];
    for (const part of parts) {
      if (row && measure(row + part) > width) {
        rows.push(row.trimEnd());
        row = part.trimStart();
      } else row += part;
    }
  }
  if (row.trim()) rows.push(row.trimEnd());
  return rows;
}

/**
 * Minimal CSV parser shared across the importers (inventory / customers /
 * orders). Handles quoted strings with commas inside, doubled quotes
 * inside quoted strings, and \r\n line endings. Returns string[][].
 */

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      cur.push(cell);
      cell = '';
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      // End of row
      if (ch === '\r' && text[i + 1] === '\n') i++; // consume LF after CR
      cur.push(cell);
      if (cur.length > 1 || cur[0] !== '') rows.push(cur);
      cur = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  // Final cell + row
  cur.push(cell);
  if (cur.length > 1 || cur[0] !== '') rows.push(cur);
  return rows;
}

/**
 * Read first row as headers, return remaining rows as object maps.
 * Useful for Shopify exports which have stable column names.
 */
export function parseCsvWithHeaders(text: string): Array<Record<string, string>> {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((cells) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = (cells[i] ?? '').trim();
    });
    return obj;
  });
}

const WOMENS_SIZE_CHART = [
  "Body measurements in inches.",
  '| Size | Bust (in) | Waist (in) | Hips (in) |',
  '| --- | --- | --- | --- |',
  '| XS | 32" | 26" | 35" |',
  '| S | 34" | 28" | 37" |',
  '| M | 36" | 30" | 39" |',
  '| L | 38" | 32" | 41" |',
  '| XL | 40" | 34" | 43" |',
  '| XXL | 42" | 36" | 45" |',
].join("\n");

export function parseSizeGuide(value) {
  const lines = String(value || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const tableLines = lines.filter(line => line.includes('|'));
  const split = line => line.replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim());
  if (tableLines.length < 2) return { headers: [], rows: [], notes: lines.join('\n') };
  const headers = split(tableLines[0]);
  const rows = tableLines.slice(1).map(split).filter(row => !row.every(cell => /^:?-+:?$/.test(cell)));
  if (headers.length < 2 || rows.some(row => row.length !== headers.length)) return { headers: [], rows: [], notes: lines.join('\n'), error: 'Each size-chart row must have the same number of columns as the heading.' };
  return { headers, rows, notes: lines.filter(line => !line.includes('|')).join('\n') };
}

export function resolveSizeGuide(guide, productType) {
  const parsed = parseSizeGuide(guide);
  if (parsed.headers.length > 0) return parsed;
  if (String(productType || "").toLowerCase() === "footwear") return parsed;
  return parseSizeGuide(WOMENS_SIZE_CHART);
}

export function displayMeasurement(value, header, inches) {
  if (!inches || !/\(cm\)/i.test(header)) return value;
  // Convert only explicitly labelled numeric measurements; never shoe sizes.
  if (!/^\d+(?:\.\d+)?(?:\s*[-–]\s*\d+(?:\.\d+)?)?$/.test(value)) return value;
  return value.replace(/\d+(?:\.\d+)?/g, number => (Number(number) / 2.54).toFixed(1));
}

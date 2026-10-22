// `additionalInfo` is stored on a product as an array of { label, value } rows.
// Older records were written through a helper that stringified every entry, which
// turned the rows into "[object Object]" and dropped them from the product page.
// Everything that reads or writes this field goes through the helpers below so
// both the object shape and the legacy "Label: Value" string shape stay usable.

const GARBAGE_ROWS = new Set(["[object Object]", "[object object]"]);

function normalizeText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function isBlankOrGarbage(text) {
  return !text || GARBAGE_ROWS.has(text);
}

// "Fabric: Cotton\nFit: Relaxed" -> [{ label: "Fabric", value: "Cotton" }, ...]
export function parseAdditionalInfoText(text) {
  const rows = [];

  String(text ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const separatorIndex = line.indexOf(":");

      if (separatorIndex === -1) {
        if (isBlankOrGarbage(line)) return;
        rows.push({ label: line, value: "" });
        return;
      }

      const label = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();
      if (isBlankOrGarbage(label) && isBlankOrGarbage(value)) return;

      rows.push({ label, value });
    });

  return rows;
}

// [{ label, value }] -> "Fabric: Cotton\nFit: Relaxed"
export function formatAdditionalInfoText(rows) {
  return (Array.isArray(rows) ? rows : [])
    .map((row) => {
      const label = normalizeText(row?.label);
      const value = normalizeText(row?.value);
      if (!label && !value) return "";
      return value ? `${label}: ${value}` : label;
    })
    .filter(Boolean)
    .join("\n");
}

// Canonical storage shape. Accepts rows, legacy string rows, or a plain string.
export function normalizeAdditionalInfo(value) {
  if (value === null || value === undefined) return [];

  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (item && typeof item === "object") {
        const label = normalizeText(item.label ?? item.name ?? item.key);
        const entryValue = normalizeText(item.value ?? item.text);
        if (!label && !entryValue) return [];
        return [{ label, value: entryValue }];
      }

      return parseAdditionalInfoText(item);
    });
  }

  if (typeof value === "string") {
    return parseAdditionalInfoText(value);
  }

  return [];
}

// Rows safe to render on the product page.
export function additionalInfoRows(value) {
  return normalizeAdditionalInfo(value).filter((row) => row.label || row.value);
}

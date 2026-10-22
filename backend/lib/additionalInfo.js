// `additionalInfo` is a list of { label, value } rows shown in the product page's
// "Additional Information" table.
//
// It used to be written with the same `normalizeList()` helper as plain string
// lists, which stringifies every entry - so the rows were saved as
// "[object Object]" and the table rendered empty. Keep this helper separate and
// always normalize the field through it.

const GARBAGE_ROWS = new Set(['[object Object]', '[object object]']);

const text = (value) => (value === null || value === undefined ? '' : String(value).trim());
const isBlankOrGarbage = (value) => !value || GARBAGE_ROWS.has(value);

function parseRow(line) {
  const trimmed = text(line);
  if (isBlankOrGarbage(trimmed)) return null;

  const separatorIndex = trimmed.indexOf(':');
  if (separatorIndex === -1) return { label: trimmed, value: '' };

  const label = trimmed.slice(0, separatorIndex).trim();
  const value = trimmed.slice(separatorIndex + 1).trim();
  if (isBlankOrGarbage(label) && isBlankOrGarbage(value)) return null;

  return { label, value };
}

function normalizeAdditionalInfo(value) {
  const rows = [];

  const push = (row) => {
    if (!row) return;
    if (!row.label && !row.value) return;
    rows.push({ label: row.label, value: row.value });
  };

  if (Array.isArray(value)) {
    value.forEach((item) => {
      if (item && typeof item === 'object') {
        push({
          label: text(item.label ?? item.name ?? item.key),
          value: text(item.value ?? item.text),
        });
        return;
      }

      text(item)
        .split(/\r?\n/)
        .forEach((line) => push(parseRow(line)));
    });

    return rows;
  }

  if (typeof value === 'string') {
    value.split(/\r?\n/).forEach((line) => push(parseRow(line)));
  }

  return rows;
}

module.exports = { normalizeAdditionalInfo };

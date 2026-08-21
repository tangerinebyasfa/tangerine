export const OUTLET_OPTIONS = [
  {
    value: "Outlet One",
    label: "Outlet One",
    description: "Flagship Outlet",
  },
  {
    value: "Outlet Two",
    label: "Outlet Two",
    description: "City Boutique Outlet",
  },
];

export function normalizeAvailableAt(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  return [];
}

export function getAvailableAtLabel(value) {
  return OUTLET_OPTIONS.find((outlet) => outlet.value === value)?.label || String(value || "");
}

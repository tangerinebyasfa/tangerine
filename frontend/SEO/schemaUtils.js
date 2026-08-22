export function getRequestOrigin(headersList) {
  if (headersList && typeof headersList.get === "function") {
    const proto = headersList.get("x-forwarded-proto") || "http";
    const host = headersList.get("x-forwarded-host") || headersList.get("host");

    if (host) {
      return `${proto}://${host}`;
    }
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  return "http://localhost:3000";
}

export function toAbsoluteUrl(url, origin) {
  if (!url || typeof url !== "string") return null;

  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;

  try {
    return new URL(trimmed, origin || getRequestOrigin()).toString();
  } catch {
    return null;
  }
}

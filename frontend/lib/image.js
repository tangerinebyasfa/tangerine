const DRIVE_FILE_ID_PATTERNS = [
  /drive\.google\.com\/file\/d\/([^/]+)/i,
  /drive\.google\.com\/open\?id=([^&/]+)/i,
  /drive\.google\.com\/uc\?(?:[^#]*&)?id=([^&/]+)/i,
  /drive\.google\.com\/thumbnail\?(?:[^#]*&)?id=([^&/]+)/i,
  /drive\.google\.com\/uc\?export=view&id=([^&/]+)/i,
  /drive\.google\.com\/uc\?export=download&id=([^&/]+)/i,
];

function getDriveFileId(src) {
  if (!src || typeof src !== "string") return null;

  for (const pattern of DRIVE_FILE_ID_PATTERNS) {
    const match = src.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}

export function normalizeImageUrl(src) {
  if (!src || typeof src !== "string") return null;

  const trimmed = src.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("/")) return trimmed;

  const driveFileId = getDriveFileId(trimmed);
  if (driveFileId) {
    return `https://drive.google.com/uc?export=view&id=${driveFileId}`;
  }

  return trimmed;
}

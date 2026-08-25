import { NextResponse } from "next/server";
import { getAdminDb, requireAdminRequest, serializeTimestamp } from "../../../../lib/firebaseAdmin";
import { proxyToBackend } from "../../../../lib/serverApi";

export const dynamic = "force-dynamic";

function normalizeText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

const DRIVE_FILE_ID_PATTERNS = [
  /drive\.google\.com\/file\/d\/([^/]+)/i,
  /drive\.google\.com\/open\?id=([^&/]+)/i,
  /drive\.google\.com\/uc\?(?:[^#]*&)?id=([^&/]+)/i,
  /drive\.google\.com\/thumbnail\?(?:[^#]*&)?id=([^&/]+)/i,
  /drive\.google\.com\/uc\?export=view&id=([^&/]+)/i,
  /drive\.google\.com\/uc\?export=download&id=([^&/]+)/i,
];

function getDriveFileId(value) {
  const url = normalizeText(value);
  if (!url) return null;

  for (const pattern of DRIVE_FILE_ID_PATTERNS) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}

function normalizeImageUrl(value) {
  const url = normalizeText(value);
  if (!url) return "";

  if (url.startsWith("/")) return url;

  const driveFileId = getDriveFileId(url);
  if (driveFileId) {
    return `https://drive.google.com/uc?export=view&id=${driveFileId}`;
  }

  return url;
}

function formatGalleryItem(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    title: data.title || "",
    caption: data.caption || "",
    instagramLink: data.instagramLink || "",
    imageUrl: data.imageUrl || "",
    imageAlt: data.imageAlt || "",
    sortOrder: Number(data.sortOrder ?? 0),
    createdAt: serializeTimestamp(data.createdAt),
    updatedAt: serializeTimestamp(data.updatedAt),
  };
}

export async function PUT(request, { params }) {
  try {
    const db = getAdminDb();
    if (!db) {
      return proxyToBackend(request, `/gallery/${params.id}`);
    }

    await requireAdminRequest(request);

    const id = String(params.id || "").trim();
    if (!id) {
      return NextResponse.json({ error: "Gallery item not found" }, { status: 404 });
    }

    const ref = db.collection("gallery").doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Gallery item not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const updates = {
      title: normalizeText(body.title),
      caption: normalizeText(body.caption),
      instagramLink: normalizeText(body.instagramLink),
      imageUrl: normalizeImageUrl(body.imageUrl),
      imageAlt: normalizeText(body.imageAlt),
      sortOrder: Number(body.sortOrder || 0),
      updatedAt: new Date(),
    };

    if (!updates.title || !updates.imageUrl) {
      return NextResponse.json({ error: "title and imageUrl are required" }, { status: 400 });
    }

    await ref.update(updates);
    const updated = await ref.get();
    return NextResponse.json(formatGalleryItem(updated));
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: "Failed to update gallery item",
        detail: process.env.NODE_ENV === "production" ? undefined : error.message,
      },
      { status: error.status || 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const db = getAdminDb();
    if (!db) {
      return proxyToBackend(request, `/gallery/${params.id}`);
    }

    await requireAdminRequest(request);

    const id = String(params.id || "").trim();
    if (!id) {
      return NextResponse.json({ error: "Gallery item not found" }, { status: 404 });
    }

    const ref = db.collection("gallery").doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Gallery item not found" }, { status: 404 });
    }

    await ref.delete();
    return NextResponse.json({ message: "Gallery item deleted", id });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: "Failed to delete gallery item",
        detail: process.env.NODE_ENV === "production" ? undefined : error.message,
      },
      { status: error.status || 500 }
    );
  }
}

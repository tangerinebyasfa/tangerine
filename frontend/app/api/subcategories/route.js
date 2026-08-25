import { NextResponse } from "next/server";
import { getSubcategories } from "../../../lib/firestoreServer";
import { getAdminDb, requireAdminRequest, serializeTimestamp } from "../../../lib/firebaseAdmin";
import { proxyToBackend } from "../../../lib/serverApi";

export const dynamic = "force-dynamic";

const PRODUCT_TYPES = ["accessories", "clothes", "footwear"];

function normalizeText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizeParentType(value) {
  if (!value) return null;
  const normalized = String(value).trim().toLowerCase();
  return PRODUCT_TYPES.includes(normalized) ? normalized : null;
}

function formatSubcategory(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: serializeTimestamp(data.createdAt),
    updatedAt: serializeTimestamp(data.updatedAt),
  };
}

export async function GET() {
  try {
    const subcategories = await getSubcategories();
    return NextResponse.json(subcategories);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch subcategories" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const db = getAdminDb();
    if (!db) {
      return proxyToBackend(request, "/subcategories");
    }

    await requireAdminRequest(request);

    const body = await request.json().catch(() => ({}));
    const name = normalizeText(body.name);
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const parentType = normalizeParentType(body.parentType);
    if (body.parentType && !parentType) {
      return NextResponse.json(
        { error: "parentType must be accessories, clothes or footwear" },
        { status: 400 }
      );
    }

    const payload = {
      name,
      slug: slugify(name),
      description: normalizeText(body.description),
      image: normalizeText(body.image) || null,
      parentType,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const ref = await db.collection("categories").add(payload);
    await db.collection("subcategories").doc(ref.id).set({ id: ref.id, ...payload }, { merge: true });

    return NextResponse.json({ id: ref.id, ...payload }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: "Failed to create subcategory",
        detail: process.env.NODE_ENV === "production" ? undefined : error.message,
      },
      { status: error.status || 500 }
    );
  }
}

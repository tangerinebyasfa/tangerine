import { NextResponse } from "next/server";
import { getAdminDb, requireAdminRequest, serializeTimestamp } from "../../../lib/firebaseAdmin";
import { proxyToBackend } from "../../../lib/serverApi";
import { getProducts } from "../../../lib/firestoreServer";

export const dynamic = "force-dynamic";

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

function normalizeList(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeBoolean(value) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function normalizeNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatProduct(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: serializeTimestamp(data.createdAt),
    updatedAt: serializeTimestamp(data.updatedAt),
  };
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());
    const products = await getProducts(params);
    return NextResponse.json(products);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const db = getAdminDb();
    if (!db) {
      return proxyToBackend(request, "/products");
    }

    await requireAdminRequest(request);

    const body = await request.json().catch(() => ({}));
    const name = normalizeText(body.name);
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const slug = normalizeText(body.slug) || slugify(name);
    const internalCode = normalizeText(body.internalCode);
    const code = normalizeText(body.code) || internalCode || slugify(name);
    const images = normalizeList(body.images);
    const sizes = normalizeList(body.sizes);
    const colors = normalizeList(body.colors);
    const additionalInfo = Array.isArray(body.additionalInfo) ? body.additionalInfo : normalizeList(body.additionalInfo);

    const payload = {
      name,
      slug,
      code,
      internalCode: internalCode || code,
      description: normalizeText(body.description),
      additionalInfo,
      sizeOptions: normalizeList(body.sizeOptions),
      materials: normalizeList(body.materials),
      washCare: normalizeList(body.washCare),
      deliveryInfo: normalizeText(body.deliveryInfo),
      price: normalizeNumber(body.price),
      compareAtPrice: normalizeNumber(body.compareAtPrice),
      productType: normalizeText(body.productType),
      categoryParentType: normalizeText(body.categoryParentType || body.productType),
      categorySlug: normalizeText(body.categorySlug),
      subType: normalizeText(body.subType || body.categorySlug),
      stock: normalizeNumber(body.stock),
      images,
      sizes,
      colors,
      availableAt: normalizeList(body.availableAt),
      sizeGuide: normalizeText(body.sizeGuide),
      featured: normalizeBoolean(body.featured),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (!payload.images.length) {
      return NextResponse.json({ error: "images is required" }, { status: 400 });
    }

    const ref = await db.collection("products").add(payload);
    return NextResponse.json({ id: ref.id, ...payload }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: "Failed to create product",
        detail: process.env.NODE_ENV === "production" ? undefined : error.message,
      },
      { status: error.status || 500 }
    );
  }
}

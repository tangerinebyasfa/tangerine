import { NextResponse } from "next/server";
import { getAdminDb, requireAdminRequest, serializeTimestamp } from "../../../../lib/firebaseAdmin";
import { proxyToBackend } from "../../../../lib/serverApi";
import { getProduct } from "../../../../lib/firestoreServer";

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

export async function GET(_request, { params }) {
  try {
    const product = await getProduct(params.id);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const db = getAdminDb();
    if (!db) {
      return proxyToBackend(request, `/products/${params.id}`);
    }

    await requireAdminRequest(request);

    const id = String(params.id || "").trim();
    if (!id) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const ref = db.collection("products").doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const current = snap.data() || {};
    const name = normalizeText(body.name) || normalizeText(current.name);
    const slug = normalizeText(body.slug) || normalizeText(current.slug) || slugify(name);
    const internalCode =
      normalizeText(body.internalCode) || normalizeText(body.code) || normalizeText(current.internalCode) || normalizeText(current.code);
    const images = body.images !== undefined ? normalizeList(body.images) : normalizeList(current.images);
    const sizes = body.sizes !== undefined ? normalizeList(body.sizes) : normalizeList(current.sizes);
    const colors = body.colors !== undefined ? normalizeList(body.colors) : normalizeList(current.colors);
    const additionalInfo =
      body.additionalInfo !== undefined
        ? Array.isArray(body.additionalInfo)
          ? body.additionalInfo
          : normalizeList(body.additionalInfo)
        : current.additionalInfo || [];

    const updates = {
      name,
      slug,
      code: internalCode || slug,
      internalCode: internalCode || slug,
      description: normalizeText(body.description) || normalizeText(current.description),
      additionalInfo,
      sizeOptions:
        body.sizeOptions !== undefined
          ? normalizeList(body.sizeOptions)
          : normalizeList(current.sizeOptions),
      materials:
        body.materials !== undefined ? normalizeList(body.materials) : normalizeList(current.materials),
      washCare:
        body.washCare !== undefined ? normalizeList(body.washCare) : normalizeList(current.washCare),
      deliveryInfo: normalizeText(body.deliveryInfo) || normalizeText(current.deliveryInfo),
      price: body.price !== undefined ? normalizeNumber(body.price) : current.price ?? null,
      compareAtPrice:
        body.compareAtPrice !== undefined ? normalizeNumber(body.compareAtPrice) : current.compareAtPrice ?? null,
      productType: normalizeText(body.productType) || normalizeText(current.productType),
      categoryParentType:
        normalizeText(body.categoryParentType) || normalizeText(body.productType) || normalizeText(current.categoryParentType),
      categorySlug: normalizeText(body.categorySlug) || normalizeText(current.categorySlug),
      subType: normalizeText(body.subType) || normalizeText(body.categorySlug) || normalizeText(current.subType),
      stock: body.stock !== undefined ? normalizeNumber(body.stock) : current.stock ?? null,
      images,
      sizes,
      colors,
      availableAt:
        body.availableAt !== undefined ? normalizeList(body.availableAt) : normalizeList(current.availableAt),
      sizeGuide: normalizeText(body.sizeGuide) || normalizeText(current.sizeGuide),
      featured: body.featured !== undefined ? normalizeBoolean(body.featured) : !!current.featured,
      updatedAt: new Date(),
    };

    if (!updates.name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    if (!updates.images.length) {
      return NextResponse.json({ error: "images is required" }, { status: 400 });
    }

    await ref.update(updates);
    const updated = await ref.get();
    return NextResponse.json(formatProduct(updated));
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: "Failed to update product",
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
      return proxyToBackend(request, `/products/${params.id}`);
    }

    await requireAdminRequest(request);

    const id = String(params.id || "").trim();
    if (!id) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const ref = db.collection("products").doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    await ref.delete();
    return NextResponse.json({ message: "Product deleted", id });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: "Failed to delete product",
        detail: process.env.NODE_ENV === "production" ? undefined : error.message,
      },
      { status: error.status || 500 }
    );
  }
}

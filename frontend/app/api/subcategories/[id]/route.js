import { NextResponse } from "next/server";
import { getSubcategory } from "../../../../lib/firestoreServer";
import { getAdminDb, requireAdminRequest, serializeTimestamp } from "../../../../lib/firebaseAdmin";
import { proxyToBackend } from "../../../../lib/serverApi";

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

export async function GET(_request, { params }) {
  try {
    const subcategory = await getSubcategory(params.id);
    if (!subcategory) {
      return NextResponse.json({ error: "Subcategory not found" }, { status: 404 });
    }

    return NextResponse.json(subcategory);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch subcategory" }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const db = getAdminDb();
    if (!db) {
      return proxyToBackend(request, `/subcategories/${params.id}`);
    }

    await requireAdminRequest(request);

    const id = String(params.id || "").trim();
    if (!id) {
      return NextResponse.json({ error: "Subcategory not found" }, { status: 404 });
    }

    const categoryRef = db.collection("categories").doc(id);
    const subcategoryRef = db.collection("subcategories").doc(id);
    const snap = await categoryRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Subcategory not found" }, { status: 404 });
    }

    const current = snap.data() || {};
    const body = await request.json().catch(() => ({}));
    const name = normalizeText(body.name) || normalizeText(current.name);
    const parentTypeRaw = body.parentType !== undefined ? body.parentType : current.parentType;
    const parentType = normalizeParentType(parentTypeRaw);

    if (parentTypeRaw && !parentType) {
      return NextResponse.json(
        { error: "parentType must be accessories, clothes or footwear" },
        { status: 400 }
      );
    }

    const updates = {
      name,
      slug: body.name ? slugify(name) : normalizeText(current.slug) || slugify(name),
      description:
        body.description !== undefined ? normalizeText(body.description) : normalizeText(current.description),
      image: body.image !== undefined ? normalizeText(body.image) || null : current.image || null,
      parentType: body.parentType !== undefined ? parentType : current.parentType || null,
      updatedAt: new Date(),
    };

    if (!updates.name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    await categoryRef.update(updates);
    await subcategoryRef.set({ id, ...updates }, { merge: true });

    const previousSlug = normalizeText(current.slug);
    const slugChanged = previousSlug && updates.slug && updates.slug !== previousSlug;
    const parentTypeChanged = updates.parentType !== current.parentType;

    if (slugChanged || parentTypeChanged || updates.name !== current.name) {
      const productsSnapshot = await db.collection("products").get();
      const affectedProducts = productsSnapshot.docs.filter((productDoc) => {
        const product = productDoc.data() || {};
        return product.categorySlug === previousSlug || product.categorySlug === id;
      });

      await Promise.all(
        affectedProducts.map((productDoc) =>
          db.collection("products").doc(productDoc.id).update({
            categorySlug: updates.slug,
            categoryParentType: updates.parentType || null,
            productType: updates.parentType || null,
            updatedAt: new Date(),
          })
        )
      );
    }

    const updated = await categoryRef.get();
    return NextResponse.json(formatSubcategory(updated));
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: "Failed to update subcategory",
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
      return proxyToBackend(request, `/subcategories/${params.id}`);
    }

    await requireAdminRequest(request);

    const id = String(params.id || "").trim();
    if (!id) {
      return NextResponse.json({ error: "Subcategory not found" }, { status: 404 });
    }

    const categoryRef = db.collection("categories").doc(id);
    const subcategoryRef = db.collection("subcategories").doc(id);
    const snap = await categoryRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Subcategory not found" }, { status: 404 });
    }

    await categoryRef.delete();
    await subcategoryRef.delete();
    return NextResponse.json({ message: "Subcategory deleted", id });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: "Failed to delete subcategory",
        detail: process.env.NODE_ENV === "production" ? undefined : error.message,
      },
      { status: error.status || 500 }
    );
  }
}

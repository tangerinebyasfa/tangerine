import { NextResponse } from "next/server";
import { getProduct } from "../../../../lib/firestoreServer";

export const dynamic = "force-dynamic";

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

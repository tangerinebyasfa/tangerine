import { NextResponse } from "next/server";
import { getSubcategory } from "../../../../lib/firestoreServer";

export const dynamic = "force-dynamic";

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

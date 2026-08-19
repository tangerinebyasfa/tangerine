import { NextResponse } from "next/server";
import { getCategory } from "../../../../lib/firestoreServer";

export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  try {
    const category = await getCategory(params.id);
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch category" }, { status: 500 });
  }
}

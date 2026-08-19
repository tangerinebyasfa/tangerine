import { NextResponse } from "next/server";
import { getSubcategories } from "../../../lib/firestoreServer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const subcategories = await getSubcategories();
    return NextResponse.json(subcategories);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch subcategories" }, { status: 500 });
  }
}

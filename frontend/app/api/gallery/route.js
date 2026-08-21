import { NextResponse } from "next/server";
import { getGalleryItems } from "../../../lib/firestoreServer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await getGalleryItems();
    return NextResponse.json(items);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch gallery items" }, { status: 500 });
  }
}

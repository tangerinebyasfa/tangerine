import { NextResponse } from "next/server";
import { getGalleryItems } from "../../../lib/firestoreServer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await getGalleryItems();
    return NextResponse.json(items);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: "Failed to fetch gallery items",
        detail: process.env.NODE_ENV === "production" ? undefined : error.message,
      },
      { status: 500 }
    );
  }
}

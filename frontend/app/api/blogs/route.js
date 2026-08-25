import { NextResponse } from "next/server";
import { getBlogs } from "../../../lib/firestoreServer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const blogs = await getBlogs();
    return NextResponse.json(blogs);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: "Failed to fetch blog posts",
        detail: process.env.NODE_ENV === "production" ? undefined : error.message,
      },
      { status: 500 }
    );
  }
}

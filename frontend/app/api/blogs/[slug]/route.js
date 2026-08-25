import { NextResponse } from "next/server";
import { getBlog } from "../../../../lib/firestoreServer";

export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  try {
    const post = await getBlog(params.slug);
    if (!post) {
      return NextResponse.json({ error: "Blog post not found" }, { status: 404 });
    }

    return NextResponse.json(post);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: "Failed to fetch blog post",
        detail: process.env.NODE_ENV === "production" ? undefined : error.message,
      },
      { status: 500 }
    );
  }
}

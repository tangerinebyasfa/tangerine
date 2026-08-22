import { NextResponse } from "next/server";

export const runtime = "nodejs";

const ALLOWED_HOSTNAMES = new Set([
  "drive.google.com",
  "www.drive.google.com",
  "lh3.googleusercontent.com",
  "images.unsplash.com",
  "firebasestorage.googleapis.com",
  "ahaeli.com",
  "www.ahaeli.com",
  "encrypted-tbn0.gstatic.com",
  "inc5shop.com",
]);

function isAllowedUrl(value) {
  try {
    const url = new URL(value);
    return ALLOWED_HOSTNAMES.has(url.hostname);
  } catch {
    return false;
  }
}

export async function GET(request) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url || !isAllowedUrl(url)) {
    return NextResponse.json({ error: "Invalid image URL" }, { status: 400 });
  }

  try {
    const upstream = await fetch(url, {
      redirect: "follow",
      headers: {
        accept: "image/*,*/*;q=0.8",
      },
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Image fetch failed with status ${upstream.status}` },
        { status: 502 }
      );
    }

    const contentType = upstream.headers.get("content-type") || "image/jpeg";
    const buffer = Buffer.from(await upstream.arrayBuffer());

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Unable to fetch image" },
      { status: 502 }
    );
  }
}

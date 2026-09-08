import { NextResponse } from 'next/server';
import { proxyToBackend } from './serverApi';

export async function proxyOrderRequest(request, path) {
  if (!request.headers.get('authorization')?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 });
  }
  try {
    return await proxyToBackend(request, path);
  } catch {
    return NextResponse.json({ error: 'Order service unavailable. Please retry your checkout.' }, { status: 503 });
  }
}

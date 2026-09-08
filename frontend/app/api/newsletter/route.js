import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../lib/firebaseAdmin';
import { normalizeNewsletterEmail } from '../../../lib/newsletter.mjs';

export const runtime = 'nodejs';
const accepted = () => NextResponse.json({ success: true });

export async function POST(request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
  const body = await request.text();
  if (body.length > 2048) return NextResponse.json({ error: 'Request too large.' }, { status: 413 });
  let payload;
  try { payload = JSON.parse(body); } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }
  if (payload?.website) return accepted();
  const email = normalizeNewsletterEmail(payload?.email);
  if (!email || payload.consent !== true) return NextResponse.json({ error: 'A valid email and consent are required.' }, { status: 400 });
  try {
    const db = getAdminDb();
    if (!db) throw new Error('Newsletter storage unavailable');
    // Surface signups in the existing admin Customer Enquiries area. Stable IDs
    // make retries idempotent without exposing whether an email is registered.
    const ref = db.collection('messages').doc(`newsletter_${createHash('sha256').update(email).digest('hex')}`);
    await db.runTransaction(async transaction => {
      const existing = await transaction.get(ref);
      if (existing.exists) return;
      transaction.set(ref, {
        name: 'Newsletter subscriber', email, phone: '', subject: 'Newsletter signup',
        message: 'Requested Tangerine newsletters, style updates and offers.',
        source: 'newsletter', status: 'new', consent: true, consentVersion: 'newsletter-v1',
        page: typeof payload.page === 'string' && payload.page.startsWith('/') ? payload.page.slice(0, 300) : '/',
        createdAt: new Date(),
      });
    });
    return accepted();
  } catch {
    return NextResponse.json({ error: 'Signup is temporarily unavailable.' }, { status: 503 });
  }
}

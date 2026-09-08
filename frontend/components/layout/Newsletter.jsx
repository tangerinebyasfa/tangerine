"use client";

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Check } from 'lucide-react';
import { normalizeNewsletterEmail } from '../../lib/newsletter.mjs';

export default function Newsletter({ pathname }) {
  const section = useRef(null);
  const submitting = useRef(false);
  const emailId = useId();
  const messageId = useId();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const element = section.current;
    const media = window.matchMedia('(prefers-reduced-motion: no-preference) and (min-width: 768px) and (pointer: fine)');
    let frame = 0;
    let visible = false;
    function update() {
      frame = 0;
      const rect = element.getBoundingClientRect();
      const offset = media.matches ? Math.max(-48, Math.min(48, (window.innerHeight / 2 - rect.top - rect.height / 2) * 0.15)) : 0;
      element.style.setProperty('--newsletter-shift', `${offset}px`);
    }
    function scroll() { if (visible && !frame) frame = requestAnimationFrame(update); }
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) scroll(); });
    observer.observe(element);
    window.addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('resize', scroll);
    media.addEventListener('change', update);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); window.removeEventListener('scroll', scroll); window.removeEventListener('resize', scroll); media.removeEventListener('change', update); };
  }, []);

  async function subscribe(event) {
    event.preventDefault();
    if (submitting.current || status === 'success') return;
    const normalized = normalizeNewsletterEmail(email);
    if (!normalized) { setStatus('error'); setMessage('Please enter a valid email address.'); return; }
    submitting.current = true; setStatus('loading'); setMessage('');
    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalized, page: pathname, consent: true, website: new FormData(event.currentTarget).get('website') }),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error('We could not save your signup. Please try again.');
      setStatus('success'); setMessage('Thank you! Your newsletter signup has been saved.'); setEmail('');
    } catch (error) { setStatus('error'); setMessage(error.name === 'TimeoutError' ? 'The request timed out. Please try again.' : error.message); }
    finally { submitting.current = false; }
  }

  return <section ref={section} className="newsletter-section" aria-labelledby="newsletter-title">
    <div className="newsletter-photo" aria-hidden="true"><Image src="/Images/newsletter/tangerine-editorial.webp" alt="" fill sizes="100vw" className="object-cover object-[42%_center]" /></div>
    <div className="newsletter-shade" aria-hidden="true" />
    <div className="newsletter-panel">
      <h2 id="newsletter-title" className="font-display text-3xl leading-tight text-white sm:text-4xl">Stay in the loop</h2>
      <p className="mx-auto mt-2 text-sm leading-6 text-white/90">New arrivals & exclusive offers.</p>
      <form onSubmit={subscribe} className="mx-auto mt-5 max-w-lg">
        <label htmlFor={emailId} className="sr-only">Email address for the newsletter</label>
        <div className="newsletter-form-row">
          <input id={emailId} type="email" name="email" autoComplete="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} disabled={status === 'loading' || status === 'success'} placeholder="Your email address" aria-describedby={messageId} className="min-w-0 flex-1 bg-white px-4 py-4 text-sm text-ink outline-none placeholder:text-ink/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-tangerine disabled:opacity-90" />
          <button type="submit" disabled={status === 'loading' || status === 'success'} className="inline-flex min-h-12 items-center justify-center gap-3 bg-[#263c3b] px-7 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:bg-tangerine focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-default disabled:opacity-80">{status === 'loading' ? 'Joining...' : status === 'success' ? 'Joined' : 'Join us'}{status === 'success' ? <Check size={15} /> : <ArrowRight size={15} />}</button>
        </div>
        <div className="hidden" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
        <p className="mt-3 text-[11px] leading-5 text-white/85">By joining, you agree to marketing emails. <Link href="/privacy" className="underline underline-offset-2 hover:text-white">Privacy policy</Link></p>
        <p id={messageId} role="status" aria-live="polite" className="text-xs text-white empty:hidden [&:not(:empty)]:mt-2">{message}</p>
      </form>
    </div>
  </section>;
}

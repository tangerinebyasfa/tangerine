"use client";
import { usePathname } from 'next/navigation';
import Newsletter from './Newsletter';
import { newsletterSuitable } from '../../lib/newsletter.mjs';

export default function SiteFooter({ children }) {
  const pathname = usePathname();
  return <div className="mt-10 lg:mt-20">
    {newsletterSuitable(pathname) && <Newsletter pathname={pathname} />}
    {children}
  </div>;
}

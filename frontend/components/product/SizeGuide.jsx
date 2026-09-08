"use client";
import { useState } from 'react';
import Link from 'next/link';
import { parseSizeGuide, displayMeasurement } from '../../lib/sizeGuide.mjs';

export default function SizeGuide({ guide, selectedSize, productType }) {
  const [inches, setInches] = useState(false);
  const { headers, rows, notes } = parseSizeGuide(guide);
  return <div className="space-y-4 text-sm leading-6">
    {headers.length > 0 && <>
      {headers.some(header => /\(cm\)/i.test(header)) && <label className="flex items-center gap-2"><input type="checkbox" checked={inches} onChange={e => setInches(e.target.checked)} /> Show measurements in inches</label>}
      <div className="overflow-x-auto"><table className="w-full border-collapse text-left"><caption className="sr-only">Product size measurements</caption><thead><tr>{headers.map((header, i) => <th key={i} className="whitespace-nowrap border bg-sand px-3 py-2">{inches ? header.replace(/\(cm\)/ig, '(in)') : header}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i} className={String(row[0]).toLowerCase() === String(selectedSize || '').toLowerCase() ? 'bg-orange-50 font-semibold' : ''}>{row.map((cell, j) => <td key={j} className="whitespace-nowrap border px-3 py-2">{j === 0 ? cell : displayMeasurement(cell, headers[j], inches)}</td>)}</tr>)}</tbody></table></div>
    </>}
    {notes && <p className="whitespace-pre-line">{notes}</p>}
    {!guide && <p>Measurements for this product are not available yet. <Link href="/contact" className="underline">Contact us</Link> for help choosing your size before ordering.</p>}
    <div className="border-l-2 border-tangerine pl-3"><p className="font-medium">How to measure</p><p>{productType === 'footwear' ? 'Measure from your heel to your longest toe while standing. Measure both feet and compare the longer foot with this product’s chart.' : 'Use a flexible tape without pulling it tight. Measure around the fullest part of your chest and hips, and your natural waist. Check whether the chart describes body or garment measurements.'}</p><p className="mt-2">Compare the measurements, not just the size label. If between sizes, contact us for fit advice.</p></div>
  </div>;
}

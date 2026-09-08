"use client";
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { formatINR } from '../../lib/currency';
import ReturnHistory from './ReturnHistory';

const inputStyle = 'mt-1 w-full border border-ink/20 bg-white p-3 text-sm';
export default function OrderReturns({ orderId, onChange }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [revision, setRevision] = useState(0);
  const [form, setForm] = useState({ lineIndex: '', type: 'return', reason: '', size: '', color: '' });
  useEffect(() => {
    let active = true;
    setError('');
    api.getOrderReturns(orderId).then(result => { if (active) setData(result); }).catch(err => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [orderId, revision]);
  const available = data?.items.filter(item => item.returnEligible !== false && !data.requests.some(request => request.lineIndex === item.lineIndex)) || [];
  const item = available.find(item => String(item.lineIndex) === form.lineIndex);
  async function submit(event) {
    event.preventDefault();
    if (!item || saving) return;
    setSaving(true); setError('');
    try {
      await api.requestReturn(orderId, { ...form, lineIndex: Number(form.lineIndex) });
      setForm({ lineIndex: '', type: 'return', reason: '', size: '', color: '' });
      setRevision(value => value + 1);
      onChange?.();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }
  return <section className="space-y-5 border border-ink/10 bg-white p-4 sm:p-6" aria-label="Returns and exchanges">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-2xl">Returns & exchanges</h2><button type="button" onClick={() => setRevision(value => value + 1)} className="text-sm underline">Refresh status</button></div>
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    {!data && !error && <p className="text-sm">Loading return options...</p>}
    {data && <>
      <p className="text-sm text-ink/65">Request within {data.windowDays} days of delivery. Items must meet the return policy. One request covers all units in the selected purchased line. Exchanges are for another size or colour of the same product.</p>
      {data.deadline && <p className="text-sm">Request deadline: {new Date(data.deadline).toLocaleString()}</p>}
      {data.requests.map(request => <div key={request.id} className="border p-4"><ReturnHistory request={request} /></div>)}
      {data.eligible && available.length > 0 ? <form onSubmit={submit} className="space-y-4 border-t pt-4">
        <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">Purchased item<select required value={form.lineIndex} onChange={e => setForm({ ...form, lineIndex: e.target.value, size: '', color: '' })} className={inputStyle}><option value="">Select an item</option>{available.map(item => <option key={item.lineIndex} value={item.lineIndex}>{item.productName || item.name} ({item.quantity}) {[item.size, item.color].filter(Boolean).join(' / ')}</option>)}</select></label><label className="text-sm">Request type<select value={form.type} onChange={e => setForm({ ...form, type: e.target.value, size: '', color: '' })} className={inputStyle}><option value="return">Return for refund</option><option value="exchange">Exchange size / colour</option></select></label></div>
        {form.type === 'exchange' && item && <div className="grid gap-4 sm:grid-cols-2">{[['size', item.sizes], ['color', item.colors]].map(([field, values]) => values.length > 0 && <label key={field} className="text-sm capitalize">New {field}<select required value={form[field]} onChange={e => setForm({ ...form, [field]: e.target.value })} className={inputStyle}><option value="">Choose {field}</option>{values.map(value => <option key={value} value={value}>{value}</option>)}</select></label>)}</div>}
        {form.type === 'return' && item && <p className="text-sm">Eligible merchandise refund if approved: {formatINR(item.refundAmount)}. Original discounts are deducted; shipping is excluded.</p>}
        <label className="block text-sm">Reason and item condition<textarea required minLength={10} maxLength={1000} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} className={inputStyle} placeholder="Tell us what went wrong and whether the item is unused with its tags." /></label>
        <p className="text-xs text-ink/60">Do not include card or bank details. The store will provide instructions after reviewing your request.</p>
        <button disabled={saving || !item} className="bg-tangerine px-5 py-3 text-sm text-white disabled:opacity-50">{saving ? 'Submitting...' : 'Submit request'}</button>
      </form> : <p className="text-sm text-ink/65">{!data.eligible ? 'New requests are unavailable until delivery or after the return window closes.' : 'Each eligible purchased line already has a request.'} For additional help, contact the store with your order ID.</p>}
    </>}
  </section>;
}

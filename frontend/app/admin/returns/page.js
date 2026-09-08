"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { formatINR } from '../../../lib/currency';
import ReturnHistory, { returnStatusLabel } from '../../../components/order/ReturnHistory';

const states = ['requested', 'approved', 'received', 'exchange_shipped', 'completed', 'rejected'];
function RequestCard({ request, onUpdated }) {
  const [action, setAction] = useState('');
  const [note, setNote] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [restock, setRestock] = useState(false);
  const [reference, setReference] = useState('');
  const [amount, setAmount] = useState('');
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const actions = { requested: ['approved', 'rejected'], approved: ['received', 'rejected'], received: request.type === 'return' ? ['completed'] : ['exchange_shipped'], exchange_shipped: ['completed'], completed: [], rejected: [] }[request.status] || [];
  async function submit(event) {
    event.preventDefault(); if (saving) return;
    setSaving(true); setError('');
    try {
      const updated = await api.updateReturn(request.id, { status: action, note, inspected: confirmed, restock, refundConfirmed: confirmed, refundAmount: Number(amount), refundReference: reference, deliveryConfirmed: confirmed, carrier, trackingNumber });
      onUpdated(updated); setAction(''); setNote(''); setConfirmed(false); setReference(''); setAmount('');
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }
  const input = 'mt-1 w-full border border-ink/20 bg-white p-2';
  return <article className="space-y-4 border border-ink/15 bg-white p-4 sm:p-6">
    <div className="text-sm"><Link href={`/admin/orders/${encodeURIComponent(request.orderId)}`} className="text-tangerine underline">{request.orderId}</Link><p>{request.customerName}</p></div>
    <ReturnHistory request={request} />
    {actions.length > 0 && <form onSubmit={submit} className="space-y-3 border-t pt-4 text-sm">
      <label className="block">Next step<select required value={action} onChange={e => { setAction(e.target.value); setConfirmed(false); }} className={input}><option value="">Select action</option>{actions.map(value => <option key={value} value={value}>{returnStatusLabel(value)}</option>)}</select></label>
      {action && <>
        <label className="block">Customer-visible instructions / update<textarea required={['approved', 'rejected'].includes(action)} minLength={['approved', 'rejected'].includes(action) ? 5 : undefined} maxLength={1000} value={note} onChange={e => setNote(e.target.value)} className={input} /></label>
        {action === 'received' && <><label className="flex gap-2"><input type="checkbox" required checked={confirmed} onChange={e => setConfirmed(e.target.checked)} /> Returned units have been received and inspected.</label><label className="flex gap-2"><input type="checkbox" checked={restock} onChange={e => setRestock(e.target.checked)} /> All returned units are sellable; add them back to stock.</label>{request.type === 'exchange' && <p>Replacement stock will be reserved now. Verify the requested size and colour are available.</p>}</>}
        {action === 'exchange_shipped' && <div className="grid gap-3 sm:grid-cols-2"><label>Courier<input required maxLength={100} value={carrier} onChange={e => setCarrier(e.target.value)} className={input} /></label><label>Tracking number<input required maxLength={150} value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} className={input} /></label></div>}
        {action === 'completed' && request.type === 'return' && <><p>Issue the refund through your normal payment process first. This form records it; it does not transfer money.</p><label className="block">Amount refunded (expected {formatINR(request.refundAmount)})<input type="number" required min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className={input} /></label><label className="block">Refund transaction reference<input required maxLength={200} value={reference} onChange={e => setReference(e.target.value)} className={input} /></label><label className="flex gap-2"><input required type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} /> I confirm this refund has been issued.</label></>}
        {action === 'completed' && request.type === 'exchange' && <label className="flex gap-2"><input required type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} /> I confirm the replacement was delivered.</label>}
        <button disabled={saving} className="bg-tangerine px-4 py-2 text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save update'}</button>
      </>}
      {error && <p role="alert" className="text-rose-700">{error}</p>}
    </form>}
  </article>;
}

export default function ReturnsAdminPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true; setLoading(true); setError('');
    api.getReturns().then(data => { if (active) setRequests(data); }).catch(err => { if (active) setError(err.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision]);
  const filtered = requests.filter(request => (!status || request.status === status) && `${request.orderId} ${request.customerName} ${request.item.productName}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="space-y-6"><h1 className="font-display text-3xl">Returns & exchanges</h1><p className="text-sm text-ink/65">Review requests, share instructions, inspect received items and confirm refunds or replacement delivery.</p>
    <div className="flex flex-wrap gap-3"><input aria-label="Search returns" placeholder="Search order, customer or product" value={search} onChange={e => setSearch(e.target.value)} className="min-w-0 flex-1 border p-3" /><select aria-label="Request status" value={status} onChange={e => setStatus(e.target.value)} className="border p-3"><option value="">All statuses</option>{states.map(value => <option key={value} value={value}>{returnStatusLabel(value)}</option>)}</select><button onClick={() => setRevision(value => value + 1)} className="border px-4 py-2">Refresh</button></div>
    {error && <p role="alert" className="text-rose-700">{error}</p>}
    {loading ? <p>Loading requests...</p> : filtered.length ? filtered.map(request => <RequestCard key={request.id} request={request} onUpdated={updated => setRequests(current => current.map(item => item.id === updated.id ? updated : item))} />) : <p>No matching requests.</p>}
  </div>;
}

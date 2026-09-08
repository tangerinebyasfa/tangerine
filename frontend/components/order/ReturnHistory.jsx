import { formatINR } from '../../lib/currency';
export const returnStatusLabel = value => String(value || '').replaceAll('_', ' ');
export default function ReturnHistory({ request }) {
  return <div className="space-y-3 text-sm">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-medium">{request.type === 'exchange' ? 'Exchange' : 'Return'}: {request.item.productName || request.item.name}</h3><span className="border bg-orange-50 px-2 py-1 capitalize">{returnStatusLabel(request.status)}</span></div>
    <p>{request.item.quantity} item(s) · {[request.item.size, request.item.color].filter(Boolean).join(' / ')}</p>
    <p className="whitespace-pre-wrap break-words">Reason: {request.reason}</p>
    {request.replacement && <p>Requested replacement: {[request.replacement.size, request.replacement.color].filter(Boolean).join(' / ')}</p>}
    {request.type === 'return' && <p>{request.status === 'completed' ? 'Refund recorded' : 'Refund if approved'}: {formatINR(request.refundAmount)} (shipping excluded)</p>}
    {request.trackingNumber && <p>Replacement shipment: {request.carrier} — {request.trackingNumber}</p>}
    <ol className="space-y-2 border-l-2 border-tangerine/30 pl-3">{request.history.map((entry, index) => <li key={index}><p className="capitalize">{returnStatusLabel(entry.status)} <time className="ml-2 text-xs text-ink/50">{new Date(entry.at).toLocaleString()}</time></p><p className="whitespace-pre-wrap break-words text-ink/70">{entry.note}</p></li>)}</ol>
  </div>;
}

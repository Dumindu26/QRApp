import { useState, useEffect } from 'react';
import type { Order, OrderStatus } from '../types/index';
import { sessionService, type Session } from '../services/sessionService';
import { computeCharges, type RestaurantSettings } from '../services/restaurantService';
import { printService } from '../services/printService';
import { PaymentMethodModal, type PaymentMethod } from './PaymentMethodModal';
import { orderService } from '../services/orderService';
import {
  Printer, Download, MessageCircle, CheckCircle2, Loader2, Link2, Copy, ChevronRight,
} from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import toast from 'react-hot-toast';

interface Props {
  order: Order;
  onStatusChange?: (id: string, status: OrderStatus) => void;
  settings?: RestaurantSettings | null;
  onPaid?: (sessionId: string) => void;
  onSessionClosed?: (sessionId: string) => void;
}

const STATUS_FLOW: OrderStatus[] = ['pending', 'preparing', 'ready'];
const DELIVERY_STATUS_FLOW: OrderStatus[] = ['pending', 'preparing', 'ready', 'out-for-delivery', 'delivered'];
const STATUS_LABEL: Partial<Record<OrderStatus, string>> = { 'out-for-delivery': 'Out for Delivery' };

export function BillDetailPanel({ order, onStatusChange, settings, onPaid }: Props) {
  const { fmt } = useCurrency();

  const [liveSession, setLiveSession] = useState<Session | null>(null);
  const [showPay, setShowPay] = useState(false);
  const [paying, setPaying] = useState(false);
  const [showPayOrder, setShowPayOrder] = useState(false);
  const [payingOrder, setPayingOrder] = useState(false);
  const [orderPaid, setOrderPaid] = useState(!!order.paymentMethod);
  const [billPhone, setBillPhone] = useState(order.customerPhone ?? '');
  const [linkCopied, setLinkCopied] = useState(false);

  // Reset phone and paid state when order changes
  useEffect(() => {
    setBillPhone(order.customerPhone ?? '');
    setOrderPaid(!!order.paymentMethod);
  }, [order.id]);

  // Fetch session for dine-in
  useEffect(() => {
    if (!order.sessionId || order.orderType !== 'dine-in') return;
    sessionService.getSession(order.sessionId).then(setLiveSession).catch(() => {});
    const id = setInterval(() => {
      sessionService.getSession(order.sessionId!).then(setLiveSession).catch(() => {});
    }, 8000);
    return () => clearInterval(id);
  }, [order.sessionId, order.orderType]);

  // Bill items: prefer session's consolidated billItems, fall back to order items
  const billItems = liveSession?.billItems ?? order.items.map((i) => ({
    menuItemId: i.menuItemId,
    name: i.name,
    price: i.price,
    quantity: i.quantity,
    total: i.price * i.quantity,
    size: i.size,
  }));

  const subtotal = billItems.reduce((s, item) => s + item.total, 0);
  const charges = computeCharges(subtotal, {
    serviceChargePct: order.orderType === 'dine-in' ? (settings?.serviceChargePct ?? 0) : 0,
    taxPct: settings?.taxPct ?? 0,
  });
  const scName  = settings?.serviceChargeName ?? 'Service Charge';
  const taxName = settings?.taxName           ?? 'Tax';

  // Customer-facing bill URL
  const billLink = (() => {
    const origin = window.location.origin;
    if (order.orderType === 'dine-in' && (liveSession?.id ?? order.sessionId)) {
      return `${origin}/bill/${liveSession?.id ?? order.sessionId}`;
    }
    return `${origin}/order/${order.id}/bill`;
  })();

  function buildWhatsAppUrl(phone: string) {
    const text   = encodeURIComponent(`🧾 Your bill is ready!\n📄 View here: ${billLink}`);
    const digits = phone.replace(/\D/g, '');
    const e164   = phone.trim().startsWith('+')
      ? digits
      : digits.startsWith('0') ? `94${digits.slice(1)}` : digits;
    return `https://wa.me/${e164}?text=${text}`;
  }

  function handleSendWhatsApp() {
    const target = billPhone.trim();
    if (!target) { toast.error('Enter a mobile number first'); return; }
    window.open(buildWhatsAppUrl(target), '_blank', 'noopener,noreferrer');
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(billLink).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }

  function handleDownloadPdf() {
    const url = order.sessionId ? `/session-receipt/${order.sessionId}` : `/receipt/${order.id}`;
    window.open(url, '_blank', 'width=400,height=600');
  }

  async function handlePrint() {
    const result = await printService.receipt(order.id);
    if (result.success) toast.success('Receipt sent to printer');
    else handleDownloadPdf();
  }

  // Mark dine-in session as paid
  async function handlePaySession(method: PaymentMethod) {
    if (!liveSession || paying) return;
    setPaying(true);
    try {
      await sessionService.markAsPaid(liveSession.id, method);
      toast.success(`Table ${liveSession.tableNumber} marked as paid`);
      setShowPay(false);
      onPaid?.(liveSession.id);
    } catch {
      toast.error('Failed to mark as paid');
    } finally {
      setPaying(false);
    }
  }

  // Mark takeaway / room-service order as paid
  async function handlePayOrder(method: PaymentMethod) {
    if (payingOrder) return;
    setPayingOrder(true);
    try {
      await orderService.updateStatus(order.id, 'paid', method);
      setOrderPaid(true);
      toast.success('Order marked as paid');
      setShowPayOrder(false);
    } catch {
      toast.error('Failed to mark as paid');
    } finally {
      setPayingOrder(false);
    }
  }

  // ── Derived display data ────────────────────────────────────────────────────
  const isDineIn   = order.orderType === 'dine-in';
  const isDelivery = order.orderType === 'delivery';
  const typeLabel  = order.orderType === 'room-service' ? 'Room' : isDelivery ? 'Delivery' : isDineIn ? 'Table' : 'Takeaway';
  const typeNumber = order.orderType === 'room-service'
    ? order.roomNumber
    : isDineIn ? order.tableNumber : null;
  const deliveryFee = isDelivery ? (order.deliveryFee ?? 0) : 0;

  const activeOrders = (liveSession?.orders ?? []).filter((o) => o.status !== 'cancelled');

  // Overall status: worst-case across active orders (or fallback to order.status)
  const sessionStatus: OrderStatus = activeOrders.length > 0
    ? activeOrders.some((o) => o.status === 'pending')   ? 'pending'
    : activeOrders.some((o) => o.status === 'preparing') ? 'preparing'
    : 'ready'
    : (order.status as OrderStatus);

  const statusBadgeCls =
    sessionStatus === 'pending'   ? 'bg-amber-50 text-amber-700 border-amber-200'  :
    sessionStatus === 'preparing' ? 'bg-blue-50 text-blue-700 border-blue-200'     :
    sessionStatus === 'ready'     ? 'bg-green-50 text-green-700 border-green-200'  :
    sessionStatus === 'out-for-delivery' ? 'bg-teal-50 text-teal-700 border-teal-200' :
    sessionStatus === 'delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                    'bg-gray-100 text-gray-500 border-gray-200';

  // Delivery orders advance through two extra stages after Ready
  const deliveryFlow    = isDelivery ? DELIVERY_STATUS_FLOW : null;
  const deliveryCurIdx  = deliveryFlow ? deliveryFlow.indexOf(order.status as OrderStatus) : -1;
  const deliveryNextStatus = deliveryFlow && deliveryCurIdx >= 0 ? deliveryFlow[deliveryCurIdx + 1] as OrderStatus | undefined : undefined;
  const deliveryNextLabel  = deliveryNextStatus ? (STATUS_LABEL[deliveryNextStatus] ?? deliveryNextStatus) : undefined;

  const firstOrder = activeOrders[0];

  function fmtDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
    }).replace(',', '');
  }

  function fmtAge(dateStr: string) {
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60_000);
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
  }

  const sessionOpen = isDineIn ? liveSession?.status === 'open' : !orderPaid;
  const canMarkPaid = sessionOpen && billItems.length > 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Scrollable content ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 pt-5 pb-3">

        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              {typeLabel}
            </p>
            <h2 className="text-4xl font-black text-gray-900 leading-none">
              {typeNumber ?? (order.customerName || order.orderNumber)}
            </h2>
            {firstOrder && (
              <p className="text-xs text-gray-400 mt-1">
                #{firstOrder.orderNumber ?? 'ORD'} · {fmtDate(firstOrder.createdAt)}
                {activeOrders.length > 1 && ` · ${activeOrders.length} orders`}
              </p>
            )}
            {!firstOrder && (
              <p className="text-xs text-gray-400 mt-1">
                #{order.orderNumber} · {fmtDate(order.createdAt)}
              </p>
            )}
            {isDelivery && order.deliveryAddress && (
              <p className="text-xs text-gray-400 mt-1">
                {order.deliveryAddress}{order.customerPhone ? ` · ${order.customerPhone}` : ''}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 mt-1 shrink-0">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full border capitalize whitespace-nowrap ${statusBadgeCls}`}>
              {STATUS_LABEL[sessionStatus] ?? sessionStatus}
            </span>
            {deliveryNextStatus && onStatusChange && (
              <button
                onClick={() => onStatusChange(order.id, deliveryNextStatus)}
                className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full bg-teal-600 text-white hover:bg-teal-700 active:scale-95 transition-all whitespace-nowrap"
              >
                <ChevronRight size={12} /> Mark as {deliveryNextLabel}
              </button>
            )}
          </div>
        </div>

        {/* ── Live Orders (dine-in sessions only) ── */}
        {isDineIn && activeOrders.length > 0 && (
          <section className="mb-5">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Live Orders
            </p>
            <div className="space-y-2">
              {activeOrders.map((o) => {
                const curIdx = STATUS_FLOW.indexOf(o.status as OrderStatus);
                const nextSt = curIdx >= 0 ? STATUS_FLOW[curIdx + 1] as OrderStatus | undefined : undefined;
                const itemPreview = o.items.slice(0, 2).map((i) => i.name).join(', ')
                  + (o.items.length > 2 ? ` +${o.items.length - 2}` : '');
                const oBadge =
                  o.status === 'pending'   ? 'bg-amber-50 text-amber-700 border-amber-200'  :
                  o.status === 'preparing' ? 'bg-blue-50 text-blue-700 border-blue-200'     :
                                             'bg-green-50 text-green-700 border-green-200';
                return (
                  <div key={o.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold text-gray-900 font-mono">#{o.orderNumber ?? 'ORD'}</span>
                        <span className="text-[10px] text-gray-400">{fmtAge(o.createdAt)}</span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{itemPreview}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize whitespace-nowrap ${oBadge}`}>
                        {o.status}
                      </span>
                      {nextSt && onStatusChange && (
                        <button
                          onClick={() => onStatusChange(o.id, nextSt)}
                          className="flex items-center gap-0.5 text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-gray-900 text-white hover:bg-gray-700 active:scale-95 transition-all capitalize whitespace-nowrap"
                        >
                          <ChevronRight size={10} />
                          {nextSt.charAt(0).toUpperCase() + nextSt.slice(1)}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {activeOrders.some((o) => o.status === 'pending' || o.status === 'preparing') && (
              <p className="flex items-center gap-1 text-[11px] text-amber-600 mt-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />
                Orders still being prepared
              </p>
            )}
          </section>
        )}

        {/* ── Bill Items ── */}
        {billItems.length > 0 && (
          <section className="mb-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Bill Items
            </p>
            <div className="space-y-2">
              {billItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-gray-700 leading-snug">
                    <span className="text-xs text-gray-400 font-mono mr-1.5">{item.quantity}×</span>
                    {item.name}
                    {item.size && item.size !== 'regular' && (
                      <span className="text-xs text-gray-400 ml-1">({item.size})</span>
                    )}
                  </span>
                  <span className="text-sm font-semibold text-gray-900 tabular-nums shrink-0">
                    {fmt(item.total)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Totals ── */}
        <div className="border-t border-dashed border-gray-200 pt-3 mb-5 space-y-1.5">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Subtotal</span>
            <span className="tabular-nums">{fmt(subtotal)}</span>
          </div>
          {charges.serviceCharge > 0 && (
            <div className="flex justify-between text-sm text-gray-500">
              <span>{scName}</span>
              <span className="tabular-nums">{fmt(charges.serviceCharge)}</span>
            </div>
          )}
          {charges.tax > 0 && (
            <div className="flex justify-between text-sm text-gray-500">
              <span>{taxName}</span>
              <span className="tabular-nums">{fmt(charges.tax)}</span>
            </div>
          )}
          {deliveryFee > 0 && (
            <div className="flex justify-between text-sm text-gray-500">
              <span>Delivery Fee</span>
              <span className="tabular-nums">{fmt(deliveryFee)}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-2 border-t border-gray-200">
            <span className="text-sm font-bold text-gray-800">Total</span>
            <span className="text-2xl font-black text-gray-900 tabular-nums">{fmt(charges.grandTotal + deliveryFee)}</span>
          </div>
        </div>

        {/* ── Send Bill ── */}
        <section className="mb-4">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Send Bill
          </p>
          <div className="flex gap-2">
            <input
              type="tel"
              value={billPhone}
              onChange={(e) => setBillPhone(e.target.value)}
              placeholder="07X XXX XXXX"
              className="flex-1 min-w-0 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-300 focus:border-transparent transition-colors"
            />
            <button
              onClick={handleSendWhatsApp}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-green-500 text-white text-sm font-semibold rounded-xl hover:bg-green-600 active:scale-95 transition-all whitespace-nowrap"
            >
              <MessageCircle size={15} /> Send
            </button>
          </div>
        </section>

        {/* Customer bill link */}
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 mb-2">
          <Link2 size={13} className="text-gray-400 shrink-0" />
          <a
            href={billLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 min-w-0 text-xs text-blue-600 hover:text-blue-700 underline truncate font-mono"
          >
            {billLink}
          </a>
          <button
            onClick={handleCopyLink}
            className={`shrink-0 flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg transition-colors ${
              linkCopied
                ? 'bg-green-100 text-green-700'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Copy size={11} /> {linkCopied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* ── Sticky action bar ──────────────────────────────────────────────── */}
      <div className="border-t border-gray-100 bg-white px-4 py-3 flex flex-col gap-2.5 shrink-0">
        <div className="flex items-center gap-2.5">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 active:scale-95 transition-all whitespace-nowrap"
          >
            <Printer size={15} /> Print bill
          </button>
          <button
            onClick={handleDownloadPdf}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 active:scale-95 transition-all whitespace-nowrap"
          >
            <Download size={15} /> PDF
          </button>
        </div>
        {isDineIn ? (
          liveSession?.status === 'paid' ? (
            <div className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-semibold">
              <CheckCircle2 size={15} /> Paid
            </div>
          ) : (
            <button
              onClick={() => setShowPay(true)}
              disabled={paying || !canMarkPaid}
              className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition-colors text-sm active:scale-95"
            >
              {paying ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
              {paying ? 'Processing…' : 'Mark as paid'}
            </button>
          )
        ) : (
          orderPaid ? (
            <div className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-semibold">
              <CheckCircle2 size={15} /> Paid
            </div>
          ) : (
            <button
              onClick={() => setShowPayOrder(true)}
              disabled={payingOrder}
              className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition-colors text-sm active:scale-95"
            >
              {payingOrder ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
              {payingOrder ? 'Processing…' : 'Mark as paid'}
            </button>
          )
        )}
      </div>

      {showPay && (
        <PaymentMethodModal
          title="Mark table as paid"
          subtitle={`Table ${order.tableNumber}`}
          total={charges.grandTotal}
          enabledMethods={settings?.enabledPaymentMethods}
          onConfirm={handlePaySession}
          onClose={() => setShowPay(false)}
          loading={paying}
        />
      )}
      {showPayOrder && (
        <PaymentMethodModal
          title="Mark order as paid"
          subtitle={`#${order.orderNumber}`}
          total={charges.grandTotal + deliveryFee}
          enabledMethods={settings?.enabledPaymentMethods}
          onConfirm={handlePayOrder}
          onClose={() => setShowPayOrder(false)}
          loading={payingOrder}
        />
      )}
    </div>
  );
}

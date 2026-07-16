import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Plus, Search, X, ClipboardList, UtensilsCrossed, AlertTriangle, ChevronRight } from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';
import { useOrderSoundAlert } from '../../hooks/useOrderSoundAlert';
import type { Order, OrderStatus } from '../../types';
import { orderService } from '../../services/orderService';
import { waiterService, type Waiter } from '../../services/waiterService';
import { OrderCard } from '../../components/OrderCard';
import { StatusBadge } from '../../components/StatusBadge';
import { BillDetailPanel } from '../../components/BillDetailPanel';
import { AddItemsModal } from '../../components/AddItemsModal';
import { restaurantService, type RestaurantSettings } from '../../services/restaurantService';
import toast from 'react-hot-toast';
import { AdminSidebar } from '../../components/AdminSidebar';
import { AdminHeader } from '../../components/AdminHeader';
import { PullToRefresh } from '../../components/PullToRefresh';
import { EmptyState } from '../../components/EmptyState';


export function OrdersPage() {
  const { t } = useTranslation();

  type TypeTab   = 'all' | 'dine-in' | 'takeaway' | 'room-service' | 'delivery';
  type StatusTab = 'all' | OrderStatus;

  const TYPE_TABS: { label: string; value: TypeTab }[] = [
    { label: 'All',      value: 'all'          },
    { label: 'Dining',   value: 'dine-in'      },
    { label: 'Takeaway', value: 'takeaway'     },
    { label: 'Room',     value: 'room-service' },
    { label: 'Delivery', value: 'delivery'     },
  ];

  const [orders, setOrders] = useState<Order[]>([]);
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [typeTab,   setTypeTab]   = useState<TypeTab>('all');
  const [statusTab, setStatusTab] = useState<StatusTab>('all');

  // Out for Delivery / Delivered only make sense once a delivery order is in view
  const showDeliveryStatuses = typeTab === 'delivery' || typeTab === 'all';
  const STATUS_CHIPS: { label: string; value: StatusTab }[] = [
    { label: 'All',       value: 'all'       },
    { label: 'Pending',   value: 'pending'   },
    { label: 'Preparing', value: 'preparing' },
    { label: 'Ready',     value: 'ready'     },
    ...(showDeliveryStatuses ? [
      { label: 'Out for Delivery', value: 'out-for-delivery' as StatusTab },
      { label: 'Delivered',        value: 'delivered'        as StatusTab },
    ] : []),
    { label: 'Cancelled', value: 'cancelled' },
  ];
  const [loading, setLoading] = useState(true);
  const [addItemsOrder, setAddItemsOrder] = useState<Order | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useOrderSoundAlert(orders);
  const { fmt } = useCurrency();

  const LIVE_STATUS_FLOW: OrderStatus[] = ['pending', 'preparing', 'ready'];
  const DELIVERY_STATUS_FLOW: OrderStatus[] = ['pending', 'preparing', 'ready', 'out-for-delivery', 'delivered'];
  const STATUS_LABEL: Partial<Record<OrderStatus, string>> = { 'out-for-delivery': 'Out for Delivery' };
  const LIVE_STATUS_RANK: Record<string, number> = {
    pending: 0,
    preparing: 1,
    ready: 2,
    'out-for-delivery': 3,
    delivered: 4,
    paid: 5,
    cancelled: 6,
  };

  const fetch = async () => {
    try {
      const data = await orderService.getOrders();
      setOrders(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
    waiterService.getWaiters().then(setWaiters).catch(() => {});
    restaurantService.getMyRestaurant().then(setSettings).catch(() => {});
    const id = setInterval(fetch, 5000);
    return () => clearInterval(id);
  }, []);

  async function handleStatusChange(id: string, status: OrderStatus) {
    try {
      const updated = await orderService.updateStatus(id, status);
      setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
      toast.success(t('orders.statusUpdated', { status }));
    } catch {
      toast.error(t('orders.statusFailed'));
    }
  }

  async function handleAssignWaiter(id: string, waiterId: string | null) {
    try {
      const updated = await orderService.assignWaiter(id, waiterId);
      setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
      const w = waiters.find((x) => x.id === waiterId);
      toast.success(w ? t('orders.assignedTo', { name: w.name }) : t('orders.waiterUnassigned'));
    } catch {
      toast.error(t('orders.assignFailed'));
    }
  }

  async function handleCancel(id: string) {
    try {
      const updated = await orderService.cancelOrder(id);
      setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
      toast.success(t('orders.orderVoided'));
    } catch {
      toast.error(t('orders.cancelFailed'));
    }
  }

  function handleAddItemsDone(updated: Order) {
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    setAddItemsOrder(null);
  }

  function handleSessionPaid(sessionId: string) {
    setOrders((prev) => prev.filter((o) => o.sessionId !== sessionId));
    setSelectedOrderId(null);
  }

  function handleSessionClosed(sessionId: string) {
    setOrders((prev) => prev.filter((o) => o.sessionId !== sessionId));
    setSelectedOrderId(null);
  }

  async function handleRemoveItem(orderId: string, itemId: string) {
    try {
      const updated = await orderService.removeItem(orderId, itemId);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      toast.success('Item removed');
    } catch {
      toast.error('Failed to remove item');
    }
  }

  async function handleUpdateItemQty(orderId: string, itemId: string, quantity: number) {
    try {
      const updated = await orderService.updateItem(orderId, itemId, quantity);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
    } catch {
      toast.error('Failed to update quantity');
    }
  }

  const byType = orders.filter((o) => {
    if (typeTab === 'dine-in')      return o.orderType !== 'takeaway' && o.orderType !== 'room-service' && o.orderType !== 'delivery';
    if (typeTab === 'takeaway')     return o.orderType === 'takeaway';
    if (typeTab === 'room-service') return o.orderType === 'room-service';
    if (typeTab === 'delivery')     return o.orderType === 'delivery';
    return true;
  });

  const filtered = byType.filter((o) =>
    statusTab === 'all' ? o.status !== 'cancelled' : o.status === statusTab,
  );

  const searched = search.trim()
    ? filtered.filter((o) => {
        const q = search.toLowerCase();
        return (
          (o.orderNumber ?? '').toLowerCase().includes(q) ||
          (o.tableNumber != null ? `table ${o.tableNumber}` : '').includes(q) ||
          (o.roomNumber  != null ? `room ${o.roomNumber}`   : '').includes(q) ||
          (o.orderType === 'takeaway' && 'takeaway'.includes(q)) ||
          (o.orderType === 'delivery' && ('delivery'.includes(q) || (o.deliveryAddress ?? '').toLowerCase().includes(q))) ||
          (o.customerName ?? '').toLowerCase().includes(q)
        );
      })
    : filtered;
  const displayed = searched.slice().sort((a, b) => {
    const statusDelta = (LIVE_STATUS_RANK[a.status] ?? 9) - (LIVE_STATUS_RANK[b.status] ?? 9);
    if (statusDelta !== 0) return statusDelta;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
  const typeTabsWithCounts = TYPE_TABS.map((tt) => {
    const count =
      tt.value === 'all'
        ? orders.filter((o) => o.status !== 'cancelled').length
        : tt.value === 'dine-in'
        ? orders.filter((o) => o.orderType !== 'takeaway' && o.orderType !== 'room-service' && o.orderType !== 'delivery' && o.status !== 'cancelled').length
        : tt.value === 'takeaway'
        ? orders.filter((o) => o.orderType === 'takeaway' && o.status !== 'cancelled').length
        : tt.value === 'room-service'
        ? orders.filter((o) => o.orderType === 'room-service' && o.status !== 'cancelled').length
        : orders.filter((o) => o.orderType === 'delivery' && o.status !== 'cancelled').length;
    return { ...tt, count };
  });

  const orderGroups = [
    { key: 'takeaway',     label: 'Takeaway',     dot: 'bg-purple-400', orders: displayed.filter((o) => o.orderType === 'takeaway') },
    { key: 'dine-in',      label: 'Dine In',      dot: 'bg-orange-400', orders: displayed.filter((o) => o.orderType !== 'takeaway' && o.orderType !== 'room-service' && o.orderType !== 'delivery') },
    { key: 'room-service', label: 'Room Service',  dot: 'bg-blue-400',   orders: displayed.filter((o) => o.orderType === 'room-service') },
    { key: 'delivery',     label: 'Delivery',      dot: 'bg-teal-400',   orders: displayed.filter((o) => o.orderType === 'delivery') },
  ].filter((g) => g.orders.length > 0);
  // For single-type tabs, group by status; for 'all' tab, group by order type
  const statusGroups = [
    { key: 'pending',   label: 'Pending',   dot: 'bg-yellow-400', orders: displayed.filter((o) => o.status === 'pending')   },
    { key: 'preparing', label: 'Preparing', dot: 'bg-blue-400',   orders: displayed.filter((o) => o.status === 'preparing') },
    { key: 'ready',     label: 'Ready',     dot: 'bg-green-400',  orders: displayed.filter((o) => o.status === 'ready')     },
  ].filter((g) => g.orders.length > 0);

  const activeGroups = typeTab === 'all' ? orderGroups : statusGroups;
  const showGroups = activeGroups.length > 1;

  const STATUS_ORDER: Record<string, number> = { pending: 0, preparing: 1, ready: 2 };

  function statusStripeCls(status: OrderStatus) {
    return status === 'pending'   ? 'border-l-amber-400'
      : status === 'preparing'    ? 'border-l-blue-400'
      : status === 'ready'        ? 'border-l-green-400'
      : status === 'out-for-delivery' ? 'border-l-teal-400'
      : status === 'delivered'    ? 'border-l-emerald-500'
      : status === 'cancelled'    ? 'border-l-red-400'
      :                              'border-l-green-500';
  }

  function nextOrderStatus(order: Order): OrderStatus | undefined {
    const flow = order.orderType === 'delivery' ? DELIVERY_STATUS_FLOW : LIVE_STATUS_FLOW;
    const idx = flow.indexOf(order.status as OrderStatus);
    return idx >= 0 ? flow[idx + 1] : undefined;
  }

  function nextOrderStatusLabel(order: Order) {
    const next = nextOrderStatus(order);
    return next ? (STATUS_LABEL[next] ?? next) : undefined;
  }

  function orderLocationLabel(order: Order) {
    if (order.orderType === 'takeaway') return 'Takeaway';
    if (order.orderType === 'delivery') return 'Delivery';
    if (order.roomNumber) return `Room ${order.roomNumber}`;
    if (order.tableNumber) return `Table ${order.tableNumber}`;
    return 'Order';
  }

  function queueActionCls(next: OrderStatus) {
    return next === 'ready' ? 'bg-green-600 hover:bg-green-700'
      : next === 'out-for-delivery' || next === 'delivered' ? 'bg-teal-600 hover:bg-teal-700'
      : 'bg-orange-500 hover:bg-orange-600';
  }

  function buildGroupData(grpOrders: Order[]) {
    const total     = grpOrders.reduce((s, o) => s + Number(o.totalAmount), 0);
    const itemCount = grpOrders.reduce((s, o) => s + (o.items?.length ?? 0), 0);
    const STALE_MS  = 30 * 60 * 1000;
    const hasStalled = grpOrders.some(
      (o) => ['pending', 'preparing'].includes(o.status) &&
             Date.now() - new Date(o.createdAt).getTime() > STALE_MS,
    );
    const status: OrderStatus =
      grpOrders.some((o) => o.status === 'pending')   ? 'pending'   :
      grpOrders.some((o) => o.status === 'preparing') ? 'preparing' : 'ready';
    const primaryOrder = grpOrders.find((o) => o.sessionId) ?? grpOrders[0];
    return { total, itemCount, hasStalled, status, primaryOrder };
  }

  // Group dine-in orders by table, sorted by dominant status
  const tableGroups = (() => {
    if (typeTab !== 'dine-in') return [];
    const map = new Map<number, Order[]>();
    displayed
      .filter((o) => o.orderType !== 'takeaway' && o.orderType !== 'room-service')
      .forEach((o) => {
        const k = o.tableNumber ?? 0;
        if (!map.has(k)) map.set(k, []);
        map.get(k)!.push(o);
      });
    return Array.from(map.entries())
      .map(([tableNumber, grpOrders]) => ({ tableNumber, orders: grpOrders, ...buildGroupData(grpOrders) }))
      .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.tableNumber - b.tableNumber);
  })();

  // Group room-service orders by room, sorted by dominant status
  const roomGroups = (() => {
    if (typeTab !== 'room-service') return [];
    const map = new Map<number, Order[]>();
    displayed
      .filter((o) => o.orderType === 'room-service')
      .forEach((o) => {
        const k = o.roomNumber ?? 0;
        if (!map.has(k)) map.set(k, []);
        map.get(k)!.push(o);
      });
    return Array.from(map.entries())
      .map(([roomNumber, grpOrders]) => ({ roomNumber, orders: grpOrders, ...buildGroupData(grpOrders) }))
      .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.roomNumber - b.roomNumber);
  })();

  // Keep selected order valid when filter changes
  useEffect(() => {
    if (selectedOrderId && !filtered.find((o) => o.id === selectedOrderId)) {
      setSelectedOrderId(filtered[0]?.id ?? null);
    } else if (!selectedOrderId && filtered.length > 0) {
      setSelectedOrderId(filtered[0].id);
    }
  }, [typeTab, statusTab, filtered.length]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto md:overflow-hidden mt-14 md:mt-0 flex flex-col">
      <AdminHeader title={t('orders.title')} backTo="/admin">
        <button onClick={fetch} className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors shrink-0" title="Refresh" aria-label="Refresh orders">
          <RefreshCw size={18} />
        </button>
      </AdminHeader>
      <div className="flex flex-1 min-h-0 items-start">
        <aside className="w-[180px] shrink-0 self-stretch border-r border-gray-100 bg-white p-2">
          <nav className="rounded-lg border border-gray-100 bg-white p-2" aria-label="Order types">
            <div className="space-y-2">
              {typeTabsWithCounts.map((tt) => {
                const active = typeTab === tt.value;
                return (
                  <button
                    key={tt.value}
                    type="button"
                    onClick={() => setTypeTab(tt.value)}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                      active
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="truncate">{tt.label}</span>
                    <span className={`shrink-0 text-xs font-bold tabular-nums ${active ? 'text-green-700' : 'text-gray-400'}`}>{tt.count}</span>
                  </button>
                );
              })}
            </div>
          </nav>
          <Link
            to="/admin/new-order"
            role="button"
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
          >
            <Plus size={16} /> New
          </Link>
        </aside>

        <div className="flex-1 min-w-0 md:min-h-0 md:flex md:flex-col">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30">

        {/* Level 2 — order status */}
        <div className="relative">
          <div className="flex gap-1 overflow-x-auto py-2 pl-3 sm:pl-4 lg:pl-6 pr-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {STATUS_CHIPS.map((sc) => {
              const count = sc.value === 'all'
                ? byType.filter((o) => o.status !== 'cancelled').length
                : byType.filter((o) => o.status === sc.value).length;
              const active = statusTab === sc.value;
              const activeCls =
                sc.value === 'all'       ? 'bg-gray-900 border-gray-800 text-white'
                : sc.value === 'pending'   ? 'bg-amber-500 border-amber-500 text-white'
                : sc.value === 'preparing' ? 'bg-blue-600 border-blue-600 text-white'
                : sc.value === 'ready'     ? 'bg-green-600 border-green-600 text-white'
                : sc.value === 'out-for-delivery' ? 'bg-teal-600 border-teal-600 text-white'
                : sc.value === 'delivered' ? 'bg-emerald-600 border-emerald-600 text-white'
                :                           'bg-red-600 border-red-600 text-white';
              const countCls = active
                ? 'text-white/80'
                : 'text-gray-800';
              return (
                <button
                  key={sc.value}
                  onClick={() => setStatusTab(sc.value)}
                  className={`flex items-center justify-center gap-2 min-w-max h-9 px-3 rounded-lg border shrink-0 transition-colors ${
                    active ? activeCls : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-xs font-semibold leading-none whitespace-nowrap">{sc.label}</span>
                  <span className={`text-xs font-bold leading-none tabular-nums ${countCls}`}>{count}</span>
                </button>
              );
            })}
          </div>
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-r from-transparent to-white" />
        </div>

        {/* Search */}
        <div className="px-3 sm:px-4 lg:px-6 py-2.5">
          <label htmlFor="orders-search" className="mb-1 block text-xs font-semibold text-gray-500">
            Search orders
          </label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              id="orders-search"
              type="text"
              placeholder="Search by order no., table, customer…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-orange-300 transition-colors"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" aria-label="Clear order search">
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile layout */}
      <PullToRefresh onRefresh={fetch}>
      <div className="md:hidden px-3 sm:px-4 py-4">
        {loading ? (
          <div className="flex justify-center pt-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
          </div>
        ) : typeTab === 'dine-in' ? (
          /* ── Dining: 2-col table grid ── */
          tableGroups.length === 0
            ? <div className="pt-8"><EmptyState compact icon={UtensilsCrossed} title="No active tables" /></div>
            : <>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {tableGroups.map((tg) => (
                    <button
                      key={tg.tableNumber}
                      onClick={() => setSelectedOrderId(tg.primaryOrder?.id ?? null)}
                      className={`text-left p-4 rounded-2xl border-2 transition-all ${
                        selectedOrderId && tg.orders.some((o) => o.id === selectedOrderId)
                          ? 'border-orange-400 bg-orange-50 shadow-md'
                          : 'border-gray-200 bg-white hover:border-orange-200 hover:shadow'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Table</p>
                          <p className="text-3xl font-black text-gray-900 leading-none">{tg.tableNumber}</p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mb-2">
                        {tg.orders.length} order{tg.orders.length !== 1 ? 's' : ''} · {tg.itemCount} item{tg.itemCount !== 1 ? 's' : ''}
                      </p>
                      <p className="text-base font-bold text-gray-900">{fmt(tg.total)}</p>
                      {tg.hasStalled && (
                        <p className="flex items-center gap-1 text-[10px] text-red-500 mt-1">
                          <AlertTriangle size={10} /> Stalled
                        </p>
                      )}
                    </button>
                  ))}
                </div>
                {selectedOrderId && (() => {
                  const order = displayed.find((o) => o.id === selectedOrderId);
                  return order ? (
                    <div className="mt-2">
                      <OrderCard
                        order={order}
                        onStatusChange={handleStatusChange}
                        onAssignWaiter={handleAssignWaiter}
                        onAddItems={setAddItemsOrder}
                        onCancel={handleCancel}
                        onRemoveItem={handleRemoveItem}
                        onUpdateItemQty={handleUpdateItemQty}
                        waiters={waiters}
                        showActions showBill settings={settings} onPaid={handleSessionPaid} onSessionClosed={handleSessionClosed}
                      />
                    </div>
                  ) : null;
                })()}
              </>
        ) : typeTab === 'room-service' ? (
          /* ── Room service: 2-col room grid ── */
          roomGroups.length === 0
            ? <div className="pt-8"><EmptyState compact icon={ClipboardList} title="No active rooms" /></div>
            : <>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {roomGroups.map((rg) => (
                    <button
                      key={rg.roomNumber}
                      onClick={() => setSelectedOrderId(rg.primaryOrder?.id ?? null)}
                      className={`text-left p-4 rounded-2xl border-2 transition-all ${
                        selectedOrderId && rg.orders.some((o) => o.id === selectedOrderId)
                          ? 'border-blue-400 bg-blue-50 shadow-md'
                          : 'border-gray-200 bg-white hover:border-blue-200 hover:shadow'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Room</p>
                          <p className="text-3xl font-black text-gray-900 leading-none">{rg.roomNumber}</p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mb-2">
                        {rg.orders.length} order{rg.orders.length !== 1 ? 's' : ''} · {rg.itemCount} item{rg.itemCount !== 1 ? 's' : ''}
                      </p>
                      <p className="text-base font-bold text-gray-900">{fmt(rg.total)}</p>
                      {rg.hasStalled && (
                        <p className="flex items-center gap-1 text-[10px] text-red-500 mt-1">
                          <AlertTriangle size={10} /> Stalled
                        </p>
                      )}
                    </button>
                  ))}
                </div>
                {selectedOrderId && (() => {
                  const order = displayed.find((o) => o.id === selectedOrderId);
                  return order ? (
                    <div className="mt-2">
                      <OrderCard
                        order={order}
                        onStatusChange={handleStatusChange}
                        onAssignWaiter={handleAssignWaiter}
                        onAddItems={setAddItemsOrder}
                        onCancel={handleCancel}
                        onRemoveItem={handleRemoveItem}
                        onUpdateItemQty={handleUpdateItemQty}
                        waiters={waiters}
                        showActions showBill settings={settings} onPaid={handleSessionPaid} onSessionClosed={handleSessionClosed}
                      />
                    </div>
                  ) : null;
                })()}
              </>
        ) : displayed.length === 0 ? (
          <div className="pt-8"><EmptyState compact icon={ClipboardList} title={t('orders.noOrders')} /></div>
        ) : showGroups ? (
          <div className="space-y-5">
            {activeGroups.map((g) => (
              <div key={g.key}>
                <div className="flex items-center gap-2 px-1 mb-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${g.dot}`} />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{g.label}</span>
                  <span className="text-xs text-gray-400">({g.orders.length})</span>
                </div>
                <div className="columns-1 sm:columns-2 gap-3">
                  {g.orders.map((order) => (
                    <div key={order.id} className="break-inside-avoid mb-3">
                      <OrderCard
                        order={order}
                        onStatusChange={handleStatusChange}
                        onAssignWaiter={handleAssignWaiter}
                        onAddItems={setAddItemsOrder}
                        onCancel={handleCancel}
                        onRemoveItem={handleRemoveItem}
                        onUpdateItemQty={handleUpdateItemQty}
                        waiters={waiters}
                        showActions
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 gap-3">
            {displayed.map((order) => (
              <div key={order.id} className="break-inside-avoid mb-3">
                <OrderCard
                  order={order}
                  onStatusChange={handleStatusChange}
                  onAssignWaiter={handleAssignWaiter}
                  onAddItems={setAddItemsOrder}
                  onCancel={handleCancel}
                  onRemoveItem={handleRemoveItem}
                  onUpdateItemQty={handleUpdateItemQty}
                  waiters={waiters}
                  showActions
                />
              </div>
            ))}
          </div>
        )}
      </div>
      </PullToRefresh>

      {/* Tablet+ layout */}
      <div className="hidden md:flex flex-1 min-h-0">

        {typeTab === 'dine-in' || typeTab === 'room-service' ? (
          /* ── Dining / Room service: 4-col grid + right detail panel ── */
          <>
            <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-4">
              {loading ? (
                <div className="flex justify-center pt-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
                </div>
              ) : typeTab === 'dine-in' && tableGroups.length === 0 ? (
                <div className="pt-8"><EmptyState compact icon={UtensilsCrossed} title="No active tables" /></div>
              ) : typeTab === 'room-service' && roomGroups.length === 0 ? (
                <div className="pt-8"><EmptyState compact icon={ClipboardList} title="No active rooms" /></div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {(typeTab === 'dine-in' ? tableGroups : roomGroups).map((g) => {
                    const num = typeTab === 'dine-in'
                      ? ('tableNumber' in g ? g.tableNumber : 0)
                      : ('roomNumber'   in g ? g.roomNumber  : 0);
                    const isSelected = selectedOrderId != null && g.orders.some((o) => o.id === selectedOrderId);
                    const isDining = typeTab === 'dine-in';
                    return (
                      <button
                        key={num}
                        onClick={() => setSelectedOrderId(g.primaryOrder?.id ?? null)}
                        className={`text-left p-4 rounded-2xl border-2 transition-all ${
                          isSelected && isDining  ? 'border-orange-400 bg-orange-50 shadow-md' :
                          isSelected && !isDining ? 'border-blue-400 bg-blue-50 shadow-md' :
                          isDining                ? 'border-gray-200 bg-white hover:border-orange-200 hover:shadow' :
                                                    'border-gray-200 bg-white hover:border-blue-200 hover:shadow'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                              {isDining ? 'Table' : 'Room'}
                            </p>
                            <p className="text-4xl font-black text-gray-900 leading-none">{num}</p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 mb-1">
                          {g.orders.length} order{g.orders.length !== 1 ? 's' : ''} · {g.itemCount} item{g.itemCount !== 1 ? 's' : ''}
                        </p>
                        <p className="text-lg font-bold text-gray-900">{fmt(g.total)}</p>
                        {g.hasStalled && (
                          <p className="flex items-center gap-1 text-xs text-red-500 mt-2">
                            <AlertTriangle size={12} /> Stalled
                          </p>
                        )}
                        <div className={`flex items-center justify-end mt-2 ${isDining ? 'text-orange-400' : 'text-blue-400'}`}>
                          <ChevronRight size={14} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Detail panel */}
            <div className="w-[400px] lg:w-[460px] shrink-0 flex flex-col overflow-hidden border-l border-gray-200 bg-white">
              {selectedOrderId ? (
                (() => {
                  const order = displayed.find((o) => o.id === selectedOrderId);
                  if (!order) return <p className="text-gray-300 text-sm px-4 py-4">Order not found</p>;
                  return (
                    <BillDetailPanel
                      order={order}
                      onStatusChange={handleStatusChange}
                      settings={settings}
                      onPaid={handleSessionPaid}
                      onSessionClosed={handleSessionClosed}
                    />
                  );
                })()
              ) : (
                <div className="flex items-center justify-center h-full text-gray-300 text-sm">
                  {(typeTab === 'dine-in' ? tableGroups : roomGroups).length > 0
                    ? `Select a ${typeTab === 'dine-in' ? 'table' : 'room'} to view details`
                    : ''}
                </div>
              )}
            </div>
          </>
        ) : (
          /* ── All / Takeaway: narrow list + detail ── */
          <>
            <div className="w-72 lg:w-80 shrink-0 overflow-y-auto border-r border-gray-200 bg-white">
              <div className="px-3 py-3">
                {loading ? (
                  <div className="flex justify-center pt-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
                  </div>
                ) : displayed.length === 0 ? (
                  <div className="pt-8"><EmptyState compact icon={ClipboardList} title={t('orders.noOrders')} /></div>
                ) : showGroups ? (
                  <div className="space-y-4">
                    {activeGroups.map((g) => (
                      <div key={g.key}>
                        <div className="flex items-center gap-1.5 px-1 mb-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${g.dot}`} />
                          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{g.label}</span>
                          <span className="text-xs text-gray-300">({g.orders.length})</span>
                        </div>
                        <div className="space-y-2">
                          {g.orders.map((order) => {
                            const next = nextOrderStatus(order);
                            const nextLabel = nextOrderStatusLabel(order);
                            return (
                              <div
                                key={order.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => setSelectedOrderId(order.id)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') setSelectedOrderId(order.id);
                                }}
                                className={`w-full text-left px-3.5 py-3 rounded-lg border-l-4 border cursor-pointer transition-colors ${statusStripeCls(order.status)} ${
                                  selectedOrderId === order.id
                                    ? 'bg-orange-50 border-y-orange-200 border-r-orange-200 ring-1 ring-orange-200'
                                    : 'bg-white border-y-gray-100 border-r-gray-100 hover:bg-gray-50'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <span className="block text-sm font-semibold text-gray-900 truncate">
                                      {order.orderNumber ?? 'Order'}
                                    </span>
                                    <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                                      <span>{orderLocationLabel(order)}</span>
                                      {order.customerName && <span className="truncate">{order.customerName}</span>}
                                    </div>
                                  </div>
                                  <StatusBadge status={order.status} />
                                </div>
                                <div className="mt-2 flex items-center justify-between gap-2">
                                  <span className="text-xs text-gray-500">
                                    {order.items.length} item{order.items.length !== 1 ? 's' : ''} · <span className="font-semibold text-gray-800">{fmt(order.totalAmount)}</span>
                                  </span>
                                  {next && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStatusChange(order.id, next);
                                      }}
                                      className={`shrink-0 px-2.5 py-1.5 rounded-md text-[11px] font-bold text-white transition-colors capitalize ${queueActionCls(next)}`}
                                    >
                                      {nextLabel}
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {displayed.map((order) => {
                      const next = nextOrderStatus(order);
                      const nextLabel = nextOrderStatusLabel(order);
                      return (
                        <div
                          key={order.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedOrderId(order.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') setSelectedOrderId(order.id);
                          }}
                          className={`w-full text-left px-3.5 py-3 rounded-lg border-l-4 border cursor-pointer transition-colors ${statusStripeCls(order.status)} ${
                            selectedOrderId === order.id
                              ? 'bg-orange-50 border-y-orange-200 border-r-orange-200 ring-1 ring-orange-200'
                              : 'bg-white border-y-gray-100 border-r-gray-100 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <span className="block text-sm font-semibold text-gray-900 truncate">
                                {order.orderNumber ?? 'Order'}
                              </span>
                              <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                                <span>{orderLocationLabel(order)}</span>
                                {order.customerName && <span className="truncate">{order.customerName}</span>}
                              </div>
                            </div>
                            <StatusBadge status={order.status} />
                          </div>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <span className="text-xs text-gray-500">
                              {order.items.length} item{order.items.length !== 1 ? 's' : ''} · <span className="font-semibold text-gray-800">{fmt(order.totalAmount)}</span>
                            </span>
                            {next && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(order.id, next);
                                }}
                                className={`shrink-0 px-2.5 py-1.5 rounded-md text-[11px] font-bold text-white transition-colors capitalize ${queueActionCls(next)}`}
                              >
                                {nextLabel}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden bg-white">
              {selectedOrderId ? (
                (() => {
                  const order = displayed.find((o) => o.id === selectedOrderId);
                  if (!order) return <p className="text-gray-300 text-sm px-4 py-4">Order not found</p>;
                  return (
                    <BillDetailPanel
                      order={order}
                      onStatusChange={handleStatusChange}
                      settings={settings}
                      onPaid={handleSessionPaid}
                      onSessionClosed={handleSessionClosed}
                    />
                  );
                })()
              ) : (
                <div className="flex items-center justify-center h-full text-gray-300 text-sm">
                  {displayed.length > 0 ? 'Select an order to view details' : ''}
                </div>
              )}
            </div>
          </>
        )}
      </div>
      {addItemsOrder && (
        <AddItemsModal
          order={addItemsOrder}
          onClose={() => setAddItemsOrder(null)}
          onDone={handleAddItemsDone}
        />
      )}
        </div>
      </div>
      </main>
    </div>
  );
}
